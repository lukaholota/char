import type { PrismaClient, Ruleset, Subclasses } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CORRECTIONS_PATH = "data/2024/corrections/radiant-terminology.json";

export type RadiantCorrection = {
  entity: "spell" | "magicItem" | "feature" | "subclass" | "infusion";
  key: string;
  ruleset?: Ruleset;
  field: "description" | "shortDescription" | "name";
  replace: [string, string][];
};

export function readRadiantCorrections(): RadiantCorrection[] {
  const parsed: unknown = JSON.parse(
    readFileSync(join(process.cwd(), CORRECTIONS_PATH), "utf-8")
  );
  if (parsed === null || typeof parsed !== "object" || !("corrections" in parsed)) {
    throw new Error(`${CORRECTIONS_PATH}: очікували обʼєкт із ключем corrections`);
  }
  const corrections = (parsed as { corrections: unknown }).corrections;
  if (!Array.isArray(corrections)) {
    throw new Error(`${CORRECTIONS_PATH}: corrections має бути масивом`);
  }
  return corrections as RadiantCorrection[];
}

/// Ідемпотентна: якщо стара форма вже замінена, речення лишається як є. Якщо немає ні
/// старої, ні нової — падає, бо це означає, що запис у базі розійшовся з тим, який читали.
export function applyRadiantReplacements(
  label: string,
  text: string,
  replacements: [string, string][]
): string {
  return replacements.reduce((current, [from, to]) => {
    if (current.includes(from)) return current.split(from).join(to);
    if (current.includes(to)) return current;
    throw new Error(`${label}: немає ні «${from}», ні «${to}»`);
  }, text);
}

export async function seedRadiantTerminology(prisma: PrismaClient): Promise<string[]> {
  const applied: string[] = [];
  for (const correction of readRadiantCorrections()) {
    const label = `${correction.entity} «${correction.key}» · ${correction.field}`;
    const rows = await findRows(prisma, correction);
    if (rows.length === 0) throw new Error(`${label}: запису немає в базі`);

    for (const row of rows) {
      const before = row.text;
      const after = applyRadiantReplacements(label, before, correction.replace);
      if (after !== before) await writeRow(prisma, correction, row.id, after);
    }
    applied.push(label);
  }
  return applied;
}

type TargetRow = { id: number; text: string };

/// До 2026-09-04 гілка фічі читала й писала `description` для будь-якого поля, крім `name`,
/// тож корекція з `field: "shortDescription"` мовчки правила не ту колонку — саме тому пʼять
/// підкласових рис пережили зачистку KR17.5 у `feature.short_description`.
function readFeatureField(
  feature: { description: string; shortDescription: string | null; name: string },
  field: RadiantCorrection["field"]
): string {
  if (field === "name") return feature.name;
  if (field === "shortDescription") return feature.shortDescription ?? "";
  return feature.description;
}

async function findRows(
  prisma: PrismaClient,
  correction: RadiantCorrection
): Promise<TargetRow[]> {
  const { entity, key, field } = correction;

  if (entity === "spell") {
    if (!correction.ruleset) throw new Error(`spell «${key}»: без ruleset ключ неоднозначний`);
    const spell = await prisma.spell.findUnique({
      where: { engName_ruleset: { engName: key, ruleset: correction.ruleset } },
      select: { spellId: true, description: true },
    });
    return spell ? [{ id: spell.spellId, text: spell.description }] : [];
  }

  if (entity === "magicItem") {
    // Після KR12.5 назва предмета сама по собі неоднозначна — усі 445 предметів 2024 носять
    // назви 2014. Зачистка `radiant` — робота 2014 (KR17.5), тому редакція за замовчуванням
    // саме така; явну з корекції поважаємо.
    const ruleset = correction.ruleset ?? "RULES_2014";
    const item = await prisma.magicItem.findUnique({
      where: { engName_ruleset: { engName: key, ruleset } },
      select: { magicItemId: true, description: true, shortDescription: true },
    });
    if (!item) return [];
    const text = field === "shortDescription" ? item.shortDescription : item.description;
    return text === null ? [] : [{ id: item.magicItemId, text }];
  }

  if (entity === "feature") {
    const feature = await prisma.feature.findUnique({
      where: { engName: key },
      select: { featureId: true, description: true, shortDescription: true, name: true },
    });
    if (!feature) return [];
    return [{ id: feature.featureId, text: readFeatureField(feature, field) }];
  }

  if (entity === "infusion") {
    const infusion = await prisma.infusion.findUnique({
      where: { engName: key },
      select: { infusionId: true, name: true },
    });
    return infusion ? [{ id: infusion.infusionId, text: infusion.name }] : [];
  }

  const subclasses = await prisma.subclass.findMany({
    where: { name: key as Subclasses, ...(correction.ruleset ? { ruleset: correction.ruleset } : {}) },
    select: { subclassId: true, description: true },
  });
  return subclasses
    .filter((subclass) => subclass.description !== null)
    .map((subclass) => ({ id: subclass.subclassId, text: subclass.description ?? "" }));
}

async function writeRow(
  prisma: PrismaClient,
  correction: RadiantCorrection,
  id: number,
  text: string
): Promise<void> {
  const { entity, field } = correction;

  if (entity === "spell") {
    await prisma.spell.update({ where: { spellId: id }, data: { description: text } });
    return;
  }
  if (entity === "magicItem") {
    await prisma.magicItem.update({
      where: { magicItemId: id },
      data: field === "shortDescription" ? { shortDescription: text } : { description: text },
    });
    return;
  }
  if (entity === "feature") {
    await prisma.feature.update({ where: { featureId: id }, data: { [field]: text } });
    return;
  }
  if (entity === "infusion") {
    await prisma.infusion.update({ where: { infusionId: id }, data: { name: text } });
    return;
  }
  await prisma.subclass.update({ where: { subclassId: id }, data: { description: text } });
}

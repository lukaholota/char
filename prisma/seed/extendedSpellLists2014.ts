/**
 * KR16.2 — розширені списки заклинань 2014 (`classVariant` у 5etools).
 *
 * Рішення власника 2026-08-23 (питання 3): такі класи беремо дефолтно, але показуємо книгу,
 * що їх дає. Книга живе в `spell_classes.source`; NULL там означає базовий перелік.
 *
 * Вхід — data/2014/extended-spell-lists.json, згенерований
 * scripts/5etools/build-extended-spell-lists.ts із пінованої ревізії дзеркала.
 */

import { PrismaClient, Source } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RULESET = "RULES_2014" as const;

const BINDINGS_PATH = "data/2014/extended-spell-lists.json";

export type ExtendedListBinding = {
  engName: string;
  className: string;
  classEng: string;
  source: string;
  definedIn: string;
};

export type ExtendedListsOutcome = {
  rowsCreated: number;
  rowsAttributed: number;
  rowsAlreadyRight: number;
};

export type ExistingClassRow = {
  classId: number;
  className: string;
  source: string | null;
};

export type BindingPlan = {
  create: string[];
  attribute: number[];
  alreadyRight: number;
};

export async function seedExtendedSpellLists2014(
  prisma: PrismaClient
): Promise<ExtendedListsOutcome> {
  const outcome: ExtendedListsOutcome = { rowsCreated: 0, rowsAttributed: 0, rowsAlreadyRight: 0 };

  for (const [engName, bindings] of groupBindingsBySpell(readExtendedListBindings())) {
    const spellId = await findSpellId2014(prisma, engName);
    const existing = await prisma.spellClasses.findMany({
      where: { spellId, ruleset: RULESET },
      select: { classId: true, className: true, source: true },
    });

    const plan = planBindings(bindings, existing);

    if (plan.create.length > 0) {
      await prisma.spellClasses.createMany({
        data: plan.create.map((className) => ({
          spellId,
          className,
          ruleset: RULESET,
          source: readSourceCode(bindings, className),
        })),
      });
    }

    for (const classId of plan.attribute) {
      const row = existing.find((candidate) => candidate.classId === classId);
      await prisma.spellClasses.update({
        where: { classId },
        data: { source: readSourceCode(bindings, row?.className ?? "") },
      });
    }

    outcome.rowsCreated += plan.create.length;
    outcome.rowsAttributed += plan.attribute.length;
    outcome.rowsAlreadyRight += plan.alreadyRight;
  }

  return outcome;
}

export function readExtendedListBindings(): ExtendedListBinding[] {
  const parsed: unknown = JSON.parse(readFileSync(join(process.cwd(), BINDINGS_PATH), "utf-8"));

  if (parsed === null || typeof parsed !== "object" || !("bindings" in parsed)) {
    throw new Error(`${BINDINGS_PATH}: очікували об'єкт із ключем bindings`);
  }

  const bindings = (parsed as { bindings: unknown }).bindings;
  if (!Array.isArray(bindings)) throw new Error(`${BINDINGS_PATH}: bindings має бути масивом`);

  return bindings as ExtendedListBinding[];
}

export function groupBindingsBySpell(
  bindings: ExtendedListBinding[]
): Map<string, ExtendedListBinding[]> {
  const grouped = new Map<string, ExtendedListBinding[]>();

  for (const binding of bindings) {
    const known = grouped.get(binding.engName);
    if (known) known.push(binding);
    else grouped.set(binding.engName, [binding]);
  }

  return grouped;
}

/// Три стани рядка, і кожен має бути видимим у підсумку: його немає (створити), він є без
/// книги або з чужою (проставити), він уже правильний (нічого). Мовчазний «нічого не сталося»
/// приховав би і те, що сід не доїхав, і те, що дані розійшлися.
export function planBindings(
  bindings: ExtendedListBinding[],
  existing: ExistingClassRow[]
): BindingPlan {
  const plan: BindingPlan = { create: [], attribute: [], alreadyRight: 0 };

  for (const binding of bindings) {
    const row = existing.find((candidate) => candidate.className === binding.className);

    if (!row) plan.create.push(binding.className);
    else if (row.source !== binding.source) plan.attribute.push(row.classId);
    else plan.alreadyRight += 1;
  }

  return plan;
}

function readSourceCode(bindings: ExtendedListBinding[], className: string): Source {
  const binding = bindings.find((candidate) => candidate.className === className);
  if (!binding) throw new Error(`Немає привʼязки для класу «${className}»`);

  return binding.source as Source;
}

async function findSpellId2014(prisma: PrismaClient, engName: string): Promise<number> {
  const spell = await prisma.spell.findUnique({
    where: { engName_ruleset: { engName, ruleset: RULESET } },
    select: { spellId: true },
  });

  if (!spell) throw new Error(`Заклинання «${engName}» немає в каталозі ${RULESET}`);
  return spell.spellId;
}

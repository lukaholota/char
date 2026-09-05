import type { PrismaClient, Subclasses } from "@prisma/client";
import { readInfusionFeatureSeedInputs } from "./infusionFeaturesSeed";
import { readSubclassFeatureSeedInputs } from "./subclassFeatureSeed";
import { readSubclassSeedInputs } from "./subclassSeed";

/// Повні сідери апсертять сотні рядків і переписують привʼязки, а ще тримають ASCII-апостроф
/// там, де база вже має канонічний ʼ — широкий прохід відкотив би зачистку апострофа на
/// 26 фічах. Тому текст їде за білим списком: рівно ті записи 2014, чий текст правила зачистка
/// `radiant` (KR17.5, 2026-09-04). Записи 2024 везуть власні сіди з `data/2024/normalized/`.
const SWEPT_FEATURES_2014 = [
  "Channel Divinity: Radiance of the Dawn",
  "Corona of Light",
  "Divine Strike (Twilight)",
  "Holy Nimbus",
  "Infusion: Resistant Armor",
  "Lunar Empowerment",
  "Radiant Soul (Celestial)",
  "Radiant Sun Bolt",
  "Searing Sunburst",
  "Searing Vengeance",
  "Spirit Projection",
  "Strength of the Grave",
  "Sun Shield",
  "Umbral Form",
] as const;

const SWEPT_SUBCLASSES_2014: Subclasses[] = ["PATH_OF_THE_ZEALOT", "WAY_OF_THE_SUN_SOUL"];

const FEATURE_FIELDS = ["name", "shortDescription", "description"] as const;

export type SweptTextChange = {
  entity: "feature" | "subclass";
  key: string;
  field: string;
};

export async function findSweptTextDrift(prisma: PrismaClient): Promise<SweptTextChange[]> {
  return [...(await findFeatureDrift(prisma)), ...(await findSubclassDrift(prisma))];
}

export async function syncSweptTextFromSeed(prisma: PrismaClient): Promise<SweptTextChange[]> {
  const drift = await findSweptTextDrift(prisma);
  const features = new Map(readSweptFeatures().map((seeded) => [seeded.engName, seeded]));
  const subclasses = new Map(readSweptSubclasses().map((seeded) => [seeded.name, seeded]));

  for (const change of drift) {
    if (change.entity === "feature") {
      const seeded = features.get(change.key);
      if (seeded) {
        await prisma.feature.update({
          where: { engName: change.key },
          data: { [change.field]: seeded[change.field as (typeof FEATURE_FIELDS)[number]] },
        });
      }
      continue;
    }

    const seeded = subclasses.get(change.key as Subclasses);
    if (seeded) {
      await prisma.subclass.updateMany({
        where: { name: change.key as Subclasses },
        data: { description: seeded.description },
      });
    }
  }

  return drift;
}

async function findFeatureDrift(prisma: PrismaClient): Promise<SweptTextChange[]> {
  const drift: SweptTextChange[] = [];

  for (const seeded of readSweptFeatures()) {
    const stored = await prisma.feature.findUnique({
      where: { engName: seeded.engName },
      select: { name: true, shortDescription: true, description: true },
    });
    if (!stored) continue;

    for (const field of FEATURE_FIELDS) {
      if ((stored[field] ?? "") === seeded[field]) continue;
      drift.push({ entity: "feature", key: seeded.engName, field });
    }
  }

  return drift;
}

async function findSubclassDrift(prisma: PrismaClient): Promise<SweptTextChange[]> {
  const drift: SweptTextChange[] = [];

  for (const seeded of readSweptSubclasses()) {
    const stored = await prisma.subclass.findMany({
      where: { name: seeded.name },
      select: { description: true },
    });
    if (stored.some((row) => (row.description ?? "") !== seeded.description)) {
      drift.push({ entity: "subclass", key: seeded.name, field: "description" });
    }
  }

  return drift;
}

function readSweptFeatures(): { engName: string; name: string; shortDescription: string; description: string }[] {
  const swept = new Set<string>(SWEPT_FEATURES_2014);
  const found = [...readSubclassFeatureSeedInputs(), ...readInfusionFeatureSeedInputs()]
    .filter((input) => swept.has(input.engName))
    .map((input) => ({
      engName: input.engName,
      name: input.name,
      shortDescription: String(input.shortDescription ?? ""),
      description: String(input.description ?? ""),
    }));

  if (found.length !== SWEPT_FEATURES_2014.length) {
    const missing = SWEPT_FEATURES_2014.filter((key) => !found.some((input) => input.engName === key));
    throw new Error(`У сідах немає фіч: ${missing.join(", ")}`);
  }

  return found;
}

function readSweptSubclasses(): { name: Subclasses; description: string }[] {
  const swept = new Set<string>(SWEPT_SUBCLASSES_2014);
  const found = readSubclassSeedInputs()
    .filter((input) => swept.has(input.name))
    .map((input) => ({ name: input.name, description: String(input.description ?? "") }));

  if (found.length !== SWEPT_SUBCLASSES_2014.length) {
    const missing = SWEPT_SUBCLASSES_2014.filter((key) => !found.some((input) => input.name === key));
    throw new Error(`У сіді немає підкласів: ${missing.join(", ")}`);
  }

  return found;
}

import { PrismaClient } from "@prisma/client";
import { readClassFeatureSeedInputs } from "./classFeatureSeed";

/// Повний `seedClassFeatures` проходить понад дві сотні фіч і перезаписує кожну; правка тексту
/// однієї риси не має чіпати решту. Тому текст їде окремо — тим самим шляхом, що й
/// `featText2014.ts`: спершу показати розбіжність, потім записати.
export const CLASS_FEATURE_TEXT_NAMES_2014 = [
  "Wild Shape",
  /// O35: «очки чародійства» замість «очок метамагії» і метамагія дослівно за PHB/TCoE.
  "Font of Magic",
  "Sorcerous Restoration",
  "Magical Guidance",
  "Careful Spell",
  "Distant Spell",
  "Empowered Spell",
  "Extended Spell",
  "Heightened Spell",
  "Quickened Spell",
  "Subtle Spell",
  "Twinned Spell",
  "Seeking Spell",
  "Transmuted Spell",
] as const;

const SYNCED_FIELDS = ["description", "shortDescription", "usesPoolKey", "usePrice"] as const;

type SyncedField = (typeof SYNCED_FIELDS)[number];

type ClassFeatureText = {
  engName: string;
  description: string;
  shortDescription: string | null;
  usesPoolKey: string | null;
  usePrice: number;
};

export type ClassFeatureTextChange = {
  engName: string;
  field: SyncedField;
};

export async function findClassFeatureTextDrift(
  prisma: PrismaClient
): Promise<ClassFeatureTextChange[]> {
  const drift: ClassFeatureTextChange[] = [];

  for (const text of readClassFeatureTexts()) {
    const stored = await prisma.feature.findUnique({
      where: { engName: text.engName },
      select: { description: true, shortDescription: true, usesPoolKey: true, usePrice: true },
    });
    if (!stored) continue;

    for (const field of SYNCED_FIELDS) {
      if (stored[field] !== text[field]) drift.push({ engName: text.engName, field });
    }
  }

  return drift;
}

export async function syncClassFeatureTextFromSeed(
  prisma: PrismaClient
): Promise<ClassFeatureTextChange[]> {
  const drift = await findClassFeatureTextDrift(prisma);
  const bySeedName = new Map(readClassFeatureTexts().map((text) => [text.engName, text]));

  for (const change of drift) {
    const text = bySeedName.get(change.engName);
    if (!text) continue;

    await prisma.feature.update({
      where: { engName: text.engName },
      data: { [change.field]: text[change.field] },
    });
  }

  return drift;
}

export function readClassFeatureTexts(): ClassFeatureText[] {
  const wanted = new Set<string>(CLASS_FEATURE_TEXT_NAMES_2014);
  const found = readClassFeatureSeedInputs()
    .filter((input) => wanted.has(input.engName))
    .map((input) => ({
      engName: input.engName,
      description: String(input.description ?? ""),
      shortDescription: input.shortDescription ?? null,
      usesPoolKey: input.usesPoolKey ?? null,
      usePrice: input.usePrice ?? 1,
    }));

  if (found.length !== CLASS_FEATURE_TEXT_NAMES_2014.length) {
    const missing = CLASS_FEATURE_TEXT_NAMES_2014.filter((name) => !found.some((text) => text.engName === name));
    throw new Error(`У сіді класових фіч немає: ${missing.join(", ")}`);
  }

  return found;
}

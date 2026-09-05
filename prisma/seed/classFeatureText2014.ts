import { PrismaClient } from "@prisma/client";
import { WILD_SHAPE_DESCRIPTION_2014 } from "./classFeatureSeed";

/// Повний `seedClassFeatures` проходить понад дві сотні фіч і перезаписує кожну; правка тексту
/// однієї риси не має чіпати решту. Тому текст їде окремо — тим самим шляхом, що й
/// `featText2014.ts`: спершу показати розбіжність, потім записати.
export type ClassFeatureText = {
  engName: string;
  description: string;
};

export const CLASS_FEATURE_TEXTS_2014: ClassFeatureText[] = [
  { engName: "Wild Shape", description: WILD_SHAPE_DESCRIPTION_2014 },
];

export type ClassFeatureTextChange = {
  engName: string;
  storedDescription: string;
};

export async function findClassFeatureTextDrift(
  prisma: PrismaClient
): Promise<ClassFeatureTextChange[]> {
  const drift: ClassFeatureTextChange[] = [];

  for (const text of CLASS_FEATURE_TEXTS_2014) {
    const stored = await prisma.feature.findUnique({
      where: { engName: text.engName },
      select: { description: true },
    });
    if (!stored || stored.description === text.description) continue;

    drift.push({ engName: text.engName, storedDescription: stored.description });
  }

  return drift;
}

export async function syncClassFeatureTextFromSeed(
  prisma: PrismaClient
): Promise<ClassFeatureTextChange[]> {
  const drift = await findClassFeatureTextDrift(prisma);
  const bySeedName = new Map(CLASS_FEATURE_TEXTS_2014.map((text) => [text.engName, text]));

  for (const feature of drift) {
    const text = bySeedName.get(feature.engName);
    if (!text) continue;

    await prisma.feature.update({
      where: { engName: text.engName },
      data: { description: text.description },
    });
  }

  return drift;
}

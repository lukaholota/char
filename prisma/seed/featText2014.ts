import { PrismaClient } from "@prisma/client";
import { readFeatSeedInputs } from "./featSeed";

const RULESET = "RULES_2014" as const;

export type FeatTextChange = {
  name: string;
  changedFields: string[];
};

/// Повний `seedFeats` перестворює звʼязки `grantsFeature` (`deleteMany` + `create`), а звід
/// ратифікованого терміна міняє тільки текст. Тому текст їде окремо: прогін у робочій базі
/// торкається двох колонок, а звʼязки персонажів із рисами лишаються на місці.
export async function findFeatTextDrift(prisma: PrismaClient): Promise<FeatTextChange[]> {
  const drift: FeatTextChange[] = [];

  for (const input of readFeatSeedInputs()) {
    const stored = await prisma.feat.findUnique({
      where: { name_ruleset: { name: input.name, ruleset: RULESET } },
      select: { description: true, shortDescription: true },
    });
    if (!stored) continue;

    const changedFields = findChangedTextFields(stored, input);
    if (changedFields.length > 0) drift.push({ name: String(input.name), changedFields });
  }

  return drift;
}

export async function syncFeatTextFromSeed(prisma: PrismaClient): Promise<FeatTextChange[]> {
  const drift = await findFeatTextDrift(prisma);
  const bySeedName = new Map(readFeatSeedInputs().map((input) => [String(input.name), input]));

  for (const feat of drift) {
    const input = bySeedName.get(feat.name);
    if (!input) continue;

    await prisma.feat.update({
      where: { name_ruleset: { name: input.name, ruleset: RULESET } },
      data: { description: input.description, shortDescription: input.shortDescription },
    });
  }

  return drift;
}

function findChangedTextFields(
  stored: { description: string; shortDescription: string },
  input: { description: string; shortDescription: string }
): string[] {
  return [
    stored.description === input.description ? null : "description",
    stored.shortDescription === input.shortDescription ? null : "shortDescription",
  ].filter((field): field is string => field !== null);
}

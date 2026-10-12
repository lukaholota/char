import { readFileSync } from "node:fs";
import { buildRecipeSchema } from "./schema";
import { readyPresetSchema, type ReadyPreset } from "./ready-preset";

const FIXTURE_SLUG = "barbarian-path-of-the-giant-2014";

type FeatFixture = { featKey: string; featOptionName: string | null; featSpellKeys: string[] };

export function buildFeatPresetFixture({ featKey, featOptionName, featSpellKeys }: FeatFixture) {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const stored = readyPresetSchema.parse(read(`data/rpgbot/ready-builds/${FIXTURE_SLUG}.json`));
  const stock = buildRecipeSchema.parse(read(`data/rpgbot/builds/${stored.buildId}.json`));
  const recipe = { ...stock, details: { ...stock.details!, featKey } };
  const spells: NonNullable<ReadyPreset["spells"]> = { classCantripKeys: [], knownSpellKeys: [], spellbookKeys: [], raceSpellKeys: [], preparedSpellKeys: [],
    featSpellKeys, sectionId: stored.featSection!, explanation: "Тестова фікстура: заклинання риси." };
  const preset: ReadyPreset = { ...stored, featOptionName, spells };
  return { recipe, preset };
}

import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { collectFeatGrants } from "@/rules/feat-grants";
import type { CreatorContent } from "@/server/db/creator-content-query";
import type { AbilityGain, AdvancementAbility, FeatPoolEntry } from "./ready-preset-advancements";

type CatalogFeat = CreatorContent["feats"][number];

const ABILITY_GROUP_LABEL = "характеристику";

const OPEN_ADVANCEMENT_FEAT_KEYS: readonly string[] = [
  "ALERT", "ATHLETE", "ACTOR", "CHARGER", "CROSSBOW_EXPERT", "DUAL_WIELDER", "DUNGEON_DELVER", "DURABLE", "GREAT_WEAPON_MASTER", "HEALER", "KEEN_MIND",
  "LIGHTLY_ARMORED", "LUCKY", "MAGE_SLAYER", "MOBILE", "MOUNTED_COMBATANT", "OBSERVANT", "POLEARM_MASTER", "RESILIENT", "SAVAGE_ATTACKER", "SENTINEL",
  "SHARPSHOOTER", "SHIELD_MASTER", "TAVERN_BRAWLER", "TOUGH", "CHEF", "CRUSHER", "GUNNER", "PIERCER", "SLASHER", "TELEKINETIC", "TELEPATHIC",
];

export function buildFeatPool(feats: readonly CatalogFeat[]): FeatPoolEntry[] {
  return OPEN_ADVANCEMENT_FEAT_KEYS
    .flatMap((key) => feats.filter((feat) => feat.name === key && !hasPrerequisite(feat)))
    .map(buildFeatPoolEntry)
    .sort((first, second) => first.name.localeCompare(second.name, "uk"));
}

export function buildFeatPoolEntry(feat: CatalogFeat): FeatPoolEntry {
  return {
    key: feat.name,
    name: translateValue(feat.name),
    gains: toGains(collectFeatGrants(feat, []).abilityIncreases),
    optionGroupLabel: feat.featChoiceOptions.length ? ABILITY_GROUP_LABEL : null,
    options: feat.featChoiceOptions.map((entry) => ({
      nameEng: entry.choiceOption.optionNameEng,
      name: entry.choiceOption.optionName,
      gains: toGains(collectFeatGrants(feat, [entry.choiceOptionId]).abilityIncreases),
    })),
  };
}

function toGains(increases: readonly { ability: string; amount: number }[]): AbilityGain[] {
  return increases.map((increase) => ({ ability: increase.ability as AdvancementAbility, amount: increase.amount }));
}

function hasPrerequisite(feat: CatalogFeat): boolean {
  const isFilled = (value: unknown) => value !== null && value !== undefined && value !== false && !(Array.isArray(value) && value.length === 0);
  return [feat.prerequisiteAbilityScore, feat.prerequisiteFeat, feat.prerequisiteLevel, feat.prerequisiteProficiency, feat.prerequisiteSpellcasting, feat.raceRestriction, feat.subraceRestriction].some(isFilled);
}

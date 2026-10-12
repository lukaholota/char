import { classTranslations, subclassTranslations } from "@/lib/refs/translation";

const LABEL_BY_LIST_KEY: Record<string, string> = {
  artificer: classTranslations.ARTIFICER_2014,
  bard: classTranslations.BARD_2014,
  cleric: classTranslations.CLERIC_2014,
  druid: classTranslations.DRUID_2014,
  paladin: classTranslations.PALADIN_2014,
  ranger: classTranslations.RANGER_2014,
  sorcerer: classTranslations.SORCERER_2014,
  warlock: classTranslations.WARLOCK_2014,
  wizard: classTranslations.WIZARD_2014,
  "fighter-eldritch-knight": subclassTranslations.ELDRITCH_KNIGHT,
  "rogue-arcane-trickster": subclassTranslations.ARCANE_TRICKSTER,
};

export function findRatingListLabel(listKey: string): string {
  return LABEL_BY_LIST_KEY[listKey] ?? listKey;
}

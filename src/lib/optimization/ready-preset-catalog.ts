import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";

export type ReadyPresetCatalogEntry = {
  slug: string;
  buildId: string;
  title: string;
  description: string;
  className: string;
  subclassName: string;
  raceName: string;
  baseRaceName: string;
  classLabel: string;
  startingClassKey: string;
  startingSubclassKey: string | null;
  startingClassLabel?: string;
  subclassRatingScore?: number;
  raceKey: string;
  maxLevel: number;
  sourceTitle: string;
  searchAliases: string[];
  portraitSrc: string | null;
  subclassImageSrc: string | null;
  classImageSrc: string | null;
};

const PRESET_CARD_TITLES: Record<string, string> = {
  "cleric-life-lifeberry-2014": "Лайфберрі",
  "sorcadin-clockwork-2014": "Чародин",
  "hexadin-ancients-2014": "Hexadin",
  "hexbuckler-swashbuckler-2014": "Hexbuckler",
  "fighter-champion-shield-2014": "Меч і щит",
  "fighter-champion-greataxe-2014": "Велика сокира",
  "bard-lore-sorcerers-apprentice-2014": "Учень чародія",
  "d4-dispenser-cleric-peace-2014": "Роздавач к4",
};

const PRESET_CLASS_COMPLEXITY = new Map([
  "Воїн", "Варвар", "Пройдисвіт", "Паладин", "Слідопит", "Клірик", "Чародій",
  "Бард", "Монах", "Кривавий мисливець", "Чарівник", "Винахідник", "Чорнокнижник", "Друїд",
].map((name, rank) => [name, rank]));

export function comparePresetClasses(left: string, right: string): number {
  return (PRESET_CLASS_COMPLEXITY.get(left) ?? Infinity) - (PRESET_CLASS_COMPLEXITY.get(right) ?? Infinity)
    || left.localeCompare(right, "uk");
}

export function findPresetCardTitle(preset: Pick<ReadyPresetCatalogEntry, "slug" | "subclassName">): string {
  return PRESET_CARD_TITLES[preset.slug] ?? preset.subclassName;
}

export function findBuildNickname(title: string): string {
  const plainTitle = stripGlossaryMarkers(title);
  const nickname = plainTitle.split("—").at(-1)!.trim();
  return nickname.replace(/^«(.+)»$/, "$1") || plainTitle;
}

export function findPresetGeneratedSrc(preset: Pick<ReadyPresetCatalogEntry, "portraitSrc" | "subclassImageSrc">): string | null {
  return preset.portraitSrc ?? preset.subclassImageSrc;
}

export function findPresetImageSrc(
  preset: Pick<ReadyPresetCatalogEntry, "portraitSrc" | "subclassImageSrc" | "classImageSrc">,
  isGeneratedArtHidden: boolean,
): string | null {
  const generatedSrc = findPresetGeneratedSrc(preset);
  // Without generated art every preset of a class would repeat the same class picture, so no-AI cards stay plain.
  return isGeneratedArtHidden ? null : generatedSrc ?? preset.classImageSrc;
}

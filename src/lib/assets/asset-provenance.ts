/**
 * Where a picture on the site came from. The «без ШІ» mode filters on this and only this —
 * it hides generated art, not images in general.
 *
 * The marking is a path convention, not per-file metadata: every generated illustration is
 * born from a prompt filed in `prompts/` and lands in one of the directories below
 * (see `.agent/rules/visual-assets.md`). A new generated directory must be registered here,
 * otherwise its art keeps showing in no-AI mode.
 */
export type ImageProvenance =
  /** Generated from a prompt. Hidden in no-AI mode. */
  | "ai"
  /** Commissioned or hand-drawn by a person. Always shown. */
  | "drawn"
  /** Taken from an official WotC manual. Always shown. */
  | "manual"
  /** Logos, icons, favicons — interface furniture, not illustration. Always shown. */
  | "chrome";

const PROVENANCE_BY_PREFIX: ReadonlyArray<readonly [string, ImageProvenance]> = [
  ["/images/categories/", "ai"],
  /// Owner's call 2026-08-28: the two home covers — spells and characters — count as non-AI
  /// and stay on screen in the no-AI mode, generated or not. Any other cover under
  /// `/images/home/` is a 2:3 crop of its generated tile and hides together with the tile.
  ["/images/home/characters.webp", "drawn"],
  ["/images/home/spells.webp", "drawn"],
  ["/images/home/", "ai"],
  ["/images/races/", "ai"],
  ["/images/classes/", "ai"],
  ["/images/backgrounds/", "ai"],
  ["/images/rules/", "ai"],
  ["/images/errors/", "ai"],
  ["/images/creatures/", "manual"],
  ["/images/manual/", "manual"],
  ["/images/home-", "drawn"],
  /// Сітка іконок заклинань для «що нового» — намальовані ігрові іконки, не генерація.
  ["/images/whats-new/spell-icons.webp", "drawn"],
];

/// Власник, 2026-09-29: у режимі без ШІ класи й раси показують арт із книг WotC замість згенерованого.
/// Назва тут — це ім'я файлу і в `/images/<тека>/`, і в `/images/manual/<тека>/`.
export const MANUAL_ART_NAMES_BY_FOLDER: Record<string, readonly string[]> = {
  classes: [
    "artificer",
    "barbarian",
    "bard",
    "blood_hunter",
    "cleric",
    "druid",
    "fighter",
    "monk",
    "paladin",
    "ranger",
    "rogue",
    "sorcerer",
    "warlock",
    "wizard",
  ],
  races: [
    "aarakocra",
    "aasimar",
    "air_genasi",
    "astral_elf",
    "autognome",
    "bugbear",
    "centaur",
    "changeling",
    "custom_lineage",
    "deep_gnome",
    "dhampir",
    "dragonborn",
    "dragonborn_chromatic",
    "dragonborn_gem",
    "dragonborn_metallic",
    "duergar",
    "dwarf",
    "earth_genasi",
    "eladrin",
    "elf",
    "fairy",
    "firbolg",
    "fire_genasi",
    "giff",
    "githyanki",
    "githzerai",
    "gnome",
    "goblin",
    "goliath",
    "grung",
    "hadozee",
    "half_elf",
    "half_orc",
    "halfling",
    "harengon",
    "hexblood",
    "hobgoblin",
    "human",
    "kalashtar",
    "kender",
    "kenku",
    "kobold",
    "leonin",
    "lizardfolk",
    "locathah",
    "loxodon",
    "minotaur",
    "orc",
    "owlin",
    "plasmoid",
    "reborn",
    "satyr",
    "sea_elf",
    "shadar_kai",
    "shifter",
    "simic_hybrid",
    "tabaxi",
    "thri_kreen",
    "tiefling",
    "tortle",
    "triton",
    "vedalken",
    "verdan",
    "warforged",
    "water_genasi",
    "yuan_ti",
  ],
};

const MANUAL_ART_BY_GENERATED_SRC = new Map<string, string>(
  Object.entries(MANUAL_ART_NAMES_BY_FOLDER).flatMap(([folder, names]) =>
    names.map((name) => [`/images/${folder}/${name}.webp`, `/images/manual/${folder}/${name}.webp`] as const),
  ),
);

export function findManualArtSrc(src: string | null | undefined): string | null {
  return MANUAL_ART_BY_GENERATED_SRC.get(String(src ?? "")) ?? null;
}

export function findImageProvenance(src: string | null | undefined): ImageProvenance {
  const path = String(src ?? "");
  const match = PROVENANCE_BY_PREFIX.find(([prefix]) => path.startsWith(prefix));
  return match ? match[1] : "chrome";
}

export function isAiGeneratedImage(src: string | null | undefined): boolean {
  return findImageProvenance(src) === "ai";
}

/// Режим без ШІ не завжди означає «порожньо». Там, де для місця є ілюстрація з мануалу, вона
/// стає на місце згенерованої; немає заміни — згенероване ховається, як і раніше.
export function findVisibleImageSrc({
  src,
  noAiSrc,
  isNoAiMode,
  provenance,
}: {
  src?: string | null;
  noAiSrc?: string | null;
  isNoAiMode: boolean;
  provenance?: ImageProvenance;
}): string | null {
  if (!isNoAiMode) return src ?? null;
  const manualSrc = noAiSrc ?? findManualArtSrc(src);
  if (manualSrc) return manualSrc;
  return (provenance ?? findImageProvenance(src)) === "ai" ? null : (src ?? null);
}

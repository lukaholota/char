/**
 * Image manifest & visual asset resolvers for races, species, classes, and catalogs.
 */

// 1. Race / Species image path dictionary
const RACE_IMAGE_MAP: Record<string, string> = {
  // Core PHB (2014 & 2024)
  AASIMAR: "/images/races/aasimar.webp",
  DRAGONBORN: "/images/races/dragonborn.webp",
  DWARF: "/images/races/dwarf.webp",
  ELF: "/images/races/elf.webp",
  GNOME: "/images/races/gnome.webp",
  GOLIATH: "/images/races/goliath.webp",
  HALFLING: "/images/races/halfling.webp",
  HUMAN: "/images/races/human.webp",
  ORC: "/images/races/orc.webp",
  TIEFLING: "/images/races/tiefling.webp",
  HALF_ELF: "/images/races/half_elf.webp",
  HALF_ORC: "/images/races/half_orc.webp",

  // Dragonborn variants
  DRAGONBORN_CHROMATIC: "/images/races/dragonborn.webp",
  DRAGONBORN_METALLIC: "/images/races/dragonborn.webp",
  DRAGONBORN_GEM: "/images/races/dragonborn.webp",

  // GGTR (Ravnica)
  CENTAUR: "/images/races/centaur.webp",
  LOXODON: "/images/races/loxodon.webp",
  MINOTAUR: "/images/races/minotaur.webp",
  SIMIC_HYBRID: "/images/races/simic_hybrid.webp",
  VEDALKEN: "/images/races/vedalken.webp",

  // Acquisitions Incorporated
  VERDAN: "/images/races/verdan.webp",

  // Eberron
  KALASHTAR: "/images/races/kalashtar.webp",
  WARFORGED: "/images/races/warforged.webp",

  // Theros
  LEONIN: "/images/races/leonin.webp",
  SATYR: "/images/races/satyr.webp",

  // Van Richten's Guide to Ravenloft (Lineages)
  DHAMPIR: "/images/races/dhampir.webp",
  HEXBLOOD: "/images/races/hexblood.webp",
  REBORN: "/images/races/reborn.webp",

  // Strixhaven
  OWLIN: "/images/races/owlin.webp",

  // MPMM / Monsters of the Multiverse
  AARAKOCRA: "/images/races/aarakocra.webp",
  BUGBEAR: "/images/races/bugbear.webp",
  CHANGELING: "/images/races/changeling.webp",
  DEEP_GNOME: "/images/races/deep_gnome.webp",
  DUERGAR: "/images/races/duergar.webp",
  ELADRIN: "/images/races/eladrin.webp",
  FAIRY: "/images/races/fairy.webp",
  FIRBOLG: "/images/races/firbolg.webp",
  GENASI_AIR: "/images/races/air_genasi.webp",
  GENASI_EARTH: "/images/races/earth_genasi.webp",
  GENASI_FIRE: "/images/races/fire_genasi.webp",
  GENASI_WATER: "/images/races/water_genasi.webp",
  AIR_GENASI: "/images/races/air_genasi.webp",
  EARTH_GENASI: "/images/races/earth_genasi.webp",
  FIRE_GENASI: "/images/races/fire_genasi.webp",
  WATER_GENASI: "/images/races/water_genasi.webp",
  GITHYANKI: "/images/races/githyanki.webp",
  GITHZERAI: "/images/races/githzerai.webp",
  GOBLIN: "/images/races/goblin.webp",
  HARENGON: "/images/races/harengon.webp",
  HOBGOBLIN: "/images/races/hobgoblin.webp",
  KENKU: "/images/races/kenku.webp",
  KOBOLD: "/images/races/kobold.webp",
  LIZARDFOLK: "/images/races/lizardfolk.webp",
  SEA_ELF: "/images/races/sea_elf.webp",
  SHADAR_KAI: "/images/races/shadar_kai.webp",
  SHIFTER: "/images/races/shifter.webp",
  TABAXI: "/images/races/tabaxi.webp",
  TORTLE: "/images/races/tortle.webp",
  TRITON: "/images/races/triton.webp",
  YUAN_TI: "/images/races/yuan_ti.webp",

  // Spelljammer
  ASTRAL_ELF: "/images/races/astral_elf.webp",
  AUTOGNOME: "/images/races/autognome.webp",
  GIFF: "/images/races/giff.webp",
  HADOZEE: "/images/races/hadozee.webp",
  PLASMOID: "/images/races/plasmoid.webp",
  THRI_KREEN: "/images/races/thri_kreen.webp",

  // Dragonlance
  KENDER: "/images/races/kender.webp",

  // Extra Life / Other
  GRUNG: "/images/races/grung.webp",
  LOCATHAH: "/images/races/locathah.webp",
};

// 2. Class image path dictionary
const CLASS_IMAGE_MAP: Record<string, string> = {
  ARTIFICER: "/images/classes/artificer.webp",
  BARBARIAN: "/images/classes/barbarian.webp",
  BARD: "/images/classes/bard.webp",
  CLERIC: "/images/classes/cleric.webp",
  DRUID: "/images/classes/druid.webp",
  FIGHTER: "/images/classes/fighter.webp",
  MONK: "/images/classes/monk.webp",
  PALADIN: "/images/classes/paladin.webp",
  RANGER: "/images/classes/ranger.webp",
  ROGUE: "/images/classes/rogue.webp",
  SORCERER: "/images/classes/sorcerer.webp",
  WARLOCK: "/images/classes/warlock.webp",
  WIZARD: "/images/classes/wizard.webp",
};

// 3. Category / Catalog image paths
export const CATEGORY_IMAGE_MAP = {
  HEROES_WAR_TABLE: "/images/categories/heroes_war_table.webp",
  ANCESTRAL_SPECIES_HALL: "/images/categories/ancestral_species_hall.webp",
  ANCIENT_RULES_TOME: "/images/categories/ancient_rules_tome.webp",
  MAGIC_ITEMS_STILL_LIFE: "/images/categories/magic_items_still_life.webp",
  GRAND_FORGE_AND_ARMORY: "/images/categories/grand_forge_and_armory.webp",
  COMBAT_MANEUVERS_AND_ASTRAL_RUNES: "/images/categories/combat_maneuvers_and_astral_runes.webp",
  OCCULT_ALCHEMY_WORKBENCH: "/images/categories/occult_alchemy_workbench.webp",
  ADVENTURER_STUDY: "/images/categories/adventurer_study.webp",
  DRACONIC_GUARDIAN_AND_CELESTIAL_BEAST: "/images/categories/draconic_guardian_and_celestial_beast.webp",
} as const;

/**
 * Normalizes race/species enum key or name to canonical lookup key.
 * Example: 'ELF_2024' -> 'ELF', 'GENASI_AIR_MPMM' -> 'GENASI_AIR'
 */
function normalizeRaceKey(key: string): string {
  const upper = key.toUpperCase().trim();

  // Strip standard source suffixes
  const stripped = upper
    .replace(/_2014$/, "")
    .replace(/_2024$/, "")
    .replace(/_MPMM$/, "")
    .replace(/_GGTR$/, "")
    .replace(/_VRGTR$/, "")
    .replace(/_MOOT$/, "")
    .replace(/_EBERRON$/, "")
    .replace(/_SPELLJAMMER$/, "")
    .replace(/_DRAGONLANCE$/, "")
    .replace(/_AI$/, "")
    .replace(/_OGA$/, "")
    .replace(/_LR$/, "")
    .replace(/_SACOC$/, "")
    .replace(/_TCE$/, "");

  return stripped;
}

/**
 * Resolves the public image path for a given race/species name or enum code.
 * Returns `null` if no specific illustration is registered.
 */
export function getRaceImagePath(raceName: string | null | undefined): string | null {
  if (!raceName) return null;
  const rawKey = String(raceName).trim().toUpperCase();

  // 1. Direct exact match
  if (RACE_IMAGE_MAP[rawKey]) {
    return RACE_IMAGE_MAP[rawKey];
  }

  // 2. Normalized match (stripping edition/source suffix)
  const norm = normalizeRaceKey(rawKey);
  if (RACE_IMAGE_MAP[norm]) {
    return RACE_IMAGE_MAP[norm];
  }

  // 3. Fallback partial matching for complex strings or Ukrainian names
  if (norm.includes("AIR_GENASI") || norm.includes("GENASI_AIR") || norm.includes("ПОВІТР")) {
    return RACE_IMAGE_MAP.AIR_GENASI;
  }
  if (norm.includes("EARTH_GENASI") || norm.includes("GENASI_EARTH") || norm.includes("ЗЕМЛ")) {
    return RACE_IMAGE_MAP.EARTH_GENASI;
  }
  if (norm.includes("FIRE_GENASI") || norm.includes("GENASI_FIRE") || norm.includes("ВОГН")) {
    return RACE_IMAGE_MAP.FIRE_GENASI;
  }
  if (norm.includes("WATER_GENASI") || norm.includes("GENASI_WATER") || norm.includes("ВОД")) {
    return RACE_IMAGE_MAP.WATER_GENASI;
  }
  if (norm.includes("HALF_ELF") || norm.includes("НАПІВЕЛЬФ")) {
    return RACE_IMAGE_MAP.HALF_ELF;
  }
  if (norm.includes("HALF_ORC") || norm.includes("НАПІВОРК")) {
    return RACE_IMAGE_MAP.HALF_ORC;
  }
  if (norm.includes("DRAGONBORN") || norm.includes("ДРАКОНО")) {
    return RACE_IMAGE_MAP.DRAGONBORN;
  }
  if (norm.includes("DEEP_GNOME") || norm.includes("ГЛИБИННИЙ")) {
    return RACE_IMAGE_MAP.DEEP_GNOME;
  }
  if (norm.includes("ASTRAL_ELF") || norm.includes("АСТРАЛЬН")) {
    return RACE_IMAGE_MAP.ASTRAL_ELF;
  }
  if (norm.includes("SEA_ELF") || norm.includes("МОРСЬК")) {
    return RACE_IMAGE_MAP.SEA_ELF;
  }
  if (norm.includes("SHADAR_KAI") || norm.includes("ШАДАР")) {
    return RACE_IMAGE_MAP.SHADAR_KAI;
  }
  if (norm.includes("THRI_KREEN") || norm.includes("ТРІ_КРІН") || norm.includes("ТРИ-КРІН")) {
    return RACE_IMAGE_MAP.THRI_KREEN;
  }
  if (norm.includes("SIMIC") || norm.includes("СИМІЧН")) {
    return RACE_IMAGE_MAP.SIMIC_HYBRID;
  }
  if (norm.includes("AASIMAR") || norm.includes("ААЗИМАР") || norm.includes("АСІМАР") || norm.includes("АСИМАР")) {
    return RACE_IMAGE_MAP.AASIMAR;
  }
  if (norm.includes("DWARF") || norm.includes("ДВАРФ") || norm.includes("ДВОРФ")) {
    return RACE_IMAGE_MAP.DWARF;
  }
  if (norm.includes("ELF") || norm.includes("ЕЛЬФ")) {
    return RACE_IMAGE_MAP.ELF;
  }
  if (norm.includes("GNOME") || norm.includes("ГНОМ")) {
    return RACE_IMAGE_MAP.GNOME;
  }
  if (norm.includes("GOLIATH") || norm.includes("ГОЛІАФ")) {
    return RACE_IMAGE_MAP.GOLIATH;
  }
  if (norm.includes("HALFLING") || norm.includes("ГАФЛІНГ") || norm.includes("НАПІВРОСЛИК")) {
    return RACE_IMAGE_MAP.HALFLING;
  }
  if (norm.includes("HUMAN") || norm.includes("ЛЮДИН")) {
    return RACE_IMAGE_MAP.HUMAN;
  }
  if (norm.includes("ORC") || norm.includes("ОРК")) {
    return RACE_IMAGE_MAP.ORC;
  }
  if (norm.includes("TIEFLING") || norm.includes("ТИФЛІНГ") || norm.includes("ТІФЛІНГ")) {
    return RACE_IMAGE_MAP.TIEFLING;
  }

  return null;
}

/**
 * Resolves the public image path for a given class name or enum code.
 * Returns `null` if not found.
 */
export function getClassImagePath(className: string | null | undefined): string | null {
  if (!className) return null;
  const rawKey = String(className).trim().toUpperCase();

  const norm = rawKey
    .replace(/_2014$/, "")
    .replace(/_2024$/, "");

  if (CLASS_IMAGE_MAP[norm]) {
    return CLASS_IMAGE_MAP[norm];
  }

  if (norm.includes("ARTIFICER") || norm.includes("ВИНАХІДНИК")) return CLASS_IMAGE_MAP.ARTIFICER;
  if (norm.includes("BARBARIAN") || norm.includes("ВАРВАР")) return CLASS_IMAGE_MAP.BARBARIAN;
  if (norm.includes("BARD") || norm.includes("БАРД")) return CLASS_IMAGE_MAP.BARD;
  if (norm.includes("CLERIC") || norm.includes("КЛІРИК") || norm.includes("ЖРЕЦЬ")) return CLASS_IMAGE_MAP.CLERIC;
  if (norm.includes("DRUID") || norm.includes("ДРУЇД")) return CLASS_IMAGE_MAP.DRUID;
  if (norm.includes("FIGHTER") || norm.includes("ВОЇН")) return CLASS_IMAGE_MAP.FIGHTER;
  if (norm.includes("MONK") || norm.includes("МОНАХ")) return CLASS_IMAGE_MAP.MONK;
  if (norm.includes("PALADIN") || norm.includes("ПАЛАДИН")) return CLASS_IMAGE_MAP.PALADIN;
  if (norm.includes("RANGER") || norm.includes("СЛІДОПИТ")) return CLASS_IMAGE_MAP.RANGER;
  if (norm.includes("ROGUE") || norm.includes("ПРОЙДИСВІТ") || norm.includes("ПЛУТ")) return CLASS_IMAGE_MAP.ROGUE;
  if (norm.includes("SORCERER") || norm.includes("ЧАРОДІЙ")) return CLASS_IMAGE_MAP.SORCERER;
  if (norm.includes("WARLOCK") || norm.includes("ЧОРНОКНИЖНИК") || norm.includes("ЧАКЛУН")) return CLASS_IMAGE_MAP.WARLOCK;
  if (norm.includes("WIZARD") || norm.includes("ЧАРІВНИК")) return CLASS_IMAGE_MAP.WIZARD;

  return null;
}

/**
 * Resolves the public image path for a catalog or home page card category.
 */
export function getCategoryImagePath(category: string | null | undefined): string {
  const cat = String(category ?? "").toUpperCase();

  if (cat.includes("SPECIES") || cat.includes("RACE") || cat.includes("ВИДИ") || cat.includes("РАСИ")) {
    return CATEGORY_IMAGE_MAP.ANCESTRAL_SPECIES_HALL;
  }
  if (cat.includes("CLASS") || cat.includes("КЛАСИ") || cat.includes("HERO") || cat.includes("ПЕРСОНАЖ")) {
    return CATEGORY_IMAGE_MAP.HEROES_WAR_TABLE;
  }
  if (cat.includes("SPELL") || cat.includes("ЗАКЛИНАН")) {
    return CATEGORY_IMAGE_MAP.ANCIENT_RULES_TOME;
  }
  if (cat.includes("MAGIC_ITEM") || cat.includes("ПРЕДМЕТ") || cat.includes("АРТЕФАКТ")) {
    return CATEGORY_IMAGE_MAP.MAGIC_ITEMS_STILL_LIFE;
  }
  if (cat.includes("WEAPON") || cat.includes("ARMOR") || cat.includes("ЗБРОЯ") || cat.includes("ОБЛАДУН")) {
    return CATEGORY_IMAGE_MAP.GRAND_FORGE_AND_ARMORY;
  }
  if (cat.includes("INVOCATION") || cat.includes("INFUSION") || cat.includes("ВІДОЗВ") || cat.includes("ВЛИВАН")) {
    return CATEGORY_IMAGE_MAP.OCCULT_ALCHEMY_WORKBENCH;
  }
  if (cat.includes("FEAT") || cat.includes("РИС") || cat.includes("RULE") || cat.includes("ПРАВИЛ")) {
    return CATEGORY_IMAGE_MAP.ADVENTURER_STUDY;
  }
  if (cat.includes("BESTIARY") || cat.includes("MONSTER") || cat.includes("БЕСТІАР") || cat.includes("ІСТОТ")) {
    return CATEGORY_IMAGE_MAP.DRACONIC_GUARDIAN_AND_CELESTIAL_BEAST;
  }
  if (cat.includes("MANEUVER") || cat.includes("COMBAT") || cat.includes("БІЙ")) {
    return CATEGORY_IMAGE_MAP.COMBAT_MANEUVERS_AND_ASTRAL_RUNES;
  }

  return CATEGORY_IMAGE_MAP.HEROES_WAR_TABLE;
}

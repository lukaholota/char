import { join } from "path";

export const AIDEDD_DIR = join(process.cwd(), "data/aidedd");
export const AIDEDD_LIST_DIR = join(AIDEDD_DIR, "lists");
export const AIDEDD_RAW_DIR = join(AIDEDD_DIR, "raw");

export type AideddCatalog = {
  key: string;
  label: string;
  listUrl: string;
  expectedCount: number;
  fields: Array<[string, string]>;
  buildPageUrl: (slug: string) => string;
};

const MONSTER_TYPES_2014 = [
  "Humanoid",
  "Aberration",
  "Beast",
  "Celestial",
  "Construct",
  "Dragon",
  "Elemental",
  "Fey",
  "Fiend",
  "Giant",
  "Monstrosity",
  "Ooze",
  "Plant",
  "Undead",
];

const SIZES_2014 = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

const SPELL_SCHOOLS_2014 = [
  "abjuration",
  "conjuration",
  "divination",
  "enchantment",
  "evocation",
  "illusion",
  "necromancy",
  "transmutation",
];

const MAGIC_ITEM_TYPES_2014 = [
  "armor",
  "potion",
  "ring",
  "rod",
  "scroll",
  "staff",
  "wand",
  "weapon",
  "wondrous item",
];

/// Every select is enumerated in full on purpose: the page default is not "everything".
/// Monsters 2014 default to 428 of 934, monsters 2024 to 513 of 521, feats 2014 to 83 of 103.
export const AIDEDD_CATALOGS: AideddCatalog[] = [
  {
    key: "monsters-2014",
    label: "Монстри 2014",
    listUrl: "https://www.aidedd.org/dnd-filters/monsters.php",
    expectedCount: 934,
    fields: [
      ["filtrer", "FILTER"],
      ["nivMin", "-1"],
      ["nivMax", "30"],
      ...listValues("Filtre1[]", ["M", "A", "P"]),
      ...listValues("Filtre2[]", MONSTER_TYPES_2014),
      ...listValues("Filtre3[]", SIZES_2014),
      ...listValues("source[]", ["base", "ftod", "motm", "gog", "rule", "adv", "nono"]),
    ],
    buildPageUrl: (slug) => `https://www.aidedd.org/dnd/monstres.php?vo=${slug}`,
  },
  {
    key: "monsters-2024",
    label: "Монстри 2024",
    listUrl: "https://www.aidedd.org/monster/",
    expectedCount: 521,
    fields: [
      ["filtrer", "FILTER"],
      ["nivMin", "-1"],
      ["nivMax", "30"],
      ...listValues("Filtre1[]", ["M", "A", "O"]),
      ...listValues("Filtre2[]", countUpTo(13)),
      ...listValues("Filtre3[]", countUpTo(5)),
      ...listValues("Filtre4[]", countUpTo(12)),
      ...listValues("source[]", ["mm", "phb", "aif"]),
    ],
    buildPageUrl: (slug) => `https://www.aidedd.org/monster/${slug}`,
  },
  {
    key: "spells-2014",
    label: "Заклинання 2014",
    listUrl: "https://www.aidedd.org/dnd-filters/spells-5e.php",
    expectedCount: 487,
    fields: [
      ["filtrer", "FILTER"],
      ["nivMin", "0"],
      ["nivMax", "9"],
      ...listValues("Filtre1[]", ["b", "c", "d", "p", "r", "s", "k", "w", "a"]),
      ...listValues("Filtre2[]", SPELL_SCHOOLS_2014),
      ...listValues("source[]", ["base", "xgte", "tcoe", "ftod", "set"]),
    ],
    buildPageUrl: (slug) => `https://www.aidedd.org/dnd/sorts.php?vo=${slug}`,
  },
  {
    key: "magic-items-2014",
    label: "Магічні предмети 2014",
    listUrl: "https://www.aidedd.org/dnd-filters/magic-items.php",
    expectedCount: 473,
    fields: [
      ["filtrer", "FILTER"],
      ...listValues("Filtre1[]", MAGIC_ITEM_TYPES_2014),
      ...listValues("Filtre2[]", ["C", "NC", "R", "TR", "L", "A"]),
      ...listValues("source[]", ["base", "xgte", "tcoe", "ftod", "gog", "bmt", "adv"]),
    ],
    buildPageUrl: (slug) => `https://www.aidedd.org/dnd/om.php?vo=${slug}`,
  },
  {
    key: "feats-2014",
    label: "Риси 2014",
    listUrl: "https://www.aidedd.org/dnd-filters/feats.php",
    expectedCount: 103,
    fields: [
      ["filtrer", "FILTER"],
      ...listValues("source[]", ["base", "xgte", "tcoe", "ftod", "gog", "set", "adv", "unof"]),
    ],
    buildPageUrl: (slug) => `https://www.aidedd.org/dnd/dons.php?vo=${slug}`,
  },
];

export function findCatalog(key: string): AideddCatalog {
  const catalog = AIDEDD_CATALOGS.find((entry) => entry.key === key);
  if (!catalog) {
    throw new Error(
      `Невідомий каталог "${key}". Доступні: ${AIDEDD_CATALOGS.map((c) => c.key).join(", ")}`
    );
  }
  return catalog;
}

export function findListPath(key: string): string {
  return join(AIDEDD_LIST_DIR, `${key}.json`);
}

export function findRawDir(key: string): string {
  return join(AIDEDD_RAW_DIR, key);
}

function listValues(name: string, values: string[]): Array<[string, string]> {
  return values.map((value) => [name, value] as [string, string]);
}

function countUpTo(last: number): string[] {
  return Array.from({ length: last + 1 }, (_, index) => String(index));
}

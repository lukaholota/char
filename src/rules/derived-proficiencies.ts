export type ProficiencySource = {
  armor?: readonly string[] | null;
  weapons?: unknown;
  weaponsSpecial?: unknown;
  tools?: unknown;
  languages?: readonly string[] | null;
};

export type DerivedProficiencies = {
  armor: string[];
  weaponTypes: string[];
  weapons: string[];
  tools: string[];
  languages: string[];
};

const WEAPON_TYPES = ["SIMPLE_WEAPON", "MARTIAL_WEAPON", "FIREARMS"];
const TOOL_CODE = /^[A-Z][A-Z0-9_]*$/;

// Лише фіксовані надання: «інструмент на вибір» чи «мова на вибір» гравець називає при створенні,
// і ці назви живуть у тексті персонажа, а не в джерелі.
export function collectDerivedProficiencies(sources: readonly ProficiencySource[]): DerivedProficiencies {
  const weaponGrants = sources.map((source) => readWeaponGrant(source.weapons, source.weaponsSpecial));

  return {
    armor: uniqueValues(sources.flatMap((source) => source.armor ?? [])),
    weaponTypes: uniqueValues(weaponGrants.flatMap((grant) => grant.types)),
    weapons: uniqueValues(weaponGrants.flatMap((grant) => grant.categories)),
    tools: uniqueValues(sources.flatMap((source) => readFixedTools(source.tools))),
    languages: uniqueValues(sources.flatMap((source) => source.languages ?? [])),
  };
}

function readWeaponGrant(weapons: unknown, weaponsSpecial: unknown): { types: string[]; categories: string[] } {
  const listed = [...readStrings(weapons), ...readStrings(readField(weapons, "type")), ...readStrings(readField(weapons, "category"))];
  const specific = readStrings(readField(weaponsSpecial, "specific"));

  return {
    types: listed.filter((value) => WEAPON_TYPES.includes(value)),
    categories: [...listed.filter((value) => !WEAPON_TYPES.includes(value)), ...specific],
  };
}

// Дворф 2014 тримає пул вибору («ковальські, пивоварні або каменярські») текстом, а не кодами.
function readFixedTools(tools: unknown): string[] {
  return readToolValues(tools).filter((tool) => TOOL_CODE.test(tool) && !tool.startsWith("ANY_"));
}

function readToolValues(tools: unknown): string[] {
  if (Array.isArray(tools)) return readStrings(tools);
  const category = readStrings(readField(tools, "category"));
  if (category.length) return category;
  return isRecord(tools) ? Object.keys(tools) : [];
}

function readField(value: unknown, field: string): unknown {
  return isRecord(value) ? value[field] : undefined;
}

function readStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueValues(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

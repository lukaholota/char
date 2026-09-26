import { toEntitySlug } from "@/lib/slug-utils";

/// O44: адреса каталогу описує кінцеву ціль читання — батька, розділ, гілку й здібність.
/// Модуль легкий: і пошуковий індекс, і клієнтський читач імпортують його без каталожного JSON.

export type ClassSection = "overview" | "table" | "features" | "subclasses";
export type RaceSection = "overview" | "traits" | "branches";
export type RaceBranchKind = "subrace" | "variant";

export type ClassReadingTarget = {
  classKey: string;
  section: ClassSection;
  subclassKey: string | null;
  featureKey: string | null;
};

export type RaceReadingTarget = {
  raceKey: string;
  section: RaceSection;
  branch: { kind: RaceBranchKind; key: string } | null;
  featureKey: string | null;
};

type NamedFeature = { engName: string; level: number };
type NamedTrait = { engName: string };
type NamedBranch = { key: string; engName: string };

const CLASS_SECTIONS: readonly ClassSection[] = ["overview", "table", "features", "subclasses"];
const RACE_SECTIONS: readonly RaceSection[] = ["overview", "traits", "branches"];
const BRANCH_KINDS: readonly RaceBranchKind[] = ["subrace", "variant"];

/// Параметри, які несе ціль. Фільтри каталогу (`q`, `hd`, `trait`, джерела) лишаються поруч
/// і на ціль не впливають. `trait` у расах — уже фільтр, тож риса раси теж зветься `feature`.
const READING_PARAMS = ["view", "subclass", "subrace", "variant", "feature", "jump"] as const;

export function findFeatureKey(feature: NamedFeature): string {
  return `${toEntitySlug(findPlainEnglishName(feature.engName))}-${feature.level}`;
}

export function findTraitKey(trait: NamedTrait): string {
  return toEntitySlug(findPlainEnglishName(trait.engName));
}

/// Сіди 2024 пишуть «Bard: Bardic Inspiration (2024)» — власник і редакція вже є в адресі.
export function findPlainEnglishName(engName: string): string {
  return engName.replace(/^[^:]+:\s*/, "").replace(/\s*\((?:2014|2024)\)\s*$/, "").trim() || engName;
}

export function findBranchKey(branch: NamedBranch): string {
  return toEntitySlug(branch.engName);
}

export function parseClassReadingTarget(params: URLSearchParams): ClassReadingTarget | null {
  const classKey = params.get("class");
  if (!classKey) return null;

  const subclassKey = params.get("subclass") || findLegacySubclassJump(params);
  const featureKey = params.get("feature") || null;
  const section = findClassSection(params.get("view"), subclassKey, featureKey);
  return { classKey, section, subclassKey, featureKey };
}

export function parseRaceReadingTarget(params: URLSearchParams): RaceReadingTarget | null {
  const raceKey = params.get("race");
  if (!raceKey) return null;

  const branch = findBranchParam(params) ?? findLegacyBranchJump(params);
  const featureKey = params.get("feature") || null;
  const section = findRaceSection(params.get("view"), branch, featureKey);
  return { raceKey, section, branch, featureKey };
}

export function writeClassReadingTarget(params: URLSearchParams, target: ClassReadingTarget): URLSearchParams {
  clearReadingParams(params);
  params.set("class", target.classKey);
  if (target.subclassKey) params.set("subclass", target.subclassKey);
  if (target.featureKey) params.set("feature", target.featureKey);
  if (target.section !== findClassSection(null, target.subclassKey, target.featureKey)) {
    params.set("view", target.section);
  }
  return params;
}

export function writeRaceReadingTarget(params: URLSearchParams, target: RaceReadingTarget): URLSearchParams {
  clearReadingParams(params);
  params.set("race", target.raceKey);
  if (target.branch) params.set(target.branch.kind, target.branch.key);
  if (target.featureKey) params.set("feature", target.featureKey);
  if (target.section !== findRaceSection(null, target.branch, target.featureKey)) {
    params.set("view", target.section);
  }
  return params;
}

export function buildClassReadingHref(routePrefix: string, target: Omit<ClassReadingTarget, "section"> & { section?: ClassSection }): string {
  const section = target.section ?? findClassSection(null, target.subclassKey, target.featureKey);
  const params = writeClassReadingTarget(new URLSearchParams(), { ...target, section });
  return `${routePrefix}/classes?${params}`;
}

export function buildRaceReadingHref(routePrefix: string, target: Omit<RaceReadingTarget, "section"> & { section?: RaceSection }): string {
  const section = target.section ?? findRaceSection(null, target.branch, target.featureKey);
  const params = writeRaceReadingTarget(new URLSearchParams(), { ...target, section });
  return `${routePrefix}/races?${params}`;
}

function clearReadingParams(params: URLSearchParams) {
  for (const name of READING_PARAMS) params.delete(name);
}

function findClassSection(view: string | null, subclassKey: string | null, featureKey: string | null): ClassSection {
  if (subclassKey) return "subclasses";
  if (isOneOf(view, CLASS_SECTIONS)) return view;
  return featureKey ? "features" : "overview";
}

function findRaceSection(view: string | null, branch: RaceReadingTarget["branch"], featureKey: string | null): RaceSection {
  if (branch) return "branches";
  if (isOneOf(view, RACE_SECTIONS)) return view;
  return featureKey ? "traits" : "overview";
}

function findBranchParam(params: URLSearchParams): RaceReadingTarget["branch"] {
  const kind = BRANCH_KINDS.find((candidate) => params.get(candidate));
  return kind ? { kind, key: params.get(kind)! } : null;
}

/// KR33.2 ставив `jump=<slug підкласу>` для чипів і пошуку; такі посилання вже розійшлися.
function findLegacySubclassJump(params: URLSearchParams): string | null {
  const jump = params.get("jump");
  return jump && !jump.includes(":") ? jump : null;
}

/// Чипи KR33.2 позначали гілку раси як `subrace:<KEY>` — ключем бази, а не слагом.
function findLegacyBranchJump(params: URLSearchParams): RaceReadingTarget["branch"] {
  const [kind, key] = (params.get("jump") ?? "").split(":");
  return isOneOf(kind, BRANCH_KINDS) && key ? { kind, key } : null;
}

function isOneOf<T extends string>(value: string | null | undefined, options: readonly T[]): value is T {
  return options.includes(value as T);
}

type ReadableClass = {
  classId: number;
  slug: string;
  features: NamedFeature[];
  subclasses: { slug: string; features: NamedFeature[] }[];
};

export type ClassReading<TClass extends ReadableClass> = {
  characterClass: TClass;
  subclass: TClass["subclasses"][number] | null;
  featureKey: string | null;
  section: ClassSection;
  missing: "subclass" | "feature" | null;
};

/// Невідомий батько — `null`: каталог лишається на своєму виборі. Невідома гілка чи здібність
/// не скидає ціль до батька мовчки, а позначається `missing`, щоб читач показав, чого немає.
export function findClassReading<TClass extends ReadableClass>(
  classes: readonly TClass[],
  target: ClassReadingTarget,
): ClassReading<TClass> | null {
  const characterClass = classes.find((candidate) => matchesParentKey(candidate.slug, candidate.classId, target.classKey));
  if (!characterClass) return null;

  const subclass = target.subclassKey
    ? characterClass.subclasses.find((candidate) => candidate.slug === target.subclassKey) ?? null
    : null;
  if (target.subclassKey && !subclass) {
    return { characterClass, subclass: null, featureKey: null, section: "subclasses", missing: "subclass" };
  }

  const features = subclass ? subclass.features : characterClass.features;
  const hasFeature = !target.featureKey || features.some((feature) => findFeatureKey(feature) === target.featureKey);
  return {
    characterClass,
    subclass,
    featureKey: hasFeature ? target.featureKey : null,
    section: target.section,
    missing: hasFeature ? null : "feature",
  };
}

type ReadableBranch = NamedBranch & { traits: NamedTrait[] };
type ReadableRace = {
  raceId: number;
  slug: string;
  traits: NamedTrait[];
  subraces: ReadableBranch[];
  variants: ReadableBranch[];
};

export type RaceReading<TRace extends ReadableRace> = {
  race: TRace;
  branch: { kind: RaceBranchKind; entry: TRace["subraces"][number] } | null;
  featureKey: string | null;
  section: RaceSection;
  missing: "branch" | "feature" | null;
};

export function findRaceReading<TRace extends ReadableRace>(
  races: readonly TRace[],
  target: RaceReadingTarget,
): RaceReading<TRace> | null {
  const race = races.find((candidate) => matchesParentKey(candidate.slug, candidate.raceId, target.raceKey));
  if (!race) return null;

  const branch = target.branch ? findBranch(race, target.branch) : null;
  if (target.branch && !branch) {
    return { race, branch: null, featureKey: null, section: "branches", missing: "branch" };
  }

  const traits = branch ? branch.entry.traits : race.traits;
  const hasTrait = !target.featureKey || traits.some((trait) => findTraitKey(trait) === target.featureKey);
  return {
    race,
    branch,
    featureKey: hasTrait ? target.featureKey : null,
    section: target.section,
    missing: hasTrait ? null : "feature",
  };
}

function findBranch<TBranch extends NamedBranch>(
  race: { subraces: TBranch[]; variants: TBranch[] },
  wanted: { kind: RaceBranchKind; key: string },
): { kind: RaceBranchKind; entry: TBranch } | null {
  const branches = wanted.kind === "subrace" ? race.subraces : race.variants;
  const entry = branches.find((candidate) => findBranchKey(candidate) === wanted.key || candidate.key === wanted.key);
  return entry ? { kind: wanted.kind, entry } : null;
}

/// Старі посилання несуть числовий id замість слага — їх теж відкриваємо.
function matchesParentKey(slug: string, id: number, key: string): boolean {
  return slug === key || String(id) === key;
}

export type RatedCaster = { className: string; subclassName?: string | null };

const RATING_LIST_BY_CLASS: Record<string, string> = {
  ARTIFICER_2014: "artificer",
  BARD_2014: "bard",
  CLERIC_2014: "cleric",
  DRUID_2014: "druid",
  PALADIN_2014: "paladin",
  RANGER_2014: "ranger",
  SORCERER_2014: "sorcerer",
  WARLOCK_2014: "warlock",
  WIZARD_2014: "wizard",
};

const OWN_RATING_LIST_BY_SUBCLASS: Record<string, { className: string; listKey: string }> = {
  ELDRITCH_KNIGHT: { className: "FIGHTER_2014", listKey: "fighter-eldritch-knight" },
  ARCANE_TRICKSTER: { className: "ROGUE_2014", listKey: "rogue-arcane-trickster" },
};

const BORROWED_RATING_LIST = "wizard";

export function findRatingListKeys(caster: RatedCaster): string[] {
  const ownList = findOwnSubclassList(caster);
  if (ownList) return [ownList, BORROWED_RATING_LIST];
  const classList = RATING_LIST_BY_CLASS[caster.className];
  return classList ? [classList] : [];
}

function findOwnSubclassList(caster: RatedCaster): string | null {
  const entry = caster.subclassName ? OWN_RATING_LIST_BY_SUBCLASS[caster.subclassName] : undefined;
  return entry && entry.className === caster.className ? entry.listKey : null;
}

type NamedRef = { name: string } | null | undefined;
type PersWithClasses = {
  class?: NamedRef;
  subclass?: NamedRef;
  multiclasses?: readonly { class?: NamedRef; subclass?: NamedRef }[] | null;
};

export function collectPersRatedCasters(pers: PersWithClasses): RatedCaster[] {
  const entries = [{ class: pers.class, subclass: pers.subclass }, ...(pers.multiclasses ?? [])];
  return entries.flatMap((entry) => (entry.class ? [{ className: entry.class.name, subclassName: entry.subclass?.name ?? null }] : []));
}

export function hasRatingList(casters: readonly RatedCaster[]): boolean {
  return casters.some((caster) => findRatingListKeys(caster).length > 0);
}

export function formatRatedCastersParam(casters: readonly RatedCaster[]): string {
  return casters
    .filter((caster) => findRatingListKeys(caster).length > 0)
    .map((caster) => (caster.subclassName ? `${caster.className}:${caster.subclassName}` : caster.className))
    .join(",");
}

export function parseRatedCastersParam(raw: string | null | undefined): RatedCaster[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim().split(":"))
    .filter(([className]) => Boolean(className))
    .map(([className, subclassName]) => ({ className, subclassName: subclassName || null }));
}

import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";

type Draft = Partial<PersFormData> & Record<string, unknown>;

const RACE_DETAIL_DEPENDENTS = [
  "raceChoiceSelections",
  "racialBonusChoiceSchema",
  "featId",
  "featChoiceSelections",
  "speciesFeatChoiceSelections",
  "featSpellSelections.SPECIES_VERSATILITY",
  "raceSpellIds",
  "skillsSchema",
  "skills",
  "expertiseSchema",
  "languagesSchema",
];

const CLASS_SPELL_DEPENDENTS = ["classSpells", "initialPreparedSpellIds", "classOptionSpellIds"];

const DEPENDENTS_BY_SOURCE: Record<string, readonly string[]> = {
  raceId: ["subraceId", "raceVariantId", ...RACE_DETAIL_DEPENDENTS],
  subraceId: RACE_DETAIL_DEPENDENTS,
  raceVariantId: RACE_DETAIL_DEPENDENTS,
  raceChoiceSelections: ["raceSpellIds", "skillsSchema", "skills", "expertiseSchema", "languagesSchema"],
  classId: [
    "subclassId",
    "classChoiceSelections",
    "subclassChoiceSelections",
    "classOptionalFeatureSelections",
    ...CLASS_SPELL_DEPENDENTS,
    "weaponMasteryWeaponIds",
    "skillsSchema",
    "skills",
    "expertiseSchema",
    "languagesSchema",
    "equipmentSchema",
    "equipment",
    "choiceGroupToId",
    "anyWeaponSelection",
  ],
  subclassId: ["subclassChoiceSelections", ...CLASS_SPELL_DEPENDENTS, "expertiseSchema", "languagesSchema"],
  backgroundId: [
    "backgroundAsiChoice",
    "backgroundFeatId",
    "backgroundFeatChoiceSelections",
    "featSpellSelections.BACKGROUND_ORIGIN",
    "skillsSchema",
    "skills",
    "expertiseSchema",
    "languagesSchema",
  ],
  featId: ["featChoiceSelections", "featSpellSelections.CLASS_ASI"],
  featChoiceSelections: ["featSpellSelections.CLASS_ASI"],
  backgroundFeatId: ["backgroundFeatChoiceSelections", "featSpellSelections.BACKGROUND_ORIGIN"],
  backgroundFeatChoiceSelections: ["featSpellSelections.BACKGROUND_ORIGIN"],
  speciesFeatChoiceSelections: ["featSpellSelections.SPECIES_VERSATILITY"],
  skills: ["expertiseSchema"],
  skillsSchema: ["expertiseSchema"],
};

const EMPTY_VALUES: Record<string, unknown> = {
  raceVariantId: null,
  raceChoiceSelections: {},
  featChoiceSelections: {},
  backgroundFeatChoiceSelections: {},
  speciesFeatChoiceSelections: {},
  classChoiceSelections: {},
  subclassChoiceSelections: {},
  classOptionalFeatureSelections: {},
  choiceGroupToId: {},
  anyWeaponSelection: {},
  skills: [],
  equipment: [],
  weaponMasteryWeaponIds: [],
};

/** A field the user did not touch while its source changed still describes the old choice. */
export function findStaleDraftReset(previous: Draft, next: Draft): Draft {
  const staleFields = new Set(
    Object.keys(DEPENDENTS_BY_SOURCE)
      .filter((source) => !isSameValue(previous[source], next[source]))
      .flatMap((source) => DEPENDENTS_BY_SOURCE[source])
      .filter((field) => isSameValue(readField(previous, field), readField(next, field))),
  );
  const reset: Draft = {};
  for (const field of staleFields) {
    const [name, featSpellSource] = field.split(".");
    const current = name in reset ? reset[name] : next[name];
    const cleared = featSpellSource ? dropFeatSpells(current as PersFormData["featSpellSelections"], featSpellSource) : EMPTY_VALUES[name];
    if (!isSameValue(current, cleared)) reset[name] = cleared;
  }
  return reset;
}

/** `featSpellSelections.SOURCE` — заклинання лише однієї риси: зміна раси не чіпає рису передісторії. */
function readField(draft: Draft, field: string): unknown {
  const [name, featSpellSource] = field.split(".");
  return featSpellSource ? draft.featSpellSelections?.[featSpellSource as keyof NonNullable<Draft["featSpellSelections"]>] : draft[name];
}

function dropFeatSpells(selections: PersFormData["featSpellSelections"], source: string) {
  if (!selections || !(source in selections)) return selections;
  const { [source as keyof typeof selections]: _dropped, ...rest } = selections;
  return rest;
}

function isSameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeEmpty(left)) === JSON.stringify(normalizeEmpty(right));
}

function normalizeEmpty(value: unknown): unknown {
  if (value == null) return null;
  if (Array.isArray(value)) return value.length ? value : null;
  if (typeof value === "object") return Object.keys(value).length ? value : null;
  return value;
}

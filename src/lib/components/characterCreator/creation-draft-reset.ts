import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";

type Draft = Partial<PersFormData> & Record<string, unknown>;

const SPECIES_FEAT_SPELL_SOURCE = "SPECIES_VERSATILITY";

const RACE_DETAIL_DEPENDENTS = [
  "raceChoiceSelections",
  "racialBonusChoiceSchema",
  "featId",
  "featChoiceSelections",
  "speciesFeatChoiceSelections",
  "featSpellSelections",
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
};

const EMPTY_VALUES: Record<string, unknown> = {
  raceVariantId: null,
  raceChoiceSelections: {},
  featChoiceSelections: {},
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
      .filter((field) => isSameValue(previous[field], next[field])),
  );
  const reset: Draft = {};
  for (const field of staleFields) {
    const cleared = field === "featSpellSelections" ? dropSpeciesFeatSpells(next.featSpellSelections) : EMPTY_VALUES[field];
    if (!isSameValue(next[field], cleared)) reset[field] = cleared;
  }
  return reset;
}

function dropSpeciesFeatSpells(selections: PersFormData["featSpellSelections"]) {
  if (!selections || !(SPECIES_FEAT_SPELL_SOURCE in selections)) return selections;
  const { [SPECIES_FEAT_SPELL_SOURCE]: _species, ...rest } = selections;
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

import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";

/** Valid-shape point-buy scores. Point-cost legality isn't validated by the schema, so any six values work. */
export const DEFAULT_POINT_BUY_ASI = [
  { ability: "STR", value: 15 },
  { ability: "DEX", value: 14 },
  { ability: "CON", value: 13 },
  { ability: "INT", value: 12 },
  { ability: "WIS", value: 10 },
  { ability: "CHA", value: 8 },
];

export const ALL_SIMPLE_ASI = ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((ability) => ({
  ability,
  value: 10,
}));

export const ALL_CUSTOM_ASI = ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((ability) => ({
  ability,
  value: "10",
}));

type RequiredIds = Pick<PersFormData, "raceId" | "classId" | "backgroundId">;

/** Base PersFormData with every schema-required field filled with a neutral default. Build files override what they need. */
export function minimalForm(overrides: RequiredIds & Partial<PersFormData>): PersFormData {
  return {
    name: "Тестовий Білд",
    raceSearch: "",
    backgroundSearch: "",
    raceChoiceSelections: {},
    subclassChoiceSelections: {},
    classChoiceSelections: {},
    featChoiceSelections: {},
    backgroundFeatChoiceSelections: {},
    speciesFeatChoiceSelections: {},
    classOptionalFeatureSelections: {},
    isDefaultASI: true,
    asiSystem: "POINT_BUY",
    points: 0,
    simpleAsi: [],
    customAsi: [],
    asi: DEFAULT_POINT_BUY_ASI,
    skills: [],
    equipment: [],
    ...overrides,
  };
}

import type { CreatorContent } from "@/server/db/creator-content-query";
import type { AbilityScores } from "@/rules/types";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";
import type { AssemblyCatalog } from "./assembly-catalog";
import type { ReadyPreset } from "./ready-preset";
import type { BuildProgressionStep, BuildRecipe } from "./types";

export type SpellPoolEntry = SpellChoiceOption & { key: string };

export type WalkEnvironment = {
  recipe: BuildRecipe;
  preset: ReadyPreset;
  content: CreatorContent;
  catalog: AssemblyCatalog;
  spellPool: readonly SpellPoolEntry[];
};

export type ClassProgress = {
  classLevel: number;
  subclassKey: string | null;
  ownedCantrips: number;
  ownedCantripIds: number[];
  ownedLeveledSpells: number;
  ownedLeveledSpellIds: number[];
  spellbookSpellIds: number[];
};

export type WalkState = {
  classes: Map<string, ClassProgress>;
  scores: AbilityScores;
  featKeys: string[];
  proficientSkills: Set<string>;
  expertiseSkills: Set<string>;
  takenSpellIds: Set<number>;
  raceSpellGrants: { spellId: number; characterLevel: number }[];
  chosenOptionIds: Set<number>;
  infusionNames: Set<string>;
};

export type OpenSpellKeys = { characterLevel: number; cantripKeys: string[]; knownSpellKeys: string[]; spellbookKeys: string[] };

export type StepContext = {
  step: BuildProgressionStep;
  env: WalkEnvironment;
  state: WalkState;
  progress: ClassProgress;
  isClassEntry: boolean;
  fail: (message: string) => void;
  warn: (message: string) => void;
};

export type ProgressionWalk = {
  errors: string[];
  warnings: string[];
  openSelections: OpenSpellKeys[];
};

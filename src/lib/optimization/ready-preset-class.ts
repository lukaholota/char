import { getAllClasses } from "@/lib/classesData";
import type { BuildRecipe } from "./types";

export function findReadyPresetClass(recipe: BuildRecipe) {
  const classes = getAllClasses(recipe.ruleset);
  const characterClass = classes.find((entry) => entry.key === recipe.startingClassKey);
  const subclassStep = recipe.progression.find((step) => step.subclassKey);
  const subclassClass = recipe.details?.subclassKey ? characterClass : classes.find((entry) => entry.key === subclassStep?.classKey);
  const subclassKey = recipe.details?.subclassKey ?? subclassStep?.subclassKey;
  const subclass = subclassClass?.subclasses.find((entry) => entry.key === subclassKey);
  if (!characterClass || !subclassClass || !subclass) throw new Error(`Missing ready preset class: ${recipe.buildId}`);
  const subclassLevel = recipe.details?.subclassKey ? characterClass.subclassLevel : subclassStep!.characterLevel;
  return { characterClass, subclassClass, subclass, subclassLevel };
}

import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import {
  findFeatRepeatProblemInBatch,
  isFeatCategoryAllowed,
  type FeatChoicePick,
  type FeatChoiceSource,
  type FeatInstance,
  type FeatRepeatCandidate,
  type FeatRepeatProblem,
} from "@/rules/repeatable-feats";

type FeatChoiceOptionRow = {
  choiceOptionId: number;
  choiceOption: { groupName: string; optionNameEng: string; features?: readonly { featureId: number }[] } | null;
};

export type GateableFeat = {
  name: string;
  category: string | null;
  isRepeatable: boolean;
  featChoiceOptions: readonly FeatChoiceOptionRow[];
};

type ChoiceSelections = Record<string, number | number[]> | undefined;

export type FeatPick = { feat: GateableFeat; source: FeatChoiceSource; selections?: ChoiceSelections; choiceOptionIds?: readonly number[] };

// Категорія перевіряється першою: на кроці походження неповторюваність вторинна.
export function findFeatPackageProblem(picks: readonly FeatPick[], alreadyTaken: readonly FeatInstance[] = []): string | null {
  const wrongCategory = picks.find((pick) => !isFeatCategoryAllowed(pick.source, pick.feat.category));
  if (wrongCategory) return describeCategoryProblem(wrongCategory);

  const repeat = findFeatRepeatProblemInBatch(picks.map(toRepeatCandidate), alreadyTaken);
  return repeat ? describeRepeatProblem(repeat) : null;
}

export function toFeatInstance(persFeat: { feat: { name: string }; choices: readonly { choiceOption: { groupName: string; optionNameEng: string } | null }[] }): FeatInstance {
  return {
    featName: persFeat.feat.name,
    choices: persFeat.choices.flatMap((choice) => (choice.choiceOption ? [choice.choiceOption] : [])),
  };
}

export function collectChoiceOptionIds(selections: ChoiceSelections): number[] {
  return Object.values(selections ?? {})
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => Number(value))
    .filter((choiceOptionId) => Number.isFinite(choiceOptionId) && choiceOptionId > 0);
}

function toRepeatCandidate(pick: FeatPick): FeatRepeatCandidate {
  const chosenIds = new Set(pick.choiceOptionIds ?? collectChoiceOptionIds(pick.selections));
  const choices: FeatChoicePick[] = pick.feat.featChoiceOptions.flatMap((option) =>
    chosenIds.has(option.choiceOptionId) && option.choiceOption ? [option.choiceOption] : [],
  );
  return { name: pick.feat.name, isRepeatable: pick.feat.isRepeatable, choices };
}

function describeRepeatProblem(problem: FeatRepeatProblem): string {
  const featName = translateValue(problem.featName);
  if (problem.kind === "not-repeatable") return `Рису «${featName}» можна взяти лише раз.`;
  return `«${featName}» удруге береться лише з іншим вибором «${problem.groupName}»: ${problem.optionNameEng} уже є.`;
}

function describeCategoryProblem(pick: FeatPick): string {
  return `Рису «${translateValue(pick.feat.name)}» не можна взяти на цьому кроці: тут дозволена лише ${describeSource(pick.source)}.`;
}

function describeSource(source: FeatChoiceSource): string {
  switch (source) {
    case "BACKGROUND_ORIGIN":
    case "SPECIES_VERSATILITY":
      return "риса походження";
    case "FIGHTING_STYLE":
      return "риса бойового стилю";
    case "CLASS_ASI":
      return "будь-яка риса";
  }
}

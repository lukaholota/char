import { extractFlexibleGroups, plainAsiChoiceGroups } from "./abilities";

export type RacialAbilityMode = "basic" | "tasha";

export type RacialChoiceGroupSource = {
  isDefaultASI: boolean;
  raceASI: unknown;
  variantASI?: unknown;
  subraceASI?: unknown;
  subraceReplacesASI: boolean;
};

export type RacialChoiceGroup = { value: number; choiceCount: number; unique: boolean };

export type RacialAbilityChoice<Ability extends string = string> = { groupIndex: number; choiceCount: number; selectedAbilities: Ability[] };

export function findRacialAbilityMode(isDefaultASI: boolean): RacialAbilityMode {
  return isDefaultASI ? "basic" : "tasha";
}

export function findEffectiveRacialASI(source: Pick<RacialChoiceGroupSource, "raceASI" | "variantASI" | "subraceASI" | "subraceReplacesASI">): unknown {
  return source.variantASI ?? (source.subraceReplacesASI ? source.subraceASI : source.raceASI);
}

export function listRacialChoiceGroups(source: RacialChoiceGroupSource): unknown[] {
  const effectiveASI = findEffectiveRacialASI(source);
  const raceGroups = extractFlexibleGroups(effectiveASI, findRacialAbilityMode(source.isDefaultASI));
  const fallbackGroups = raceGroups.length === 0 ? plainAsiChoiceGroups(effectiveASI) : [];
  const subraceGroups = !source.isDefaultASI && !source.subraceReplacesASI ? plainAsiChoiceGroups(source.subraceASI) : [];
  return [...raceGroups, ...fallbackGroups, ...subraceGroups];
}

export function readRacialChoiceGroup(group: unknown): RacialChoiceGroup {
  const record = typeof group === "object" && group !== null ? (group as Record<string, unknown>) : {};
  return { value: Number(record.value) || 1, choiceCount: Number(record.choiceCount) || 0, unique: record.unique === true };
}

export function countRacialChoices(groups: readonly unknown[]): number {
  return groups.reduce<number>((count, group) => count + readRacialChoiceGroup(group).choiceCount, 0);
}

export function splitRacialAbilityChoices<Ability extends string>(groups: readonly unknown[], selectedAbilities: readonly Ability[]): RacialAbilityChoice<Ability>[] {
  let offset = 0;
  return groups.map((group, groupIndex) => {
    const { choiceCount } = readRacialChoiceGroup(group);
    const choice = { groupIndex, choiceCount, selectedAbilities: selectedAbilities.slice(offset, offset + choiceCount) };
    offset += choiceCount;
    return choice;
  });
}

export function findRacialAbilityChoiceProblem(groups: readonly unknown[], selectedAbilities: readonly string[], mode: RacialAbilityMode): string | null {
  const expected = countRacialChoices(groups);
  if (selectedAbilities.length !== expected) return `Раса дає вибір ${expected} підвищень характеристик, а в пресеті ${selectedAbilities.length}`;
  const choices = splitRacialAbilityChoices(groups, selectedAbilities);
  const repeatedInGroup = choices.find((choice) => new Set(choice.selectedAbilities).size !== choice.selectedAbilities.length);
  if (repeatedInGroup) return `Група ${repeatedInGroup.groupIndex + 1} повторює характеристику: ${repeatedInGroup.selectedAbilities.join(", ")}`;
  if (mode === "basic" && new Set(selectedAbilities).size !== selectedAbilities.length) return `Підвищення містять повтор: ${selectedAbilities.join(", ")}`;
  const isEveryGroupUnique = groups.length > 1 && groups.every((group) => readRacialChoiceGroup(group).unique);
  if (mode === "tasha" && isEveryGroupUnique && new Set(selectedAbilities).size !== selectedAbilities.length) return `Групи цієї раси не дозволяють повторів між собою: ${selectedAbilities.join(", ")}`;
  return null;
}

export function findRacialChoiceSelectionProblem(groups: readonly unknown[], choices: readonly Pick<RacialAbilityChoice, "groupIndex" | "selectedAbilities">[]): string | null {
  const seenGroups = new Set<number>();
  for (const choice of choices) {
    if (!Number.isInteger(choice.groupIndex) || choice.groupIndex < 0 || choice.groupIndex >= groups.length) return "Раса не дає такої групи расових бонусів";
    if (seenGroups.has(choice.groupIndex)) return "Групу расових бонусів обрано двічі";
    seenGroups.add(choice.groupIndex);

    const { choiceCount } = readRacialChoiceGroup(groups[choice.groupIndex]);
    if (choice.selectedAbilities.length !== choiceCount) return `Оберіть рівно ${choiceCount} характеристик у групі расових бонусів`;
    if (new Set(choice.selectedAbilities).size !== choice.selectedAbilities.length) return "Не можна підвищити ту саму характеристику двічі в одній групі";
  }

  const isEveryGroupUnique = groups.length > 1 && groups.every((group) => readRacialChoiceGroup(group).unique);
  const selected = choices.flatMap((choice) => choice.selectedAbilities);
  if (isEveryGroupUnique && new Set(selected).size !== selected.length) return "Групи цієї раси не дозволяють підвищити ту саму характеристику двічі";
  return null;
}

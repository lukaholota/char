import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import {
  findRacialChoiceSelectionProblem,
  findRacialChoiceStepProblem,
  keepFittingRacialChoices,
  listOfferedRacialChoiceGroups,
  listRacialChoiceGroups,
  readRacialChoiceGroup,
  type RacialChoiceGroupSource,
} from "@/rules/racial-ability-choices";

const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const races = findCharacterCreationOptions("RULES_2014").races;

type Origin = { label: string; source: Omit<RacialChoiceGroupSource, "isDefaultASI"> };

function listOrigins(race: (typeof races)[number]): Origin[] {
  return [
    { label: race.name, source: { raceASI: race.ASI, subraceReplacesASI: false } },
    ...(race.subraces ?? []).map((subrace) => ({
      label: `${race.name} / ${subrace.name}`,
      source: { raceASI: race.ASI, subraceASI: subrace.additionalASI, subraceReplacesASI: Boolean(subrace.replacesASI) },
    })),
    ...(race.raceVariants ?? []).map((variant) => ({
      label: `${race.name} / ${variant.name}`,
      source: { raceASI: race.ASI, variantASI: variant.overridesRaceASI ?? undefined, subraceReplacesASI: false },
    })),
  ];
}

function fillAsCreator(groups: readonly unknown[]) {
  let offset = 0;
  return groups.map((group, groupIndex) => {
    const { choiceCount } = readRacialChoiceGroup(group);
    const selectedAbilities = ABILITIES.slice(offset, offset + choiceCount);
    offset = (offset + choiceCount) % ABILITIES.length;
    return { groupIndex, choiceCount, selectedAbilities };
  });
}

const cases = races.flatMap(listOrigins).flatMap((origin) =>
  [true, false].map((isDefaultASI) => [`${origin.label} · ${isDefaultASI ? "basic" : "tasha"}`, { ...origin.source, isDefaultASI }] as const));

describe("крок характеристик 2014 пускає далі лише вибір, який приймає сервер", () => {
  it.each(cases)("%s", (_label, source) => {
    const offered = listOfferedRacialChoiceGroups(source);
    const choices = fillAsCreator(offered);
    expect(findRacialChoiceStepProblem(offered, choices)).toBeNull();
    expect(findRacialChoiceSelectionProblem(listRacialChoiceGroups(source), choices)).toBeNull();
  });
});

describe("вибір для попередньої підраси чи варіанту не доходить до сервера", () => {
  const originPairs = races.flatMap((race) => {
    const origins = listOrigins(race);
    return origins.flatMap((from) => origins.filter((to) => to !== from).flatMap((to) =>
      [true, false].map((isDefaultASI) => [`${from.label} → ${to.label} · ${isDefaultASI ? "basic" : "tasha"}`, { ...from.source, isDefaultASI }, { ...to.source, isDefaultASI }] as const)));
  });

  it.each(originPairs)("%s", (_label, from, to) => {
    const offered = listOfferedRacialChoiceGroups(to);
    const kept = keepFittingRacialChoices(offered, fillAsCreator(listOfferedRacialChoiceGroups(from)));
    const serverProblem = findRacialChoiceSelectionProblem(listRacialChoiceGroups(to), kept);
    if (serverProblem) expect(findRacialChoiceStepProblem(offered, kept)).not.toBeNull();
    expect(kept.every((choice) => choice.choiceCount === readRacialChoiceGroup(offered[choice.groupIndex]).choiceCount)).toBe(true);
  });

  it("людина в режимі Таші → варіант людини: шість старих бонусів скинуто, крок просить обрати два", () => {
    const human = races.find((race) => race.name === "HUMAN_2014")!;
    const variant = human.raceVariants!.find((entry) => entry.name === "HUMAN_VARIANT")!;
    const humanChoices = fillAsCreator(listOfferedRacialChoiceGroups({ isDefaultASI: false, raceASI: human.ASI, subraceReplacesASI: false }));
    const variantGroups = listOfferedRacialChoiceGroups({ isDefaultASI: false, raceASI: human.ASI, variantASI: variant.overridesRaceASI, subraceReplacesASI: false });

    expect(humanChoices[0].selectedAbilities).toHaveLength(6);
    expect(keepFittingRacialChoices(variantGroups, humanChoices)).toEqual([]);
    expect(findRacialChoiceStepProblem(variantGroups, humanChoices)).not.toBeNull();
    expect(findRacialChoiceStepProblem(variantGroups, [])).toBe("Розподіліть усі расові бонуси.");
  });
});

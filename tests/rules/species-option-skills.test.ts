import { describe, expect, it } from "vitest";
import { Skills } from "@prisma/client";
import { findSkillsGrantedByChosenOption } from "@/rules/proficiency";

const ALL_SKILLS = Object.values(Skills);

describe("навички від обраної опції виду", () => {
  it("«Гострі чуття: Аналіз поведінки» 2024 дає саме цю навичку", () => {
    expect(findSkillsGrantedByChosenOption({ options: ["INSIGHT"], choiceCount: 1 }, ALL_SKILLS)).toEqual(["INSIGHT"]);
  });

  it("«дві будь-які» 2014 навичок не вигадує — їх називає крок «Навички»", () => {
    expect(findSkillsGrantedByChosenOption({ options: ["ANY", "ANY"], choiceCount: 2 }, ALL_SKILLS)).toEqual([]);
  });

  it("вибір одного з кількох варіантів сам навички не дає", () => {
    expect(findSkillsGrantedByChosenOption({ options: ["INSIGHT", "PERCEPTION"], choiceCount: 1 }, ALL_SKILLS)).toEqual([]);
  });

  it("масив — фіксовані навички", () => {
    expect(findSkillsGrantedByChosenOption(["PERCEPTION"], ALL_SKILLS)).toEqual(["PERCEPTION"]);
  });

  it("порожнє значення — нічого", () => {
    expect(findSkillsGrantedByChosenOption(null, ALL_SKILLS)).toEqual([]);
  });
});

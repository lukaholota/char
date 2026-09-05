import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildGrantedAbilityScoreIncrease,
  findAbilityIncreaseOptions,
  findFeatPrerequisites,
} from "../../prisma/seed/helpers/featMechanics2024";

type Feat2024 = {
  engName: string;
  category: string;
  prerequisite?: string | null;
  benefitsEng?: Array<{ name?: string | null; description?: string | null }> | null;
};

const feats: Feat2024[] = JSON.parse(
  readFileSync(join(process.cwd(), "data/2024/normalized/feats.json"), "utf-8"),
);

const findFeat = (engName: string): Feat2024 => {
  const feat = feats.find((candidate) => candidate.engName === engName);
  if (!feat) throw new Error(`Риси "${engName}" немає в data/2024/normalized/feats.json`);
  return feat;
};

describe("передумови рис 2024 читаються з прози джерела", () => {
  it("Grappler: 4-й рівень і Сила або Спритність 13", () => {
    expect(findFeatPrerequisites(findFeat("Grappler").prerequisite)).toEqual({
      level: 4,
      abilityScore: { STR: 13, DEX: 13, or: true },
      proficiency: null,
      spellcasting: false,
    });
  });

  it("Actor: одна характеристика без «або»", () => {
    expect(findFeatPrerequisites(findFeat("Actor").prerequisite).abilityScore).toEqual({ CHA: 13 });
  });

  it("Heavy Armor Master: володіння важким обладунком", () => {
    expect(findFeatPrerequisites(findFeat("Heavy Armor Master").prerequisite).proficiency).toEqual({
      armor: ["HEAVY"],
    });
  });

  it("War Caster: передумова-заклинання, а не характеристика", () => {
    expect(findFeatPrerequisites(findFeat("War Caster").prerequisite)).toMatchObject({
      level: 4,
      abilityScore: null,
      spellcasting: true,
    });
  });

  it("риси походження передумов не мають", () => {
    const originPrerequisites = feats
      .filter((feat) => feat.category === "ORIGIN")
      .map((feat) => findFeatPrerequisites(feat.prerequisite));

    expect(originPrerequisites.every((prerequisite) => prerequisite.level === null)).toBe(true);
  });

  it("епічні дари відкриваються на 19-му рівні — усі дванадцять", () => {
    const epicLevels = feats
      .filter((feat) => feat.category === "EPIC_BOON")
      .map((feat) => findFeatPrerequisites(feat.prerequisite).level);

    expect(epicLevels).toEqual(Array(12).fill(19));
  });

  it("кожна загальна риса, крім бойових стилів, несе хоч якусь передумову", () => {
    const withoutAnyPrerequisite = feats
      .filter((feat) => feat.category === "GENERAL")
      .filter((feat) => findFeatPrerequisites(feat.prerequisite).level === null)
      .map((feat) => feat.engName);

    expect(withoutAnyPrerequisite).toEqual([]);
  });
});

describe("підвищення характеристики риси 2024 читається з benefitsEng", () => {
  it("Grappler дає +1 на вибір із Сили або Спритності", () => {
    const abilities = findAbilityIncreaseOptions(findFeat("Grappler").benefitsEng);

    expect(abilities).toEqual(["STR", "DEX"]);
    expect(buildGrantedAbilityScoreIncrease(abilities)).toEqual({ STR_OR_DEX: 1 });
  });

  it("Actor дає фіксований +1 до Харизми", () => {
    expect(buildGrantedAbilityScoreIncrease(findAbilityIncreaseOptions(findFeat("Actor").benefitsEng))).toEqual({
      CHA: 1,
    });
  });

  it("вибір із будь-якої характеристики записується як ANY", () => {
    expect(
      buildGrantedAbilityScoreIncrease(findAbilityIncreaseOptions(findFeat("Skill Expert").benefitsEng)),
    ).toEqual({ ANY: 1 });
  });

  it("риса без підвищення характеристики не отримує grantedASI", () => {
    expect(buildGrantedAbilityScoreIncrease(findAbilityIncreaseOptions(findFeat("Tough").benefitsEng))).toBeNull();
  });

  it("порядок характеристик завжди канонічний, а не той, у якому їх згадала книга", () => {
    expect(findAbilityIncreaseOptions(findFeat("Polearm Master").benefitsEng)).toEqual(["STR", "DEX"]);
  });
});

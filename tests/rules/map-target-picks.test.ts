import { describe, expect, it } from "vitest";
import { addTargetPick, countTargetPicks, groupTargetPicks, parseRollTargets, removeTargetPick, splitRollTargets, toggleUniqueTargetPick } from "@/rules/map-target-picks";

const goblin = { creatureId: 3 };
const ogre = { creatureId: 4 };
const hero = { persId: 3 };

describe("цілі на мапі", () => {
  it("одна ціль — дотик заміняє її; кілька — додає заряд, поки вони є, і в ту саму ціль теж", () => {
    expect(addTargetPick([goblin], ogre, 1)).toEqual([ogre]);
    expect(addTargetPick([goblin], goblin, 3)).toEqual([goblin, goblin]);
    expect(addTargetPick([goblin, goblin, ogre], hero, 3)).toEqual([goblin, goblin, ogre]);
  });

  it("істота й герой з однаковим id — різні цілі", () => {
    expect(countTargetPicks([goblin, hero, goblin], goblin)).toBe(2);
    expect(countTargetPicks([goblin, hero, goblin], hero)).toBe(1);
  });

  it("прибирає останній заряд цілі, а чужу ціль не чіпає", () => {
    expect(removeTargetPick([goblin, ogre, goblin], goblin)).toEqual([goblin, ogre]);
    expect(removeTargetPick([goblin], hero)).toEqual([goblin]);
  });

  it("групує в порядку вибору й ділить на істот і героїв", () => {
    expect(groupTargetPicks([ogre, goblin, ogre])).toEqual([{ target: ogre, count: 2 }, { target: goblin, count: 1 }]);
    expect(splitRollTargets([goblin, hero, ogre])).toEqual({ creatureIds: [3, 4], persIds: [3] });
  });

  it("ціль «Благословення» одна на істоту: дотик знімає обрану, понад ліміт нікого не додає", () => {
    expect(toggleUniqueTargetPick([goblin], goblin, 3)).toEqual([]);
    expect(toggleUniqueTargetPick([goblin], hero, 3)).toEqual([goblin, hero]);
    expect(toggleUniqueTargetPick([goblin, ogre, hero], { creatureId: 9 }, 3)).toEqual([goblin, ogre, hero]);
  });

  it("цілі з клієнта: списки додатних цілих, без повторів, від однієї до ліміту", () => {
    expect(parseRollTargets({ creatureIds: [3, 3, 4], persIds: [5] }, 3)).toEqual({ creatureIds: [3, 4], persIds: [5] });
    expect(parseRollTargets({ creatureIds: [], persIds: [] }, 3)).toBeNull();
    expect(parseRollTargets({ creatureIds: [1, 2, 3], persIds: [4] }, 3)).toBeNull();
    expect(parseRollTargets({ creatureIds: [1.5], persIds: [] }, 3)).toBeNull();
    expect(parseRollTargets({ creatureIds: ["1"], persIds: [] }, 3)).toBeNull();
    expect(parseRollTargets({ creatureIds: [1] }, 3)).toBeNull();
    expect(parseRollTargets(null, 3)).toBeNull();
  });
});

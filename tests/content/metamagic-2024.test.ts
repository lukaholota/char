import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import metamagic from "../../data/2024/normalized/metamagic.json";
import { CHOICE_GROUPS, getChoicePoolRule } from "@/lib/logic/choicePoolRules";

it("метамагія 2024 містить кожну опцію SRD з книжковою вартістю", () => {
  const srd = readFileSync("data/2024/srd/classes.md", "utf8").split("### Metamagic Options")[1].split("### Sorcerer Spell List")[0];
  const expected = [...srd.matchAll(/#### (.+)\n\n_Cost: (\d+) Sorcery Points?_/g)]
    .map(match => ({ engName: match[1], cost: Number(match[2]) }));
  expect(expected).toHaveLength(10);
  expect(metamagic.options.map(({ engName, cost }) => ({ engName, cost }))).toEqual(expected);
  const rule = getChoicePoolRule({ scope: "class", groupName: CHOICE_GROUPS.SORCERER_METAMAGIC, className: metamagic.className });
  expect(metamagic.levelsGranted).toEqual([2, 10, 17]);
  expect(metamagic.levelsGranted.map(level => rule?.picksAtLevel(level))).toEqual([2, 2, 2]);
});

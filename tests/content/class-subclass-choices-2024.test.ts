import { describe, expect, it } from "vitest";
import classChoices from "../../data/2024/normalized/class-choices.json";
import subclassChoices from "../../data/2024/normalized/subclass-choices.json";
import invocations from "../../data/2024/normalized/invocations.json";
import { getChoicePoolRule } from "@/lib/logic/choicePoolRules";

describe("class and subclass choices 2024", () => {
  it("matches every artifact quota to the runtime rule at levels 1–20", () => {
    for (const [scope, groups] of [["class", classChoices.groups], ["subclass", subclassChoices.groups]] as const) {
      for (const group of groups) {
        const rule = getChoicePoolRule({
          scope,
          groupName: group.groupName,
          ...(scope === "class" ? { className: group.className } : { subclassName: group.subclassName }),
        });
        expect(rule, `${scope}: ${group.groupName}`).toBeDefined();
        for (let level = 1; level <= 20; level += 1) {
          expect(rule?.picksAtLevel(level), `${scope}: ${group.groupName}, level ${level}`)
            .toBe(Number(group.picksAtLevel[String(level) as keyof typeof group.picksAtLevel] ?? 0));
        }
      }
    }
  });

  it("contains the exact current PHB option counts for required subclasses", () => {
    const counts = Object.fromEntries(subclassChoices.groups.map((group) => [group.groupName, group.options.length]));
    expect(counts).toMatchObject({
      "Коло землі": 4,
      "Здобич мисливця": 2,
      "Захисна тактика": 2,
      "Стихійна спорідненість": 5,
      "Маневри майстра бою": 20,
    });
  });

  it("keeps armor conditional on Protector and Warden", () => {
    const options = classChoices.groups.flatMap((group) => group.options);
    expect(options.find((option) => option.engName === "Divine Order: Protector")?.armorProficiencies).toEqual(["HEAVY"]);
    expect(options.find((option) => option.engName === "Primal Order: Warden")?.armorProficiencies).toEqual(["MEDIUM"]);
  });

  it("contains every invocation required by another invocation", () => {
    const names = new Set(invocations.map((invocation) => invocation.engName));
    for (const invocation of invocations) {
      if (invocation.prerequisite?.includes("Thirsting Blade")) expect(names.has("Thirsting Blade")).toBe(true);
    }
  });
});

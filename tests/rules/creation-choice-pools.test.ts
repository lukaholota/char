import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCreationChoicePoolProblem, findCreationGroupPickCounts } from "@/rules/creation-choice-pools";

type CatalogClass = {
  name: string;
  classChoiceOptions?: { choiceOptionId: number; levelsGranted?: number[]; choiceOption: { groupName: string } }[];
};

const classes2024: CatalogClass[] = JSON.parse(readFileSync("src/lib/generated/creator-content-2024.json", "utf8")).classes;

function selectAsCreatorRequires(cls: CatalogClass): Record<string, number[]> {
  const levelOneOptions = (cls.classChoiceOptions ?? []).filter((opt) => opt.levelsGranted?.includes(1));
  const groupNames = [...new Set(levelOneOptions.map((opt) => opt.choiceOption.groupName))];
  const pickCounts = findCreationGroupPickCounts(cls.name, groupNames);
  return Object.fromEntries(groupNames.map((groupName) => {
    const ids = levelOneOptions.filter((opt) => opt.choiceOption.groupName === groupName).map((opt) => opt.choiceOptionId);
    return [groupName, ids.slice(0, Math.max(1, pickCounts[groupName]))];
  }));
}

describe("конструктор 2024 вимагає стільки класових опцій, скільки приймає сервер", () => {
  it.each(classes2024.map((cls) => [cls.name, cls] as const))("%s", (_name, cls) => {
    const selections = selectAsCreatorRequires(cls);
    expect(findCreationChoicePoolProblem({
      ruleset: "RULES_2024",
      className: cls.name,
      selections,
      available: (cls.classChoiceOptions ?? []).map((opt) => ({ choiceOptionId: opt.choiceOptionId, groupName: opt.choiceOption.groupName })),
    })).toBeNull();
  });

  it("пропущену групу сервер приймає, а неповну — ні", () => {
    const bard = classes2024.find((cls) => cls.name === "BARD_2024")!;
    const available = (bard.classChoiceOptions ?? []).map((opt) => ({ choiceOptionId: opt.choiceOptionId, groupName: opt.choiceOption.groupName }));
    const toolId = available.find((opt) => opt.groupName === "Класові інструменти")!.choiceOptionId;
    expect(findCreationChoicePoolProblem({ ruleset: "RULES_2024", className: "BARD_2024", selections: {}, available })).toBeNull();
    expect(findCreationChoicePoolProblem({ ruleset: "RULES_2024", className: "BARD_2024", selections: { "Класові інструменти": [toolId] }, available })).toBe("«Класові інструменти»: оберіть 3 опц.");
  });

  it("Бард обирає три музичні інструменти", () => {
    const bard = classes2024.find((cls) => cls.name === "BARD_2024")!;
    expect(selectAsCreatorRequires(bard)["Класові інструменти"]).toHaveLength(3);
  });
});

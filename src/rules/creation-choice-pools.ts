import {
  baseChoiceGroupName,
  picksAtLevelForGroup,
} from "@/lib/logic/choicePoolRules";

type Selections = Record<string, number | number[]>;

type AvailableChoice = {
  choiceOptionId: number;
  groupName: string;
};

type CreationChoicePoolInput = {
  ruleset: "RULES_2014" | "RULES_2024";
  className: string;
  selections: Selections;
  available: AvailableChoice[];
};

function groupSelectedIds(selections: Selections): Map<string, number[]> {
  const grouped = new Map<string, number[]>();
  for (const [groupName, raw] of Object.entries(selections)) {
    const baseGroup = baseChoiceGroupName(groupName);
    const ids = Array.isArray(raw) ? raw : [raw];
    if (!ids.length) continue;
    grouped.set(baseGroup, [...(grouped.get(baseGroup) ?? []), ...ids]);
  }
  return grouped;
}

function groupAllowedIds(available: AvailableChoice[]): Map<string, Set<number>> {
  const grouped = new Map<string, Set<number>>();
  for (const option of available) {
    const baseGroup = baseChoiceGroupName(option.groupName);
    const ids = grouped.get(baseGroup) ?? new Set<number>();
    ids.add(option.choiceOptionId);
    grouped.set(baseGroup, ids);
  }
  return grouped;
}

export function findCreationChoicePoolProblem(input: CreationChoicePoolInput): string | null {
  if (input.ruleset !== "RULES_2024") return null;

  const selectedByGroup = groupSelectedIds(input.selections);
  const allowedByGroup = groupAllowedIds(input.available);
  const allAllowedIds = new Set(input.available.map((option) => option.choiceOptionId));

  for (const ids of selectedByGroup.values()) {
    if (ids.some((id) => !allAllowedIds.has(id))) {
      return "Обрана опція недоступна на цьому рівні";
    }
  }

  for (const groupName of selectedByGroup.keys()) {
    if (!allowedByGroup.has(groupName)) return "Обрана опція не з тієї групи";
  }

  for (const [groupName, allowedIds] of allowedByGroup) {
    const selected = selectedByGroup.get(groupName) ?? [];
    if (new Set(selected).size !== selected.length) {
      return "Опції в групі мають бути різними";
    }
    if (selected.some((id) => !allowedIds.has(id))) {
      return "Обрана опція не з тієї групи";
    }

    const expected = picksAtLevelForGroup({
      scope: "class",
      className: input.className,
      groupName,
      levelAfter: 1,
    });
    if (selected.length !== expected) return `Оберіть ${expected} опц.`;
  }

  return null;
}

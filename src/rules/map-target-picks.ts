export type RollTargetRef = { creatureId: number } | { persId: number };
export type RollTargets = { creatureIds: number[]; persIds: number[] };
export type TargetPickGroup = { target: RollTargetRef; count: number };

export const isSameTarget = (first: RollTargetRef, second: RollTargetRef) =>
  "creatureId" in first ? "creatureId" in second && first.creatureId === second.creatureId : "persId" in second && first.persId === second.persId;

/// Одна ціль — дотик її заміняє; кілька — кожен дотик додає ще один промінь чи дротик, поки вони є.
export function addTargetPick(picks: readonly RollTargetRef[], target: RollTargetRef, maxPicks: number): RollTargetRef[] {
  if (maxPicks <= 1) return [target];
  return picks.length < maxPicks ? [...picks, target] : [...picks];
}

export function removeTargetPick(picks: readonly RollTargetRef[], target: RollTargetRef): RollTargetRef[] {
  const index = picks.findLastIndex((pick) => isSameTarget(pick, target));
  return index < 0 ? [...picks] : [...picks.slice(0, index), ...picks.slice(index + 1)];
}

export function countTargetPicks(picks: readonly RollTargetRef[], target: RollTargetRef): number {
  return picks.filter((pick) => isSameTarget(pick, target)).length;
}

/// Порядок — як обирали: перша обрана ціль отримує перший кидок.
export function groupTargetPicks(picks: readonly RollTargetRef[]): TargetPickGroup[] {
  const groups: TargetPickGroup[] = [];
  for (const pick of picks) {
    const group = groups.find((candidate) => isSameTarget(candidate.target, pick));
    if (group) group.count += 1;
    else groups.push({ target: pick, count: 1 });
  }
  return groups;
}

export function splitRollTargets(targets: readonly RollTargetRef[]): RollTargets {
  return {
    creatureIds: targets.flatMap((target) => ("creatureId" in target ? [target.creatureId] : [])),
    persIds: targets.flatMap((target) => ("persId" in target ? [target.persId] : [])),
  };
}

/// Ціль «Благословення» одна на істоту: повторний дотик знімає її, а не додає ще раз.
export function toggleUniqueTargetPick(picks: readonly RollTargetRef[], target: RollTargetRef, maxPicks: number): RollTargetRef[] {
  if (picks.some((pick) => isSameTarget(pick, target))) return removeTargetPick(picks, target);
  return picks.length < maxPicks ? [...picks, target] : [...picks];
}

const isIdList = (value: unknown): value is number[] => Array.isArray(value) && value.every((id) => Number.isInteger(id) && id > 0);

export function parseRollTargets(raw: unknown, maxTargets: number): RollTargets | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { creatureIds, persIds } = raw as Record<string, unknown>;
  if (!isIdList(creatureIds) || !isIdList(persIds)) return null;
  const targets = { creatureIds: [...new Set(creatureIds)], persIds: [...new Set(persIds)] };
  const count = targets.creatureIds.length + targets.persIds.length;
  return count >= 1 && count <= maxTargets ? targets : null;
}

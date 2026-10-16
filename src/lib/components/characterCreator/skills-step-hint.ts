import { buildPickHint, joinHints, SKILL_FORMS } from "@/lib/components/wizard/pick-hint";

export type SkillPickGroup = { chosen: number; required: number; source: string; isTakenByOtherGroups?: boolean };

const TAKEN_BY_OTHER_GROUPS_HINT = "Підходящі навички вже обрано в інших групах: зніміть одну з них там.";

export function findSkillsStepHint(groups: readonly SkillPickGroup[]): string | null {
  return joinHints(groups.map(buildSkillGroupHint));
}

function buildSkillGroupHint(group: SkillPickGroup): string | null {
  const hint = buildPickHint(group.chosen, group.required, SKILL_FORMS, group.source);
  const isBlockedByOtherGroups = group.isTakenByOtherGroups === true && group.chosen < group.required;
  return hint && isBlockedByOtherGroups ? `${hint} ${TAKEN_BY_OTHER_GROUPS_HINT}` : hint;
}

import { buildPickHint, joinHints, SKILL_FORMS } from "@/lib/components/wizard/pick-hint";

export type SkillPickGroup = { chosen: number; required: number; source: string };

export function findSkillsStepHint(groups: readonly SkillPickGroup[]): string | null {
  return joinHints(groups.map((group) => buildPickHint(group.chosen, group.required, SKILL_FORMS, group.source)));
}

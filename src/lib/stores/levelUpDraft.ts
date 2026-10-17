import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { GuidedLevelUp } from "@/lib/optimization/guided-level-up";

export type LevelUpDraft = {
  base: string;
  stepId: string | null;
  guide: { signature: string; manualFormData: Partial<PersFormData> } | null;
};

type DraftClass = { classId: number; classLevel: number; subclassId: number | null };
export type LevelUpDraftPers = { level: number; classId: number; subclassId: number | null; multiclasses?: readonly DraftClass[] };

export function buildLevelUpDraftBase(pers: LevelUpDraftPers): string {
  const multiclasses = (pers.multiclasses ?? []).map((entry) => `${entry.classId}:${entry.classLevel}:${entry.subclassId ?? "-"}`).sort();
  return [`level ${pers.level}`, `${pers.classId}:${pers.subclassId ?? "-"}`, ...multiclasses].join("|");
}

export function findGuideSignature(guide: GuidedLevelUp | null): string | null {
  return guide?.status === "ready" ? JSON.stringify(guide.input) : null;
}

export function startLevelUpDraft(base: string): LevelUpDraft {
  return { base, stepId: null, guide: null };
}

export type RestorableLevelUpDraft = { draft: LevelUpDraft; manualFormData: Partial<PersFormData> | null };

export function findRestorableLevelUpDraft(stored: LevelUpDraft | null | undefined, base: string, guideSignature: string | null): RestorableLevelUpDraft | null {
  if (!stored || stored.base !== base) return null;
  if (stored.guide && stored.guide.signature !== guideSignature) return { draft: { ...stored, guide: null }, manualFormData: stored.guide.manualFormData };
  return { draft: stored, manualFormData: null };
}

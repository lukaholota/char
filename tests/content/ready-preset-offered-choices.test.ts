import { describe, expect, it, vi } from "vitest";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { ReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import { listSavedPresetIssues } from "@/lib/optimization/ready-preset-validation";
import { listOfferedStepChanges, presetSlugs, readPreset, type StepChange } from "../helpers/preset-step-changes";

vi.mock("server-only", () => ({}));

/// Кожен варіант, який крок пресета показує гравцеві, має проходити фінальну перевірку створення.
/// Інакше гравець бачить на кроці галочку, а на «Імʼя» — блок, як Адам із мовою Ґітська.

function findRejectedChanges(draft: PersFormData, options: ReadyPresetOptions): string[] {
  const changes: StepChange[] = [{ label: "без змін", draft }, ...Object.values(listOfferedStepChanges(draft, options)).flat()];
  return changes.flatMap(({ label, draft: changed, downstream = [] }) => {
    const issues = listSavedPresetIssues(changed, draft, options).filter((issue) => !downstream.includes(issue.step!));
    return issues.length ? [`${label} → ${issues.map((issue) => issue.message).join("; ")}`] : [];
  });
}

describe("every choice a ready preset step offers is accepted at creation", () => {
  it.each(presetSlugs)("%s", (slug) => {
    const { draft, options } = readPreset(slug);
    expect(findRejectedChanges(draft, options).slice(0, 8)).toEqual([]);
  });
});

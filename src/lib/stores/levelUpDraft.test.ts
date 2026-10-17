import { describe, expect, it } from "vitest";
import { parseLevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import type { GuidedLevelUp } from "@/lib/optimization/guided-level-up";
import { buildLevelUpDraftBase, findGuideSignature, findRestorableLevelUpDraft, startLevelUpDraft, type LevelUpDraft } from "./levelUpDraft";

const bard = { level: 4, classId: 2, subclassId: 7, multiclasses: [] };
const base = buildLevelUpDraftBase(bard);
const guide = { signature: "guide-a", manualFormData: { classId: 2 } };
const stored: LevelUpDraft = { base, stepId: "skills", guide };

describe("level-up draft base", () => {
  it("is the same for the same level and classes, whatever the multiclass order", () => {
    const first = buildLevelUpDraftBase({ ...bard, multiclasses: [{ classId: 9, classLevel: 1, subclassId: null }, { classId: 5, classLevel: 2, subclassId: 3 }] });
    const second = buildLevelUpDraftBase({ ...bard, multiclasses: [{ classId: 5, classLevel: 2, subclassId: 3 }, { classId: 9, classLevel: 1, subclassId: null }] });

    expect(first).toBe(second);
  });

  it("changes with the level, the subclass and the class levels", () => {
    expect(buildLevelUpDraftBase({ ...bard, level: 5 })).not.toBe(base);
    expect(buildLevelUpDraftBase({ ...bard, subclassId: null })).not.toBe(base);
    expect(buildLevelUpDraftBase({ ...bard, multiclasses: [{ classId: 9, classLevel: 1, subclassId: null }] })).not.toBe(base);
  });
});

describe("restoring a level-up draft", () => {
  it("restores the draft of the same character state with its step and guide", () => {
    expect(findRestorableLevelUpDraft(stored, base, "guide-a")).toEqual({ draft: stored, manualFormData: null });
  });

  it("drops a draft made on another level or class layout", () => {
    expect(findRestorableLevelUpDraft(stored, buildLevelUpDraftBase({ ...bard, level: 5 }), "guide-a")).toBeNull();
    expect(findRestorableLevelUpDraft(stored, buildLevelUpDraftBase({ ...bard, subclassId: 8 }), "guide-a")).toBeNull();
  });

  it("drops a missing or old-shaped draft", () => {
    expect(findRestorableLevelUpDraft(null, base, null)).toBeNull();
    expect(findRestorableLevelUpDraft({ owner: "x", stepId: "skills" } as unknown as LevelUpDraft, base, null)).toBeNull();
  });

  it("brings back the manual choices and forgets the applied guide when the guide changed", () => {
    const restored = { draft: { base, stepId: "skills", guide: null }, manualFormData: { classId: 2 } };
    expect(findRestorableLevelUpDraft(stored, base, "guide-b")).toEqual(restored);
    expect(findRestorableLevelUpDraft(stored, base, null)).toEqual(restored);
  });

  it("restores a manual draft without touching its form", () => {
    expect(findRestorableLevelUpDraft({ ...stored, guide: null }, base, "guide-b")).toEqual({ draft: { ...stored, guide: null }, manualFormData: null });
  });

  it("starts empty", () => {
    expect(startLevelUpDraft(base)).toEqual({ base, stepId: null, guide: null });
  });
});

describe("guide signature", () => {
  const input = parseLevelUpInput({ levelUpPath: "EXISTING", classId: 2 });
  const ready: GuidedLevelUp = { status: "ready", build: { title: "Бард", href: "/x" }, nextLevel: 5, classLabel: "Бард", classLevel: 5, input, picks: [], skipped: [], open: [] };

  it("follows what the guide would fill", () => {
    expect(findGuideSignature(ready)).toBe(findGuideSignature({ ...ready, picks: ["інший підпис"] }));
    expect(findGuideSignature(ready)).not.toBe(findGuideSignature({ ...ready, input: { ...input, classId: 3 } }));
  });

  it("is absent without a ready guide", () => {
    expect(findGuideSignature(null)).toBeNull();
    expect(findGuideSignature({ status: "unavailable", build: null, reason: "немає" })).toBeNull();
  });
});

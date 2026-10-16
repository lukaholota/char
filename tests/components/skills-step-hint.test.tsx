import { describe, expect, it } from "vitest";

import { findSkillsStepHint } from "@/lib/components/characterCreator/skills-step-hint";

describe("hint of the skills step", () => {
  it("names the group that still waits for a pick", () => {
    expect(findSkillsStepHint([{ chosen: 0, required: 1, source: "підкласу" }])).toBe("Оберіть ще 1 навичку підкласу.");
  });

  it("says where to free a skill when other groups took every option of the group", () => {
    expect(findSkillsStepHint([{ chosen: 0, required: 1, source: "підкласу", isTakenByOtherGroups: true }]))
      .toBe("Оберіть ще 1 навичку підкласу. Підходящі навички вже обрано в інших групах: зніміть одну з них там.");
  });

  it("stays silent once every group is spent", () => {
    expect(findSkillsStepHint([
      { chosen: 2, required: 2, source: "класу" },
      { chosen: 1, required: 1, source: "підкласу", isTakenByOtherGroups: true },
    ])).toBeNull();
  });

  it("joins the hints of several unfinished groups", () => {
    expect(findSkillsStepHint([
      { chosen: 1, required: 2, source: "класу" },
      { chosen: 0, required: 1, source: "підкласу" },
    ])).toBe("Оберіть ще 1 навичку класу. Оберіть ще 1 навичку підкласу.");
  });
});

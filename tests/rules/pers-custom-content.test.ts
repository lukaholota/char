import { describe, expect, it } from "vitest";

import { findUsesRemainingAfterEdit, readCustomFeatureDraft, readCustomSkillDraft, restoreCustomFeatures } from "@/rules/pers-custom-content";

const skill = { name: "  Флірт ", ability: "CHA", proficiencyType: "PROFICIENT", bonus: "" };
const feature = { name: "Подих", description: "", rollFormula: "", usesMax: "", restoredOn: "" };

describe("власна навичка", () => {
  it("прибирає пробіли, а порожній бонус вважає нулем", () => {
    expect(readCustomSkillDraft(skill)).toEqual({ ok: true, input: { name: "Флірт", ability: "CHA", proficiencyType: "PROFICIENT", bonus: 0 } });
  });

  it("приймає типографський мінус у бонусі", () => {
    expect(readCustomSkillDraft({ ...skill, bonus: "−2" })).toMatchObject({ ok: true, input: { bonus: -2 } });
  });

  it.each([
    [{ name: "   " }, "name"],
    [{ name: "я".repeat(61) }, "name"],
    [{ ability: "LUCK" }, "ability"],
    [{ proficiencyType: "MASTER" }, "proficiencyType"],
    [{ bonus: "31" }, "bonus"],
    [{ bonus: "1.5" }, "bonus"],
    [{ bonus: "два" }, "bonus"],
  ])("відхиляє %j", (patch, field) => {
    const reading = readCustomSkillDraft({ ...skill, ...patch });
    expect(reading.ok).toBe(false);
    expect(reading).toHaveProperty(["errors", field]);
  });

  it("не падає на чернетці неправильної форми", () => {
    expect(readCustomSkillDraft(null).ok).toBe(false);
    expect(readCustomSkillDraft({ name: 5, ability: [] }).ok).toBe(false);
  });
});

describe("власна здібність або ресурс", () => {
  it("здібність без формули й використань зберігає порожні значення", () => {
    expect(readCustomFeatureDraft(feature)).toEqual({ ok: true, input: { name: "Подих", description: "", rollFormula: null, usesMax: null, restoredOn: null } });
  });

  it("ресурс зберігає кількість і відпочинок", () => {
    expect(readCustomFeatureDraft({ ...feature, usesMax: "3", restoredOn: "SHORT_REST" })).toMatchObject({ ok: true, input: { usesMax: 3, restoredOn: "SHORT_REST" } });
  });

  it("без кількості відпочинок не зберігається", () => {
    expect(readCustomFeatureDraft({ ...feature, restoredOn: "LONG_REST" })).toMatchObject({ ok: true, input: { restoredOn: null } });
  });

  it("повідомляє про помилку у формулі", () => {
    const reading = readCustomFeatureDraft({ ...feature, rollFormula: "1к7" });
    expect(reading).toMatchObject({ ok: false, errors: { rollFormula: expect.stringContaining("к7") } });
  });

  it.each([
    [{ name: "" }, "name"],
    [{ description: "я".repeat(4001) }, "description"],
    [{ rollFormula: "1к6+".repeat(60) }, "rollFormula"],
    [{ usesMax: "0" }, "usesMax"],
    [{ usesMax: "1000" }, "usesMax"],
    [{ usesMax: "3", restoredOn: "DAY" }, "restoredOn"],
  ])("відхиляє %j", (patch, field) => {
    expect(readCustomFeatureDraft({ ...feature, ...patch })).toHaveProperty(["errors", field]);
  });
});

describe("залишок використань після редагування", () => {
  it("новий ресурс починається повним", () => {
    expect(findUsesRemainingAfterEdit(null, 4)).toBe(4);
    expect(findUsesRemainingAfterEdit({ usesMax: null, usesRemaining: null }, 4)).toBe(4);
  });

  it("більший максимум додає різницю", () => {
    expect(findUsesRemainingAfterEdit({ usesMax: 3, usesRemaining: 1 }, 5)).toBe(3);
  });

  it("менший максимум обрізає лише надлишок", () => {
    expect(findUsesRemainingAfterEdit({ usesMax: 5, usesRemaining: 4 }, 2)).toBe(2);
    expect(findUsesRemainingAfterEdit({ usesMax: 5, usesRemaining: 1 }, 2)).toBe(1);
  });

  it("без максимуму залишку немає", () => {
    expect(findUsesRemainingAfterEdit({ usesMax: 5, usesRemaining: 1 }, null)).toBeNull();
  });
});

describe("відпочинок", () => {
  const features = [
    { id: 1, usesMax: 3, usesRemaining: 0, restoredOn: "SHORT_REST" },
    { id: 2, usesMax: 3, usesRemaining: 0, restoredOn: "LONG_REST" },
    { id: 3, usesMax: 3, usesRemaining: 0, restoredOn: null },
    { id: 4, usesMax: null, usesRemaining: null, restoredOn: null },
  ];

  it("короткий відновлює лише короткі", () => {
    expect(restoreCustomFeatures(features, "SHORT_REST").map((feature) => feature.usesRemaining)).toEqual([3, 0, 0, null]);
  });

  it("довгий відновлює короткі й довгі, а ручні не чіпає", () => {
    expect(restoreCustomFeatures(features, "LONG_REST").map((feature) => feature.usesRemaining)).toEqual([3, 3, 0, null]);
  });
});

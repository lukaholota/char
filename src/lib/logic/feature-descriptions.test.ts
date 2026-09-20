import { describe, expect, it } from "vitest";
import { buildEditableDescription, findCustomDescription, isFeatureDescriptionKind, readCustomDescriptionInput } from "./feature-descriptions";

describe("власний опис фічі", () => {
  const stored = [
    { kind: "FEATURE", refId: 7, description: "Мій шал" },
    { kind: "FEAT", refId: 7, description: "Моя риса" },
  ];

  it("шукає за типом і id разом: фіча й риса з однаковим id — різні записи", () => {
    expect(findCustomDescription(stored, { kind: "FEATURE", refId: 7 })).toBe("Мій шал");
    expect(findCustomDescription(stored, { kind: "FEAT", refId: 7 })).toBe("Моя риса");
    expect(findCustomDescription(stored, { kind: "INFUSION", refId: 7 })).toBeNull();
  });

  it("порожній текст повертає оригінал, задовгий відхиляється, решта обрізається по краях", () => {
    expect(readCustomDescriptionInput("   \n ")).toEqual({ action: "RESET" });
    expect(readCustomDescriptionInput("  Текст\r\nдругий рядок ")).toEqual({ action: "SAVE", description: "Текст\nдругий рядок" });
    expect(readCustomDescriptionInput("а".repeat(10_001))).toMatchObject({ action: "INVALID" });
  });

  it("оригінал для правки — без посилань і маркерів оригіналу, власний опис — як є", () => {
    const original = 'Ціль стає <a href="/rules/conditions#condition-paralyzed">паралізованою</a>, шкода променевої{{radiant}}';
    expect(buildEditableDescription(original, false)).toBe("Ціль стає паралізованою, шкода променевої");
    expect(buildEditableDescription("<b>моє</b>", true)).toBe("<b>моє</b>");
  });

  it("приймає лише три типи цілей", () => {
    expect(isFeatureDescriptionKind("FEAT")).toBe(true);
    expect(isFeatureDescriptionKind("SPELL")).toBe(false);
  });
});

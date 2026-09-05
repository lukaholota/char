import { describe, expect, it } from "vitest";
import { checkInvocationPrerequisite, findFirstUnmetInvocationPrerequisite } from "@/rules/warlock-invocations";

describe("KR18.8 — передумови потойбічних викликів", () => {
  describe("checkInvocationPrerequisite", () => {
    it("без передумов — завжди задоволено", () => {
      expect(checkInvocationPrerequisite({}, { classLevel: 1, knownOptionNameEngs: new Set() })).toEqual({
        met: true,
      });
    });

    it("рівень нижче вимоги — не задоволено", () => {
      // Ascendant Step, 2014: «Рівень 5+». Персонаж 4-го рівня класу ще не бачить виклик.
      const result = checkInvocationPrerequisite(
        { level: 5 },
        { classLevel: 4, knownOptionNameEngs: new Set() },
      );
      expect(result).toEqual({ met: false, reason: "level" });
    });

    it("рівень дорівнює вимозі — задоволено", () => {
      const result = checkInvocationPrerequisite(
        { level: 5 },
        { classLevel: 5, knownOptionNameEngs: new Set() },
      );
      expect(result).toEqual({ met: true });
    });

    it("потрібен пакт, якого немає в наборі — не задоволено", () => {
      // Eldritch Smite вимагає Pact of the Blade.
      const result = checkInvocationPrerequisite(
        { pact: "Pact of the Blade" },
        { classLevel: 5, knownOptionNameEngs: new Set(["Pact of the Tome"]) },
      );
      expect(result).toEqual({ met: false, reason: "pact" });
    });

    it("потрібен пакт, який є в наборі — задоволено", () => {
      const result = checkInvocationPrerequisite(
        { pact: "Pact of the Blade" },
        { classLevel: 5, knownOptionNameEngs: new Set(["Pact of the Blade"]) },
      );
      expect(result).toEqual({ met: true });
    });

    it("рівень і пакт одночасно — обидва мають виконатись", () => {
      // Devouring Blade 2024: рівень 12+ і Pact of the Blade.
      const failsOnLevel = checkInvocationPrerequisite(
        { level: 12, pact: "Pact of the Blade" },
        { classLevel: 9, knownOptionNameEngs: new Set(["Pact of the Blade"]) },
      );
      expect(failsOnLevel).toEqual({ met: false, reason: "level" });

      const failsOnPact = checkInvocationPrerequisite(
        { level: 12, pact: "Pact of the Blade" },
        { classLevel: 12, knownOptionNameEngs: new Set() },
      );
      expect(failsOnPact).toEqual({ met: false, reason: "pact" });

      const meetsBoth = checkInvocationPrerequisite(
        { level: 12, pact: "Pact of the Blade" },
        { classLevel: 12, knownOptionNameEngs: new Set(["Pact of the Blade"]) },
      );
      expect(meetsBoth).toEqual({ met: true });
    });
  });

  describe("findFirstUnmetInvocationPrerequisite", () => {
    it("порожній пакет — усе задоволено", () => {
      expect(
        findFirstUnmetInvocationPrerequisite({
          classLevel: 1,
          knownOptionNameEngs: new Set(),
          selectedInvocations: [],
        }),
      ).toBeNull();
    });

    it("виклик у тому самому пакеті задовольняє передумову іншого виклику з цього пакета", () => {
      // 2024, рівень 2: обираються одразу Pact of the Blade і Eldritch Smite (не потребує 5+,
      // тут перевіряємо лише пакт) в одному підвищенні.
      const result = findFirstUnmetInvocationPrerequisite({
        classLevel: 2,
        knownOptionNameEngs: new Set(),
        selectedInvocations: [
          { optionNameEng: "Pact of the Blade", prerequisite: {} },
          { optionNameEng: "Eldritch Smite", prerequisite: { pact: "Pact of the Blade" } },
        ],
      });
      expect(result).toBeNull();
    });

    it("виклик вимагає пакт, якого немає ні раніше, ні в цьому пакеті — помилка", () => {
      const result = findFirstUnmetInvocationPrerequisite({
        classLevel: 9,
        knownOptionNameEngs: new Set(),
        selectedInvocations: [{ optionNameEng: "Lifedrinker", prerequisite: { level: 9, pact: "Pact of the Blade" } }],
      });
      expect(result).toEqual({ optionNameEng: "Lifedrinker", reason: "pact" });
    });

    it("вже відомий раніше пакт (не з цього пакета) задовольняє нову передумову", () => {
      const result = findFirstUnmetInvocationPrerequisite({
        classLevel: 9,
        knownOptionNameEngs: new Set(["Pact of the Blade"]),
        selectedInvocations: [{ optionNameEng: "Lifedrinker", prerequisite: { level: 9, pact: "Pact of the Blade" } }],
      });
      expect(result).toBeNull();
    });

    it("перший непройдений виклик у порядку пакета зупиняє перевірку", () => {
      const result = findFirstUnmetInvocationPrerequisite({
        classLevel: 1,
        knownOptionNameEngs: new Set(),
        selectedInvocations: [
          { optionNameEng: "Ascendant Step", prerequisite: { level: 5 } },
          { optionNameEng: "Otherworldly Leap", prerequisite: { level: 2 } },
        ],
      });
      expect(result).toEqual({ optionNameEng: "Ascendant Step", reason: "level" });
    });
  });
});

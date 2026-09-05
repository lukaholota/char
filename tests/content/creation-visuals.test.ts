import { describe, it, expect } from "vitest";
import {
  getRaceVisual,
  getClassVisual,
  getClassHitDie,
  getClassPrimaryStats,
} from "@/components/characterCreator/creation-visuals";

describe("KR8.4 — Creation Visuals & Card Presets", () => {
  describe("getRaceVisual", () => {
    it("returns thematic visual for Elf", () => {
      const visual = getRaceVisual("ELF_2014");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-teal-950");
      expect(visual.badgeClass).toContain("border-teal-700");
      expect(visual.imageSrc).toBe("/images/races/elf.webp");
    });

    it("returns thematic visual for Dragonborn", () => {
      const visual = getRaceVisual("DRAGONBORN_2014");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-amber-950");
      expect(visual.imageSrc).toBe("/images/races/dragonborn.webp");
    });

    it("returns thematic visual for Tiefling", () => {
      const visual = getRaceVisual("TIEFLING_2014");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-rose-950");
      expect(visual.imageSrc).toBe("/images/races/tiefling.webp");
    });

    it("returns thematic visual for Fairy", () => {
      const visual = getRaceVisual("FAIRY_MPMM");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-pink-950");
      expect(visual.imageSrc).toBe("/images/races/fairy.webp");
    });

    it("returns thematic visual for Hobgoblin", () => {
      const visual = getRaceVisual("HOBGOBLIN_MPMM");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-red-950");
      expect(visual.imageSrc).toBe("/images/races/hobgoblin.webp");
    });

    it("returns thematic visual for Custom Lineage", () => {
      const visual = getRaceVisual("CUSTOM_LINEAGE_TCE");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-violet-950");
      expect(visual.imageSrc).toBe("/images/races/custom_lineage.webp");
    });

    it("returns specific visual for chromatic dragonborn", () => {
      const visual = getRaceVisual("DRAGONBORN_CHROMATIC");
      expect(visual).toBeDefined();
      expect(visual.imageSrc).toBe("/images/races/dragonborn_chromatic.webp");
    });

    it("returns default fallback for unknown race", () => {
      const visual = getRaceVisual("UNKNOWN_CUSTOM_RACE");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-slate-900");
      expect(visual.imageSrc).toBeNull();
    });
  });

  describe("getClassVisual", () => {
    it("returns thematic visual for Barbarian", () => {
      const visual = getClassVisual("BARBARIAN_2014");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-rose-950");
      expect(visual.imageSrc).toBe("/images/classes/barbarian.webp");
    });

    it("returns thematic visual for Wizard", () => {
      const visual = getClassVisual("WIZARD_2014");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-sky-950");
      expect(visual.imageSrc).toBe("/images/classes/wizard.webp");
    });

    it("returns thematic visual for Druid", () => {
      const visual = getClassVisual("DRUID_2014");
      expect(visual).toBeDefined();
      expect(visual.bgGradient).toContain("from-emerald-950");
      expect(visual.imageSrc).toBe("/images/classes/druid.webp");
    });
  });

  describe("getClassHitDie & getClassPrimaryStats", () => {
    it("returns correct hit dice for classes", () => {
      expect(getClassHitDie("BARBARIAN_2014")).toBe("к12");
      expect(getClassHitDie("FIGHTER_2014")).toBe("к10");
      expect(getClassHitDie("PALADIN_2014")).toBe("к10");
      expect(getClassHitDie("CLERIC_2014")).toBe("к8");
      expect(getClassHitDie("ROGUE_2014")).toBe("к8");
      expect(getClassHitDie("WIZARD_2014")).toBe("к6");
      expect(getClassHitDie("SORCERER_2014")).toBe("к6");
    });

    it("returns primary ability statistics summary", () => {
      expect(getClassPrimaryStats("BARBARIAN_2014")).toBe("СИЛ • СТА");
      expect(getClassPrimaryStats("WIZARD_2014")).toBe("ІНТ • СТА");
      expect(getClassPrimaryStats("BARD_2014")).toBe("ХАР • СПР");
    });
  });
});

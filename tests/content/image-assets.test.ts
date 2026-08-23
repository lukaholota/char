import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getRaceImagePath,
  getClassImagePath,
  getCategoryImagePath,
  CATEGORY_IMAGE_MAP,
} from "@/lib/assets/image-manifest";
import { getRaceVisual, getClassVisual } from "@/components/characterCreator/creation-visuals";
import {
  raceTranslations,
  classTranslations,
} from "@/lib/refs/translation";

const publicDir = path.resolve(process.cwd(), "public");

function assetExists(publicRelativePath: string | null | undefined): boolean {
  if (!publicRelativePath) return false;
  // publicRelativePath starts with '/' (e.g. '/images/races/elf.webp')
  const cleanPath = publicRelativePath.startsWith("/")
    ? publicRelativePath.slice(1)
    : publicRelativePath;
  const fullPath = path.join(publicDir, cleanPath);
  return fs.existsSync(fullPath);
}

describe("Image Assets & Manifest Verification", () => {
  describe("Category Image Assets", () => {
    it("all category images in CATEGORY_IMAGE_MAP exist in public/images/categories/", () => {
      for (const [key, imagePath] of Object.entries(CATEGORY_IMAGE_MAP)) {
        expect(
          assetExists(imagePath),
          `Category image for '${key}' at '${imagePath}' should exist on disk`
        ).toBe(true);
      }
    });

    it("getCategoryImagePath resolves valid existing images for standard keywords", () => {
      const categories = [
        "CHARACTERS",
        "SPELLS",
        "MAGIC_ITEMS",
        "WEAPONS",
        "ARMOR",
        "INVOCATIONS",
        "FEATS",
        "BESTIARY",
        "SPECIES",
      ];

      for (const cat of categories) {
        const p = getCategoryImagePath(cat);
        expect(p).toBeTruthy();
        expect(assetExists(p), `Path '${p}' for category '${cat}' should exist`).toBe(true);
      }
    });
  });

  describe("Class Image Assets", () => {
    it("all 13 base classes (both 2014 and 2024 enum keys) resolve to existing images", () => {
      const baseClasses = [
        "ARTIFICER",
        "BARBARIAN",
        "BARD",
        "CLERIC",
        "DRUID",
        "FIGHTER",
        "MONK",
        "PALADIN",
        "RANGER",
        "ROGUE",
        "SORCERER",
        "WARLOCK",
        "WIZARD",
      ];

      for (const cls of baseClasses) {
        // Base name
        const p1 = getClassImagePath(cls);
        expect(assetExists(p1), `Class image for '${cls}' should exist on disk (${p1})`).toBe(true);

        // 2014 enum
        const p2014 = getClassImagePath(`${cls}_2014`);
        expect(assetExists(p2014), `Class image for '${cls}_2014' should exist on disk (${p2014})`).toBe(true);

        // 2024 enum
        const p2024 = getClassImagePath(`${cls}_2024`);
        expect(assetExists(p2024), `Class image for '${cls}_2024' should exist on disk (${p2024})`).toBe(true);
      }
    });

    it("all classes registered in classTranslations resolve to existing images", () => {
      for (const classKey of Object.keys(classTranslations)) {
        const imagePath = getClassImagePath(classKey);
        expect(
          assetExists(imagePath),
          `Class '${classKey}' should resolve to an existing image on disk (${imagePath})`
        ).toBe(true);
      }
    });

    it("getClassVisual returns imageSrc alongside visual tokens", () => {
      const visual = getClassVisual("WIZARD_2014");
      expect(visual.imageSrc).toBe("/images/classes/wizard.webp");
      expect(visual.icon).toBeDefined();
      expect(visual.bgGradient).toBeDefined();
      expect(visual.glowColor).toBeDefined();
    });

    it("getClassImagePath returns null safely for unknown or empty input", () => {
      expect(getClassImagePath(null)).toBeNull();
      expect(getClassImagePath(undefined)).toBeNull();
      expect(getClassImagePath("UNKNOWN_CLASS_XYZ")).toBeNull();
    });
  });

  describe("Race & Species Image Assets", () => {
    it("all 2024 species resolve to existing images", () => {
      const species2024 = [
        "AASIMAR_2024",
        "DRAGONBORN_2024",
        "DWARF_2024",
        "ELF_2024",
        "GNOME_2024",
        "GOLIATH_2024",
        "HALFLING_2024",
        "HUMAN_2024",
        "ORC_2024",
        "TIEFLING_2024",
      ];

      for (const sp of species2024) {
        const imagePath = getRaceImagePath(sp);
        expect(
          assetExists(imagePath),
          `Species '${sp}' must resolve to existing image on disk (${imagePath})`
        ).toBe(true);
      }
    });

    it("all 2014 core races resolve to existing images", () => {
      const core2014 = [
        "DRAGONBORN_2014",
        "DWARF_2014",
        "ELF_2014",
        "GNOME_2014",
        "HALF_ELF_2014",
        "HALF_ORC_2014",
        "HALFLING_2014",
        "HUMAN_2014",
        "TIEFLING_2014",
      ];

      for (const r of core2014) {
        const imagePath = getRaceImagePath(r);
        expect(
          assetExists(imagePath),
          `Race '${r}' must resolve to existing image on disk (${imagePath})`
        ).toBe(true);
      }
    });

    it("supplement and MPMM races resolve to existing images", () => {
      const supplementRaces = [
        "AARAKOCRA_MPMM",
        "AASIMAR_MPMM",
        "BUGBEAR_MPMM",
        "CENTAUR_GGTR",
        "CHANGELING_MPMM",
        "DEEP_GNOME_MPMM",
        "DUERGAR_MPMM",
        "ELADRIN_MPMM",
        "FAIRY_MPMM",
        "FIRBOLG_MPMM",
        "GENASI_AIR_MPMM",
        "GENASI_EARTH_MPMM",
        "GENASI_FIRE_MPMM",
        "GENASI_WATER_MPMM",
        "GITHYANKI_MPMM",
        "GITHZERAI_MPMM",
        "GOBLIN_MPMM",
        "GOLIATH_MPMM",
        "HARENGON_MPMM",
        "HOBGOBLIN_MPMM",
        "KENKU_MPMM",
        "KOBOLD_MPMM",
        "LEONIN_MOOT",
        "LIZARDFOLK_MPMM",
        "LOXODON_GGTR",
        "MINOTAUR_GGTR",
        "OWLIN_SACOC",
        "PLASMOID_SPELLJAMMER",
        "SATYR_MOOT",
        "SEA_ELF_MPMM",
        "SHADAR_KAI_MPMM",
        "SHIFTER_MPMM",
        "SIMIC_HYBRID_GGTR",
        "TABAXI_MPMM",
        "THRI_KREEN_SPELLJAMMER",
        "TORTLE_MPMM",
        "TRITON_MPMM",
        "VEDALKEN_GGTR",
        "VERDAN_AI",
        "WARFORGED_EBERRON",
        "YUAN_TI_MPMM",
      ];

      for (const r of supplementRaces) {
        const imagePath = getRaceImagePath(r);
        expect(
          assetExists(imagePath),
          `Supplement race '${r}' should resolve to existing image on disk (${imagePath})`
        ).toBe(true);
      }
    });

    it("all races registered in raceTranslations resolve without error", () => {
      for (const raceKey of Object.keys(raceTranslations)) {
        const imagePath = getRaceImagePath(raceKey);
        if (imagePath) {
          expect(
            assetExists(imagePath),
            `Race '${raceKey}' mapped to '${imagePath}', which should exist on disk`
          ).toBe(true);
        }
      }
    });

    it("getRaceVisual includes imageSrc and handles fallback gracefully", () => {
      const elfVisual = getRaceVisual("ELF_2024");
      expect(elfVisual.imageSrc).toBe("/images/races/elf.webp");
      expect(elfVisual.icon).toBeDefined();

      const customLineageVisual = getRaceVisual("CUSTOM_LINEAGE_TCE");
      expect(customLineageVisual.imageSrc).toBeNull();
      expect(customLineageVisual.icon).toBeDefined();
      expect(customLineageVisual.bgGradient).toBeDefined();
    });

    it("getRaceImagePath returns null safely for empty or unknown inputs", () => {
      expect(getRaceImagePath(null)).toBeNull();
      expect(getRaceImagePath(undefined)).toBeNull();
      expect(getRaceImagePath("TOTALLY_UNKNOWN_RACE_12345")).toBeNull();
    });
  });
});

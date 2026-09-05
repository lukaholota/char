import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getRaceImagePath,
  getClassImagePath,
  getCategoryImagePath,
  getBackgroundImagePath,
  CATEGORY_IMAGE_MAP,
} from "@/lib/assets/image-manifest";
import { getAllBackgrounds } from "@/lib/backgroundsData";
import { RULE_CATEGORIES } from "@/lib/rulesData";
import { collectHomeCategories } from "@/components/home/homeCategories";
import { getRaceVisual, getClassVisual } from "@/components/characterCreator/creation-visuals";
import {
  raceTranslations,
  classTranslations,
} from "@/lib/refs/translation";

const publicDir = path.resolve(process.cwd(), "public");

/// Усі ілюстрації проєкту — lossy webp (чанк `VP8 `), тож розмір лежить на сталому зсуві:
/// 12 байтів RIFF + 8 заголовка чанка + 3 теґ + 3 стартовий код, далі ширина й висота по 14 біт.
function readWebpSize(publicRelativePath: string): { width: number; height: number } {
  const buffer = fs.readFileSync(path.join(publicDir, publicRelativePath.replace(/^\//, "")));
  if (buffer.subarray(12, 16).toString("ascii") !== "VP8 ") {
    throw new Error(`${publicRelativePath}: очікувався lossy webp`);
  }
  return {
    width: buffer.readUInt16LE(26) & 0x3fff,
    height: buffer.readUInt16LE(28) & 0x3fff,
  };
}

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

  describe("Background Image Assets", () => {
    it("every background of both editions resolves to an image on disk", () => {
      const missing: string[] = [];

      for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
        for (const background of getAllBackgrounds(ruleset)) {
          if (!assetExists(background.imageSrc)) {
            missing.push(`${ruleset} ${background.key} -> ${background.imageSrc}`);
          }
        }
      }

      expect(missing).toEqual([]);
    });

    /// «Власна» малюється абстрактно, як `races/custom_lineage.webp` — фігура, що ще не склалась.
    it("gives CUSTOM its own abstract art", () => {
      const custom = getAllBackgrounds("RULES_2014").find((b) => b.key === "CUSTOM");
      expect(custom?.imageSrc).toBe("/images/backgrounds/custom.webp");
    });

    /// Рішення власника 2026-09-01: двох походжень з однією картинкою в наборі не буває.
    it("gives every background inside one edition its own file", () => {
      for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
        const byPath = new Map<string, string[]>();
        for (const background of getAllBackgrounds(ruleset)) {
          const path = String(background.imageSrc);
          byPath.set(path, [...(byPath.get(path) ?? []), background.key]);
        }
        const shared = [...byPath.entries()].filter(([, keys]) => keys.length > 1);
        expect(shared, `${ruleset}: одна картинка на кілька походжень`).toEqual([]);
      }
    });

    it("keeps the pairs the owner asked to split apart", () => {
      for (const [a, b] of [
        ["SPY", "CRIMINAL"],
        ["GLADIATOR", "ENTERTAINER"],
        ["KNIGHT", "NOBLE"],
        ["PIRATE", "SAILOR"],
        ["CITY_WATCH", "GUARD"],
        ["CLOISTERED_SCHOLAR", "SAGE"],
        ["GUILD_ARTISAN", "ARTISAN"],
        ["GUILD_MERCHANT", "MERCHANT"],
      ]) {
        expect(getBackgroundImagePath(a), `${a} і ${b}`).not.toBe(getBackgroundImagePath(b));
      }
    });

    it("returns null safely for unknown or empty input", () => {
      expect(getBackgroundImagePath(null)).toBeNull();
      expect(getBackgroundImagePath(undefined)).toBeNull();
      expect(getBackgroundImagePath("NO_SUCH_BACKGROUND_XYZ")).toBeNull();
    });
  });

  describe("Rules Reference Image Assets", () => {
    it("gives every rules section its own image on disk", () => {
      const missing = RULE_CATEGORIES.filter((category) => !assetExists(category.imageSrc));
      expect(missing.map((c) => `${c.key} -> ${c.imageSrc}`)).toEqual([]);
    });

    /// Розділи правил колись позичали плитки з `categories/`, і «Пригоди» показували ту саму
    /// картинку, що плитка «Раси» на головній. Тепер у кожного свій файл під `/images/rules/`.
    it("keeps rules art out of the category tiles and unique per section", () => {
      const paths = RULE_CATEGORIES.map((category) => category.imageSrc);
      expect(new Set(paths).size).toBe(paths.length);
      for (const src of paths) {
        expect(src, "розділ правил позичає плитку категорії").toMatch(/^\/images\/rules\//);
      }
    });
  });

  /// Плитка головної вертикальна, картка каталогу — широка. Файл не того відношення не ламає
  /// збірку: його просто обрізає, і саме так «Раси» й «Класи» місяцями показували ту саму
  /// вузьку смугу однієї зали (виміряно 2026-09-01).
  describe("Aspect ratios", () => {
    it("keeps every home tile vertical 3:4", () => {
      const wrong: string[] = [];
      for (const category of collectHomeCategories("2014")) {
        if (category.tier !== "tile") continue;
        const { width, height } = readWebpSize(category.imageSrc);
        if (Math.abs(width / height - 0.75) > 0.02) {
          wrong.push(`${category.imageSrc} = ${width}x${height}`);
        }
      }
      expect(wrong).toEqual([]);
    });

    /// Обкладинка героя малюється в 2:3 через `object-cover`, тож квадрат втрачає по 17% з
    /// кожного боку. `characters` — відомий залишок: він досі квадратний і чекає на перегенерацію.
    /// Список має порожніти, а не рости.
    it("keeps every home hero cover at 2:3", () => {
      const AWAITING_REGENERATION = new Set(["characters"]);
      const wrong: string[] = [];

      for (const category of collectHomeCategories("2014")) {
        if (category.tier !== "hero" || AWAITING_REGENERATION.has(category.slug)) continue;
        const { width, height } = readWebpSize(category.imageSrc);
        if (Math.abs(width / height - 2 / 3) > 0.02) {
          wrong.push(`${category.imageSrc} = ${width}x${height}`);
        }
      }

      expect(wrong).toEqual([]);
    });

    it("keeps every rules illustration wide 16:9", () => {
      const wrong: string[] = [];
      for (const category of RULE_CATEGORIES) {
        const { width, height } = readWebpSize(category.imageSrc);
        if (Math.abs(width / height - 16 / 9) > 0.02) {
          wrong.push(`${category.imageSrc} = ${width}x${height}`);
        }
      }
      expect(wrong).toEqual([]);
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
      expect(customLineageVisual.imageSrc).toBe("/images/races/custom_lineage.webp");
      expect(customLineageVisual.icon).toBeDefined();
      expect(customLineageVisual.bgGradient).toBeDefined();

      const unknownRaceVisual = getRaceVisual("UNKNOWN_RACE_XYZ");
      expect(unknownRaceVisual.imageSrc).toBeNull();
      expect(unknownRaceVisual.icon).toBeDefined();
      expect(unknownRaceVisual.bgGradient).toBeDefined();
    });

    it("dragonborn variants resolve to dedicated images", () => {
      expect(getRaceImagePath("DRAGONBORN_CHROMATIC")).toBe("/images/races/dragonborn_chromatic.webp");
      expect(getRaceImagePath("DRAGONBORN_METALLIC")).toBe("/images/races/dragonborn_metallic.webp");
      expect(getRaceImagePath("DRAGONBORN_GEM")).toBe("/images/races/dragonborn_gem.webp");
      expect(assetExists(getRaceImagePath("DRAGONBORN_CHROMATIC"))).toBe(true);
      expect(assetExists(getRaceImagePath("DRAGONBORN_METALLIC"))).toBe(true);
      expect(assetExists(getRaceImagePath("DRAGONBORN_GEM"))).toBe(true);
    });

    it("getRaceImagePath returns null safely for empty or unknown inputs", () => {
      expect(getRaceImagePath(null)).toBeNull();
      expect(getRaceImagePath(undefined)).toBeNull();
      expect(getRaceImagePath("TOTALLY_UNKNOWN_RACE_12345")).toBeNull();
    });
  });
});

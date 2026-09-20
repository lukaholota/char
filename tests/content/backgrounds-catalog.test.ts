import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import {
  getAllBackgrounds,
  getAllBackgroundSources,
  getBackgroundById,
  getBackgroundByIdOrSlug,
} from "@/lib/backgroundsData";
import { getBackgroundVisual } from "@/components/catalogs/catalog-visuals";
import { buildOmniSearchIndex } from "@/lib/omniSearchData";
import { generateStaticParams as generateBackgrounds2014Params } from "@/app/backgrounds/[backgroundId]/page";
import { generateStaticParams as generateBackgrounds2024Params } from "@/app/2024/backgrounds/[backgroundId]/page";
import sitemap from "@/app/sitemap";
import { Compass, Scroll } from "lucide-react";
import { backgroundTranslations } from "@/lib/refs/translation";

describe("KR13.3 — Backgrounds catalog", () => {
  describe("Completeness of both sets", () => {
    it("returns 75 backgrounds for RULES_2014 and 16 for RULES_2024", () => {
      expect(getAllBackgrounds("RULES_2014").length).toBe(75);
      expect(getAllBackgrounds("RULES_2024").length).toBe(16);
    });

    it("defaults to the 2014 edition", () => {
      expect(getAllBackgrounds()).toBe(getAllBackgrounds("RULES_2014"));
    });

    it("keeps every required field non-empty in both sets", () => {
      for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
        for (const background of getAllBackgrounds(ruleset)) {
          expect(background.name.length, `${background.engName}: name`).toBeGreaterThan(0);
          expect(background.engName.length, `${background.engName}: engName`).toBeGreaterThan(0);
          expect(background.slug.length, `${background.engName}: slug`).toBeGreaterThan(0);
          expect(background.source.length, `${background.engName}: source`).toBeGreaterThan(0);
          expect(background.description.trim().length, `${background.engName}: description`).toBeGreaterThan(30);
          expect(background.ruleset).toBe(ruleset);
        }
      }
    });

    it("translates every 2014 background name — no raw enum keys leak into the UI", () => {
      for (const background of getAllBackgrounds("RULES_2014")) {
        expect(background.name, `${background.key} is untranslated`).not.toBe(background.key);
        expect(background.name).not.toMatch(/^[A-Z_]+$/);
      }
    });

    it("gives every 2014 background either fixed skills or a skill choice", () => {
      for (const background of getAllBackgrounds("RULES_2014")) {
        const skillCount = background.skills.length + background.skillChoiceCount;
        expect(skillCount, `${background.engName} grants no skills`).toBeGreaterThan(0);
      }
    });

    it("keeps slugs unique inside each ruleset", () => {
      for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
        const slugs = getAllBackgrounds(ruleset).map((b) => b.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
      }
    });
  });

  describe("What makes the 2024 edition different", () => {
    it("gives every 2024 background three ability options, two skills and an origin feat", () => {
      for (const background of getAllBackgrounds("RULES_2024")) {
        expect(background.abilityOptions.length, `${background.engName}: abilityOptions`).toBe(3);
        expect(background.skills.length, `${background.engName}: skills`).toBe(2);
        expect(background.originFeat?.nameUa, `${background.engName}: originFeat`).toBeTruthy();
        expect(background.tools.length, `${background.engName}: tools`).toBe(1);
        expect(background.grantsGoldInstead, `${background.engName}: gold`).toBe(50);
        expect(background.equipmentItems.length, `${background.engName}: equipment`).toBeGreaterThan(0);
      }
    });

    it("names every 2024 background the way the creator and the dictionary do", () => {
      const names = backgroundTranslations as Record<string, string>;
      for (const background of getAllBackgrounds("RULES_2024")) {
        const dictionaryName = names[`${background.key}_2024`] ?? names[background.key];
        expect(background.name, background.engName).toBe(dictionaryName);
      }
    });

    it("keeps the 2014 shape out of the 2024 set and back", () => {
      for (const background of getAllBackgrounds("RULES_2024")) {
        expect(background.languagesToChooseCount).toBe(0);
        expect(background.specialAbilityName).toBeNull();
      }
      for (const background of getAllBackgrounds("RULES_2014")) {
        expect(background.abilityOptions).toEqual([]);
        expect(background.originFeat).toBeNull();
      }
    });

    it("carries the Acolyte across editions as two different records", () => {
      const acolyte2014 = getBackgroundByIdOrSlug("acolyte", "RULES_2014");
      const acolyte2024 = getBackgroundByIdOrSlug("acolyte", "RULES_2024");

      expect(acolyte2014?.name).toBe("Послушник");
      expect(acolyte2024?.name).toBe("Послушник");
      expect(acolyte2024?.originFeat?.engName).toBe("Magic Initiate (Cleric)");
    });
  });

  describe("Lookup by id, slug and name", () => {
    it("finds a 2014 background by numeric id, slug, English and Ukrainian name", () => {
      const bySlug = getBackgroundByIdOrSlug("folk-hero", "RULES_2014");
      expect(bySlug?.engName).toBe("Folk Hero");

      expect(getBackgroundById(bySlug!.backgroundId, "RULES_2014")?.slug).toBe("folk-hero");
      expect(getBackgroundByIdOrSlug(String(bySlug!.backgroundId), "RULES_2014")?.slug).toBe("folk-hero");
      expect(getBackgroundByIdOrSlug("Folk Hero", "RULES_2014")?.slug).toBe("folk-hero");
      expect(getBackgroundByIdOrSlug(bySlug!.name, "RULES_2014")?.slug).toBe("folk-hero");
      expect(getBackgroundByIdOrSlug("FOLK_HERO", "RULES_2014")?.slug).toBe("folk-hero");
    });

    it("finds a 2024 background by slug and id", () => {
      const wayfarer = getBackgroundByIdOrSlug("wayfarer", "RULES_2024");
      expect(wayfarer?.name).toBe("Мандрівник");
      expect(getBackgroundById(wayfarer!.backgroundId, "RULES_2024")?.slug).toBe("wayfarer");
    });

    it("does not leak one edition into the other", () => {
      expect(getBackgroundByIdOrSlug("farmer", "RULES_2014")).toBeUndefined();
      expect(getBackgroundByIdOrSlug("folk-hero", "RULES_2024")).toBeUndefined();
      expect(getBackgroundByIdOrSlug("", "RULES_2014")).toBeUndefined();
      expect(getBackgroundByIdOrSlug("no-such-background", "RULES_2014")).toBeUndefined();
    });

    it("lists the sources available for filtering", () => {
      expect(getAllBackgroundSources("RULES_2014")).toContain("PHB");
      expect(getAllBackgroundSources("RULES_2024")).toEqual(["PHB_2024"]);
    });
  });

  describe("Visuals", () => {
    it("separates the 2024 core book from the 2014 one", () => {
      expect(getBackgroundVisual("PHB_2024").icon).toBe(Compass);
      expect(getBackgroundVisual("PHB").icon).toBe(Scroll);
    });

    it("returns a visual for every source in use", () => {
      for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
        for (const source of getAllBackgroundSources(ruleset)) {
          const visual = getBackgroundVisual(source);
          expect(visual.icon).toBeTruthy();
          expect(visual.badgeClass.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Routing, search and sitemap", () => {
    it("prerenders both a slug and an id route for every background", async () => {
      const params2014 = await generateBackgrounds2014Params();
      expect(params2014.length).toBe(75 * 2);
      expect(params2014).toContainEqual({ backgroundId: "acolyte" });

      const params2024 = await generateBackgrounds2024Params();
      expect(params2024.length).toBe(16 * 2);
      expect(params2024).toContainEqual({ backgroundId: "wayfarer" });
    });

    it("indexes backgrounds in omni-search for both editions", () => {
      const index2014 = buildOmniSearchIndex("RULES_2014").filter((i) => i.category === "backgrounds");
      const index2024 = buildOmniSearchIndex("RULES_2024").filter((i) => i.category === "backgrounds");

      // +1 у кожній редакції — синтетичний запис категорії «Походження» (KR13.4, доповнення
      // власника 2026-08-22): аліаси «бекграунд»/«передісторія»/«історія» ведуть на сам каталог,
      // а не на конкретне походження, тож індексу потрібен один додатковий запис на редакцію.
      expect(index2014.length).toBe(75 + 1);
      expect(index2024.length).toBe(16 + 1);
      expect(index2014.every((i) => i.categoryLabel === "Походження")).toBe(true);
      expect(index2014.find((i) => i.subtitle === "Sage")?.href).toBe("/backgrounds/sage");
      expect(index2024.find((i) => i.subtitle === "Sage")?.href).toBe("/2024/backgrounds/sage");
    });

    it("lists the catalog and every 2014 background page in the sitemap", () => {
      const urls = sitemap().map((entry) => entry.url);

      expect(urls).toContain("https://char.holota.family/backgrounds");
      for (const background of getAllBackgrounds("RULES_2014")) {
        expect(urls).toContain(`https://char.holota.family/backgrounds/${background.slug}`);
      }
    });
  });
});

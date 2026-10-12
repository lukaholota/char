import { describe, expect, it, vi } from "vitest";
import { loadReadyPresetCatalog, loadReadyPresetPage, findReadyPresetSlugForBuild } from "@/lib/optimization/ready-preset.server";
import { loadBuildPage } from "@/lib/optimization/build-pages.server";
import { readSliceRecipes } from "@/lib/optimization/slice-reader";
import { isCurrentUserSiteOwner } from "@/server/db/current-user";
import { getAllClasses } from "@/lib/classesData";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/current-user", () => ({ isCurrentUserSiteOwner: vi.fn().mockResolvedValue(false) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

describe("anonymous access to 2014 RPGbot presets", () => {
  it("loads the real gallery and a complete preset without looking up an owner", async () => {
    const catalog = await loadReadyPresetCatalog();
    expect(catalog.map((entry) => entry.slug)).toContain("monk-shadow-2014");
    expect(catalog.length).toBeGreaterThanOrEqual(6);
    const preset = await loadReadyPresetPage("monk-shadow-2014");
    expect(preset.draft).toMatchObject({ ruleset: "RULES_2014", name: "" });
    expect(await findReadyPresetSlugForBuild(preset.recipe.buildId)).toBe("monk-shadow-2014");
    expect(isCurrentUserSiteOwner).not.toHaveBeenCalled();
  });

  it.each([
    ["monk-kensei-2014", "MONK_2014", 4],
    ["warlock-genie-2014", "WARLOCK_2014", 2],
    ["warlock-undying-2014", "WARLOCK_2014", 2],
  ])("shows the subclass of the multiclass preset %s with the class that owns it", async (slug, subclassClassKey, subclassCharacterLevel) => {
    const catalog = await loadReadyPresetCatalog();
    const entry = catalog.find((candidate) => candidate.slug === slug)!;
    const page = await loadReadyPresetPage(slug);
    expect(entry.subclassName).toBe(page.summary.subclassName);
    expect(entry.className).toBe(getAllClasses("RULES_2014").find((candidate) => candidate.key === subclassClassKey)!.name);
    expect(page.summary.subclassLevel).toBe(subclassCharacterLevel);
  });

  it("opens every 2014 build as a ready preset, so old build links never need the tree", async () => {
    const recipes = await readSliceRecipes("RULES_2014");
    const missing = (await Promise.all(recipes.map(async (recipe) => (await findReadyPresetSlugForBuild(recipe.buildId)) ? null : recipe.buildId))).filter(Boolean);
    expect(missing).toEqual([]);
  });

  it("keeps unknown presets and the build tree of both editions private", async () => {
    await expect(loadReadyPresetPage("not-a-preset")).rejects.toThrow("NOT_FOUND");
    await expect(loadReadyPresetPage("../monk-shadow-2014")).rejects.toThrow("NOT_FOUND");
    await expect(loadBuildPage("RULES_2024")).rejects.toThrow("NOT_FOUND");
    await expect(loadBuildPage("RULES_2014")).rejects.toThrow("NOT_FOUND");
  });
});

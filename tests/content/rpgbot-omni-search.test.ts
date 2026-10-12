import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import searchNames from "@/lib/generated/optimization-omni-search-2014.json";
import presetSearch from "@/lib/generated/optimization-preset-search-2014.json";
import sectionSearch from "@/lib/generated/optimization-section-search-2014.json";
import { buildOmniSearchIndex, findOmniSearchOutcome, isCatalogShortcut, searchOmniIndex } from "@/lib/omniSearchData";
import { buildOmniSearchPanelRows } from "@/lib/search/omniSearchPanelRows";
import { searchRpgbotSections } from "@/server/search/rpgbot-search";
import { listDraftSummaries } from "@/lib/optimization/draft-reader";
import { parseArticleDocument } from "@/lib/optimization/document";
import { buildRpgbotSearchArticles } from "@/lib/optimization/search-index-builder";
import { loadReadyPresetSearchEntries } from "@/lib/optimization/ready-preset-search-index";

vi.mock("server-only", () => ({}));

describe("KR49.6 — public 2014 RPGbot in global search", () => {
  it("has reproducible articles and section anchors for the entire public reader scope", async () => {
    const summaries = (await listDraftSummaries()).filter((article) => article.ruleset === "RULES_2014");
    const documents = await Promise.all(summaries.map(async (article) => parseArticleDocument(JSON.parse(
      await readFile(join(process.cwd(), "data/rpgbot/uk", `${article.articleId}.json`), "utf8"),
    ))));
    expect(sectionSearch).toEqual(buildRpgbotSearchArticles(documents));
    expect(searchNames).toEqual(sectionSearch.map((article) => ({ ...article,
      sections: article.sections.map(({ sectionId, title }) => ({ sectionId, title })) })));
    expect(searchNames).toHaveLength(268);
    expect(searchNames.map((article) => article.articleId).sort()).toEqual(summaries.map((article) => article.articleId).sort());
    const rows = buildOmniSearchIndex("RULES_2014").filter((row) => row.category === "rpgbot" && !isCatalogShortcut(row));
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(rows.filter((row) => !row.id.startsWith("rpgbot-preset-")).every((row) => row.href.startsWith("/rules/optimization/"))).toBe(true);
  });

  it("has a fresh index of the ready presets (regenerate: bun run generate:rpgbot-search)", async () => {
    expect(presetSearch).toEqual(await loadReadyPresetSearchEntries());
    const readyBuildFiles = (await readdir(join(process.cwd(), "data/rpgbot/ready-builds"))).filter((name) => name.endsWith(".json"));
    expect(presetSearch).toHaveLength(readyBuildFiles.length);
    expect(JSON.stringify(presetSearch).length).toBeLessThan(60_000);
  });

  it.each([["Варвар", "Barbarian"], ["Шлях тіні", "Way of Shadow"], ["Eldritch Knight", "Потойбічний лицар"]])("finds ready presets by «%s» and its pair", (first, second) => {
    for (const query of [first, second]) {
      const presets = searchOmniIndex(query, "RULES_2014", "rpgbot").filter((row) => row.id.startsWith("rpgbot-preset-"));
      expect(presets.length, query).toBeGreaterThan(0);
      expect(presets.every((row) => row.href.startsWith("/char/create?preset="))).toBe(true);
    }
  });

  it("links every preset row to its own preset page, with class and subclass in the subtitle, for 2014 only", () => {
    const rows = buildOmniSearchIndex("RULES_2014").filter((row) => row.id.startsWith("rpgbot-preset-"));
    expect(rows).toHaveLength(presetSearch.length);
    expect(rows.map((row) => row.href).sort()).toEqual(presetSearch.map((entry) => `/char/create?preset=${entry.slug}&from=search`).sort());
    expect(rows.every((row) => row.badge === "Готовий персонаж" && row.category === "rpgbot")).toBe(true);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(buildOmniSearchIndex("RULES_2024").some((row) => row.id.startsWith("rpgbot-preset-"))).toBe(false);
  });

  it("keeps the article of a class above its ready presets for the same name", () => {
    const rows = searchOmniIndex("Монах", "RULES_2014", "rpgbot");
    const firstPreset = rows.findIndex((row) => row.id.startsWith("rpgbot-preset-"));
    expect(rows.findIndex((row) => row.id.startsWith("rpgbot-article-"))).toBeLessThan(firstPreset);
  });

  it.each(["RPGbot", "Монах", "Monk", "Пройдисвіт", "спритник"])("finds articles by «%s»", (query) => {
    expect(searchOmniIndex(query, "RULES_2014", "rpgbot").some((row) => row.id.startsWith("rpgbot-article-"))).toBe(true);
  });

  it.each(["рпгб", "рпгбот", "рпг бот", "рпджібот", "пройдисвіт рпгб", "три-крін рпгбот"])("finds RPGbot rows by the Cyrillic query «%s»", (query) => {
    expect(searchOmniIndex(query, "RULES_2014", "rpgbot").some((row) => row.id.startsWith("rpgbot-article-"))).toBe(true);
  });

  it("puts the class article first for «пройдисвіт рпгб» and finds race guides by race aliases", () => {
    expect(searchOmniIndex("пройдисвіт рпгб", "RULES_2014", "rpgbot")[0].id).toBe("rpgbot-article-rpgbot-rogue-2014");
    expect(searchOmniIndex("трикрін", "RULES_2014", "rpgbot")[0].id).toBe("rpgbot-article-rpgbot-thri-kreen-2014");
  });

  it("finds the cleric class and its RPGbot guide by «жрець»", () => {
    expect(searchOmniIndex("жрець", "RULES_2014").some((row) => row.category === "classes" && row.title === "Клірик")).toBe(true);
    expect(searchOmniIndex("жрець", "RULES_2014", "rpgbot").some((row) => row.id === "rpgbot-article-rpgbot-cleric-2014")).toBe(true);
  });

  it.each(["кровомисливець", "відьмак", "мисливець крові", "кривавий мисливець", "блад хантер", "блад гантер"])("finds Blood Hunter by «%s»", (query) => {
    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      expect(searchOmniIndex(query, ruleset).some((row) => row.category === "classes" && row.title === "Кривавий мисливець"), `${ruleset} ${query}`).toBe(true);
    }
  });

  it("finds a body-only term at the exact section and passes it through the real panel pipeline", async () => {
    const query = "приголомшуючи";
    const href = "/rules/optimization/monk-2014#section-introduction";
    expect(searchOmniIndex(query, "RULES_2014", "rpgbot").some((row) => row.href === href)).toBe(false);
    const hits = await searchRpgbotSections(query, "RULES_2014");
    expect(hits.some((row) => row.href === href)).toBe(true);
    expect(hits.every((row) => !row.keywords?.includes("приголомшуючи"))).toBe(true);
    const { rows } = buildOmniSearchPanelRows({ query, ruleset: "RULES_2014", activeCategory: "rpgbot",
      personalResults: [], homebrewResults: [], rpgbotResults: hits });
    expect(rows.some((row) => row.kind === "item" && row.item.href === href)).toBe(true);
  });

  it("opens item and multiclass topics at their section anchors", () => {
    expect(searchOmniIndex("Рідкісні магічні предмети", "RULES_2014", "rpgbot")
      .some((row) => row.href === "/rules/optimization/monk-2014#section-magic-items-rare")).toBe(true);
    expect(searchOmniIndex("Монах мультикласування", "RULES_2014", "rpgbot")
      .some((row) => row.href === "/rules/optimization/monk-2014#section-multiclassing")).toBe(true);
  });

  it("keeps category quotas, accurate overflow and a single row per section", async () => {
    const query = "магія";
    const serverHits = await searchRpgbotSections(query, "RULES_2014");
    const staticHits = searchOmniIndex(query, "RULES_2014", "rpgbot");
    expect(serverHits.every((serverHit) => !staticHits.some((staticHit) => staticHit.id === serverHit.id))).toBe(true);
    const outcome = findOmniSearchOutcome(query, "RULES_2014", "ALL", serverHits);
    const filtered = findOmniSearchOutcome(query, "RULES_2014", "rpgbot", serverHits);
    const shown = outcome.items.filter((row) => row.category === "rpgbot");
    expect(shown).toHaveLength(8);
    const hidden = outcome.overflow.find((row) => row.category === "rpgbot")!.hiddenCount;
    expect(shown.length + hidden).toBe(filtered.items.length + filtered.overflow[0].hiddenCount);
    expect(new Set(filtered.items.map((row) => row.id)).size).toBe(filtered.items.length);
  });

  it("never exposes private 2024 articles or body search in the 2024 index", async () => {
    expect(buildOmniSearchIndex("RULES_2024").filter((row) => row.category === "rpgbot" && !isCatalogShortcut(row))).toEqual([]);
    expect(await searchRpgbotSections("магія", "RULES_2024")).toEqual([]);
    expect(searchNames.some((article) => article.href.startsWith("/2024"))).toBe(false);
    expect(searchNames.some((article) => article.href.includes("juggernaut"))).toBe(false);
  });

  it("keeps body data outside the client import graph and rejects oversized requests", async () => {
    const clientSource = await readFile("src/lib/search/rpgbotSearchData.ts", "utf8");
    expect(clientSource).not.toContain("optimization-section-search-2014");
    expect(JSON.stringify(searchNames).length).toBeLessThan(500_000);
    expect(searchNames.every((article) => article.sections.every((section) => !("text" in section)))).toBe(true);
    expect(await searchRpgbotSections(" ", "RULES_2014")).toEqual([]);
    expect((await searchRpgbotSections("ма", "RULES_2014")).length).toBe(50);
    await expect(searchRpgbotSections("a".repeat(513), "RULES_2014")).rejects.toThrow();
  });
});

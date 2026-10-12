import { describe, expect, it } from "vitest";
import { buildReadyPresetSearchItem, findRpgbotSearchResult } from "./rpgbotSearchData";

describe("RPGbot search results", () => {
  it("reads the result kind and id from the search item id", () => {
    expect(findRpgbotSearchResult("rpgbot-article-rpgbot-fighter-2014")).toEqual({ result_kind: "article", result_id: "rpgbot-fighter-2014" });
    expect(findRpgbotSearchResult("rpgbot-section-rpgbot-fighter-2014-champion")).toEqual({ result_kind: "section", result_id: "rpgbot-fighter-2014-champion" });
    expect(findRpgbotSearchResult("rpgbot-preset-monk-shadow-2014")).toEqual({ result_kind: "preset", result_id: "monk-shadow-2014" });
    expect(findRpgbotSearchResult("spell-12")).toBeNull();
  });

  it("opens a preset from search with the search entry mark", () => {
    const item = buildReadyPresetSearchItem({ slug: "monk-shadow-2014", title: "Монах тіні", className: "Монах", classEngName: "Monk", subclassName: "Шлях тіні", subclassEngName: "Way of Shadow", aliases: [] });
    expect(item.href).toBe("/char/create?preset=monk-shadow-2014&from=search");
  });
});

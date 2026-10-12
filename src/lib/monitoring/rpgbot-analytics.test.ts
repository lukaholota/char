// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ capturePostHogEvent: vi.fn() }));
vi.mock("@/lib/monitoring/posthog-client", () => posthog);

import { captureRpgbotEvent, startRpgbotCtaTracking } from "./rpgbot-analytics";
import {
  buildRpgbotCtaProps, findCustomizedPresetSections, findLinkKind, findPresetAbandonStage, findPresetEntry, findReachedReadDepth, findRpgbotCtaClick,
} from "./rpgbot-analytics-model";

afterEach(() => {
  posthog.capturePostHogEvent.mockClear();
  document.body.replaceChildren();
});

describe("captureRpgbotEvent", () => {
  it("marks every event with the rpgbot product area so one filter finds all of them", () => {
    captureRpgbotEvent("rpgbot_surface_viewed", { surface: "article_index", item_count: 12 });
    expect(posthog.capturePostHogEvent).toHaveBeenCalledWith("rpgbot_surface_viewed", { product_area: "rpgbot", surface: "article_index", item_count: 12 });
  });
});

describe("CTA click tracking", () => {
  function renderLink(attributes: Record<string, string>) {
    const link = document.createElement("a");
    Object.entries(attributes).forEach(([name, value]) => link.setAttribute(name, value));
    link.innerHTML = "<span>text</span>";
    document.body.append(link);
    return link;
  }

  it("reads the CTA from the closest marked ancestor", () => {
    const link = renderLink(buildRpgbotCtaProps("open_article", "subclass_analysis", "monk-open-hand"));
    expect(findRpgbotCtaClick(link.querySelector("span"))).toEqual({ cta: "open_article", surface: "subclass_analysis", ref: "monk-open-hand" });
  });

  it("ignores unknown CTA or surface names and unmarked elements", () => {
    const wrongCta = renderLink({ "data-rpgbot-cta": "buy_now", "data-rpgbot-surface": "article_index" });
    const wrongSurface = renderLink({ "data-rpgbot-cta": "open_article", "data-rpgbot-surface": "somewhere" });
    const plain = renderLink({ href: "/x" });
    expect([wrongCta, wrongSurface, plain].map(findRpgbotCtaClick)).toEqual([null, null, null]);
    expect(findRpgbotCtaClick(null)).toBeNull();
  });

  it("captures one event per click and stops after cleanup", () => {
    const stop = startRpgbotCtaTracking();
    const link = renderLink(buildRpgbotCtaProps("article_card", "article_index"));
    link.click();
    expect(posthog.capturePostHogEvent).toHaveBeenCalledTimes(1);
    expect(posthog.capturePostHogEvent).toHaveBeenCalledWith("rpgbot_cta_clicked", { product_area: "rpgbot", cta: "article_card", surface: "article_index" });
    stop();
    link.click();
    expect(posthog.capturePostHogEvent).toHaveBeenCalledTimes(1);
  });
});

describe("read depth", () => {
  it("reports each reached milestone once", () => {
    expect(findReachedReadDepth(1, 10, [])).toEqual([]);
    expect(findReachedReadDepth(3, 10, [])).toEqual([25]);
    expect(findReachedReadDepth(6, 10, [25])).toEqual([50]);
    expect(findReachedReadDepth(10, 10, [25, 50])).toEqual([75, 100]);
    expect(findReachedReadDepth(10, 10, [25, 50, 75, 100])).toEqual([]);
  });

  it("reports nothing for an article without sections", () => {
    expect(findReachedReadDepth(0, 0, [])).toEqual([]);
  });
});

describe("preset customization", () => {
  const start = { asi: [{ ability: "STR", value: 8 }], skillsSchema: { basicChoices: { race: ["STEALTH"] } }, expertiseSchema: { expertises: ["STEALTH"] } };

  it("lists only the sections the player changed", () => {
    expect(findCustomizedPresetSections(start, start)).toEqual([]);
    expect(findCustomizedPresetSections(start, { ...start, asi: [{ ability: "STR", value: 10 }] })).toEqual(["abilities"]);
    expect(findCustomizedPresetSections(start, { ...start, skillsSchema: { basicChoices: { race: ["STEALTH", "ARCANA"] } }, expertiseSchema: { expertises: [] } })).toEqual(["skills", "expertise"]);
  });

  it("also covers class and race choices, spells and higher-level choices", () => {
    const withSpells = { ...start, raceChoiceSelections: { ancestry: 3 }, classSpells: { cantripIds: [1, 2] } };
    expect(findCustomizedPresetSections(withSpells, { ...withSpells, raceChoiceSelections: { ancestry: 4 } })).toEqual(["choices"]);
    expect(findCustomizedPresetSections(withSpells, { ...withSpells, classSpells: { cantripIds: [1, 5] } })).toEqual(["spells"]);
    expect(findCustomizedPresetSections(withSpells, withSpells, true)).toEqual(["levels"]);
  });

  it("names the step where the player left", () => {
    expect(findPresetAbandonStage(2, false, null)).toBe("review");
    expect(findPresetAbandonStage(3, false, "skills")).toBe("name");
    expect(findPresetAbandonStage(5, false, "skills")).toBe("customize_skills");
    expect(findPresetAbandonStage(4, false, null)).toBe("customize_unknown");
    expect(findPresetAbandonStage(3, true, null)).toBe("submitting");
  });
});

describe("preset entry", () => {
  it("keeps known entry points and treats the rest as direct", () => {
    expect(["gallery", "suggestion", "subclass_analysis", "search"].map(findPresetEntry)).toEqual(["gallery", "suggestion", "subclass_analysis", "search"]);
    expect([undefined, null, "", "email", "GALLERY"].map(findPresetEntry)).toEqual(["direct", "direct", "direct", "direct", "direct"]);
  });
});

describe("link kinds", () => {
  it("separates the original RPGbot, other articles, our catalogs and everything else", () => {
    expect(findLinkKind("https://rpgbot.net/dnd5/characters/classes/fighter/")).toBe("original");
    expect(findLinkKind("https://www.rpgbot.net/x")).toBe("original");
    expect(findLinkKind("/weapons/longsword")).toBe("catalog");
    expect(findLinkKind("/rules/optimization/fighter-2014#start")).toBe("article");
    expect(findLinkKind("/no-ai/2024/rules/optimization/fighter-2024")).toBe("article");
    expect(findLinkKind("/optimization/build?build=x")).toBe("other");
    expect(findLinkKind("#section")).toBe("other");
    expect(findLinkKind("https://example.test/")).toBe("other");
  });

  it("marks links that open a pop-up as references, with or without the no-AI prefix", () => {
    const isReference = (href: string) => href === "/feats?feat=alert";
    expect(findLinkKind("/feats?feat=alert", isReference)).toBe("reference");
    expect(findLinkKind("/no-ai/feats?feat=alert", isReference)).toBe("reference");
    expect(findLinkKind("/feats?feat=lucky", isReference)).toBe("catalog");
  });
});

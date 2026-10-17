import { describe, expect, it } from "vitest";
import { buildPostHogPageProperties, isInternalAnalyticsEmail, stripPrivateUrlParams } from "./posthog-context";
import { stripPrivateUrls } from "./posthog-options";

describe("PostHog page grouping", () => {
  it.each(["/char/home", "/char/123/levelup", "/2024/char", "/no-ai/char/123", "/no-ai/2024/char/home", "/pers/shared-token"])("groups %s as char", (route) => {
    expect(buildPostHogPageProperties(route).page_group).toBe("char");
  });
  it.each(["/spells", "/2024/spells", "/no-ai/spells", "/no-ai/2024/spells/example"])("groups %s as spells", (route) => {
    expect(buildPostHogPageProperties(route).page_group).toBe("spells");
  });
  it.each(["/rules/optimization", "/2024/rules/optimization/fighter-2024", "/no-ai/rules/optimization/bard-2014", "/optimization/build"])("groups %s as rpgbot", (route) => {
    expect(buildPostHogPageProperties(route).page_group).toBe("rpgbot");
  });
  it("keeps other rules pages in rules", () => {
    expect(buildPostHogPageProperties("/rules/combat").page_group).toBe("rules");
    expect(buildPostHogPageProperties("/rules/optimizations-not-rpgbot").page_group).toBe("rules");
  });
  it("uses explicit character edition over the shared URL", () => {
    expect(buildPostHogPageProperties("/no-ai/char/123", "2024")).toMatchObject({ edition: "2024", no_ai: true });
  });
  it("does not match prefix lookalikes", () => {
    expect(buildPostHogPageProperties("/no-ai-other/2024")).toMatchObject({ page_group: "no-ai-other", edition: "2014", no_ai: false });
  });
  it("normalizes email case and whitespace without sharing email", () => {
    expect(isInternalAnalyticsEmail(" LUKAGOLOTA1@gmail.com ")).toBe(true);
    expect(isInternalAnalyticsEmail("QA-browser@char.holota.family", "qa-browser@char.holota.family")).toBe(true);
    expect(isInternalAnalyticsEmail(null)).toBe(false);
    expect(isInternalAnalyticsEmail("player@example.test")).toBe(false);
  });
});

describe("private URL params", () => {
  it("drops the character name and the search query, keeps the rest", () => {
    expect(stripPrivateUrlParams("https://char.holota.family/spells?origin=character&persId=12&persName=%D0%9C%D0%B8%D1%80%D0%BE%D0%BD&lvl=1")).toBe("https://char.holota.family/spells?origin=character&persId=12&lvl=1");
    expect(stripPrivateUrlParams("https://char.holota.family/char/create?preset=monk&q=%D1%82%D1%96%D0%BD%D1%8C&from=gallery#x")).toBe("https://char.holota.family/char/create?preset=monk&from=gallery#x");
    expect(stripPrivateUrlParams("https://char.holota.family/spells?query=1")).toBe("https://char.holota.family/spells?query=1");
  });

  it("leaves non-URL values as they are", () => {
    expect(stripPrivateUrlParams("$direct")).toBe("$direct");
    expect(stripPrivateUrlParams("not a url q=1")).toBe("not a url q=1");
  });

  it("cleans every URL property an event carries", () => {
    const properties: Record<string, unknown> = { $current_url: "https://a.test/x?q=secret", $referrer: "https://a.test/y?persName=Ann", $session_entry_url: "https://a.test/?q=1&b=2", other: "q=keep" };
    stripPrivateUrls(properties);
    expect(properties).toEqual({ $current_url: "https://a.test/x", $referrer: "https://a.test/y", $session_entry_url: "https://a.test/?b=2", other: "q=keep" });
  });
});

describe("PostHog draft link privacy", () => {
  it("drops the carried draft from page, referrer and first-touch addresses", () => {
    const properties: Record<string, unknown> = {
      $current_url: "https://char.holota.family/char/create?entry_source=telegram#draft=SECRET",
      $referrer: "https://char.holota.family/char/create#draft=SECRET",
      $initial_person_info: { u: "https://char.holota.family/char/create#draft=SECRET", r: "$direct" },
    };
    stripPrivateUrls(properties);
    expect(JSON.stringify(properties)).not.toContain("draft=");
    expect(properties.$current_url).toBe("https://char.holota.family/char/create?entry_source=telegram");
    expect(properties.$initial_person_info).toEqual({ u: "https://char.holota.family/char/create", r: "$direct" });
  });
});

import { describe, expect, it } from "vitest";
import { buildPostHogPageProperties, isInternalAnalyticsEmail } from "./posthog-context";

describe("PostHog page grouping", () => {
  it.each(["/char/home", "/char/123/levelup", "/2024/char", "/no-ai/char/123", "/no-ai/2024/char/home", "/pers/shared-token"])("groups %s as char", (route) => {
    expect(buildPostHogPageProperties(route).page_group).toBe("char");
  });
  it.each(["/spells", "/2024/spells", "/no-ai/spells", "/no-ai/2024/spells/example"])("groups %s as spells", (route) => {
    expect(buildPostHogPageProperties(route).page_group).toBe("spells");
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

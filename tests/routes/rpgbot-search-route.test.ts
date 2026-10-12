import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/rpgbot/route";
import { rpgbotSearchHitsSchema } from "@/lib/search/rpgbot-search-schema";

vi.mock("server-only", () => ({}));

describe("anonymous RPGbot section search", () => {
  it("returns an exact 2014 body section without login or database access", async () => {
    const response = await GET(new Request("http://local/api/search/rpgbot?q=приголомшуючи"));
    expect(response.status).toBe(200);
    const hits = rpgbotSearchHitsSchema.parse(await response.json());
    expect(hits.some((hit) => hit.href === "/rules/optimization/monk-2014#section-introduction")).toBe(true);
  });

  it("keeps the private 2024 corpus unavailable", async () => {
    const response = await GET(new Request("http://local/api/search/rpgbot?q=магія&ruleset=RULES_2024"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it.each(["q=" + "a".repeat(513), "q=test&ruleset=unknown"])("rejects invalid requests: %s", async (query) => {
    const response = await GET(new Request(`http://local/api/search/rpgbot?${query}`));
    expect(response.status).toBe(400);
  });
});

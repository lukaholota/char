import { describe, expect, it } from "vitest";
import { GET as getStatblock } from "@/app/api/bestiary/statblock/route";
import { GET as getTextMatches } from "@/app/api/bestiary/text-matches/route";

function requestTo(path: string, params: Record<string, string>): Request {
  return new Request(`https://char.test${path}?${new URLSearchParams(params)}`);
}

describe("читання каталогу звичайним GET", () => {
  it("віддає статблок істоти за ключем і редакцією", async () => {
    const response = await getStatblock(requestTo("/api/bestiary/statblock", { key: "goblin", ruleset: "RULES_2014" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ nameEng: "Goblin" });
  });

  it("знаходить істот за текстом статблока, а не лише за назвою", async () => {
    const response = await getTextMatches(requestTo("/api/bestiary/text-matches", { q: "nimble escape", ruleset: "RULES_2014" }));
    expect(await response.json()).toContain("goblin");
  });

  it("без редакції відповідає 400, а не читає навмання", async () => {
    expect((await getStatblock(requestTo("/api/bestiary/statblock", { key: "goblin", ruleset: "RULES_2000" }))).status).toBe(400);
    expect((await getTextMatches(requestTo("/api/bestiary/text-matches", { q: "goblin" }))).status).toBe(400);
  });
});

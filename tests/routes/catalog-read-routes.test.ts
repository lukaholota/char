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
    expect(await response.json()).toMatchObject({ creature: { nameEng: "Goblin" } });
  });

  it("несе разом зі статблоком вступ до групи істот, бо панель бестіарію малює його поруч", async () => {
    const response = await getStatblock(requestTo("/api/bestiary/statblock", { key: "ancient-blue-dragon", ruleset: "RULES_2014" }));
    expect(await response.json()).toMatchObject({ creature: { nameEng: "Ancient Blue Dragon" }, loreGroup: { key: "dragons" } });
  });

  it("заклинання мага приходять списком із кидками, а назва коротка, без оригіналу в дужках", async () => {
    const response = await getStatblock(requestTo("/api/bestiary/statblock", { key: "mage", ruleset: "RULES_2014" }));
    const { creature } = await response.json();
    expect(creature.spellcasting).toMatchObject({ attackBonus: 6, saveDc: 14, ruleset: "RULES_2014" });
    expect(creature.spellcasting.spells).toContainEqual(expect.objectContaining({ name: "Вогнекуля", level: 3, plan: expect.objectContaining({ save: "DEX" }) }));
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

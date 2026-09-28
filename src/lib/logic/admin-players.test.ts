import { describe, expect, it } from "vitest";
import { arrangePlayers, buildPlayerGalleryHref, readPlayerGalleryView, type PlayerWithPerses } from "@/lib/logic/admin-players";

function player(userId: number, portraits: Array<string | null>, lastActivityDay: number): PlayerWithPerses {
  return {
    userId,
    name: `Гравець ${userId}`,
    email: null,
    avatarUrl: null,
    lastActivityAt: new Date(2026, 8, lastActivityDay),
    perses: portraits.map((portraitKey, index) => ({ persId: userId * 10 + index, name: "П", portraitKey, level: 1, ruleset: "RULES_2014", raceName: "HUMAN", className: "FIGHTER", updatedAt: new Date(2026, 8, lastActivityDay) })),
  };
}

const noPortraits = player(1, [null, null, null, null], 20);
const onePortraitOfThree = player(2, ["a", null, null], 25);
const twoPortraitsOfTwo = player(3, ["b", "c"], 10);
const onePortraitOfThreeOlder = player(4, ["d", null, null], 5);
const players = [noPortraits, onePortraitOfThree, twoPortraitsOfTwo, onePortraitOfThreeOlder];

const idsOf = (list: PlayerWithPerses[]) => list.map((entry) => entry.userId);

describe("arrangePlayers", () => {
  it("за замовчуванням ховає гравців без жодного портрета й ставить нещодавніх першими", () => {
    expect(idsOf(arrangePlayers(players, readPlayerGalleryView({})))).toEqual([2, 3, 4]);
  });

  it("без фільтра показує всіх", () => {
    expect(idsOf(arrangePlayers(players, { onlyWithPortraits: false, sort: "recent" }))).toEqual([2, 1, 3, 4]);
  });

  it("за кількістю персонажів: рівність розвʼязують портрети, потім свіжість", () => {
    expect(idsOf(arrangePlayers(players, { onlyWithPortraits: false, sort: "persCount" }))).toEqual([1, 2, 4, 3]);
  });

  it("за кількістю портретів: рівність розвʼязують персонажі, потім свіжість", () => {
    expect(idsOf(arrangePlayers(players, { onlyWithPortraits: false, sort: "portraitCount" }))).toEqual([3, 2, 4, 1]);
  });
});

describe("вигляд галереї в адресі", () => {
  it("читає параметри й ігнорує невідоме сортування", () => {
    expect(readPlayerGalleryView({ sort: "portraitCount", all: "1" })).toEqual({ onlyWithPortraits: false, sort: "portraitCount" });
    expect(readPlayerGalleryView({ sort: "bogus" })).toEqual({ onlyWithPortraits: true, sort: "recent" });
  });

  it("не пише в адресу типові значення", () => {
    expect(buildPlayerGalleryHref({ onlyWithPortraits: true, sort: "recent" })).toBe("/admin/players");
    expect(buildPlayerGalleryHref({ onlyWithPortraits: false, sort: "persCount" })).toBe("/admin/players?sort=persCount&all=1");
  });
});

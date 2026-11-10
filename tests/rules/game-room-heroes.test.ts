import { describe, expect, it } from "vitest";

import { findRoomPeople, findShownHeroPersId, listSheetPersIds } from "@/rules/game-room-heroes";

describe("герої кімнати", () => {
  it("людей рахує по одному, скільки б героїв вони не вели", () => {
    const members = [{ userId: 1, heroSlot: 0 }, { userId: 1, heroSlot: 1 }, { userId: 2, heroSlot: 0 }];

    expect(findRoomPeople(members).map((member) => member.userId)).toEqual([1, 2]);
  });

  it("показує запитаного героя, якщо він мій", () => {
    expect(findShownHeroPersId("20", [10, 20])).toBe(20);
  });

  it.each([["30"], ["abc"], [null], [""]])("на «%s» показує першого свого героя", (requested) => {
    expect(findShownHeroPersId(requested, [10, 20])).toBe(10);
  });

  it("без героїв листа немає", () => {
    expect(findShownHeroPersId("20", [])).toBeNull();
    expect(findShownHeroPersId(null, [])).toBeNull();
  });

  const members = [{ userId: 1, persId: 10 }, { userId: 2, persId: 20 }, { userId: 2, persId: 21 }, { userId: 3, persId: null }];

  it("майстру відкриває листи всіх героїв кімнати, своїх першими", () => {
    expect(listSheetPersIds({ myRole: "GM", myUserId: 1, myPersIds: [10], members })).toEqual([10, 20, 21]);
    expect(listSheetPersIds({ myRole: "GM", myUserId: 3, myPersIds: [], members })).toEqual([10, 20, 21]);
  });

  it("гравцю — лише його героїв", () => {
    expect(listSheetPersIds({ myRole: "PLAYER", myUserId: 2, myPersIds: [20, 21], members })).toEqual([20, 21]);
  });
});

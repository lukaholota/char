import { describe, expect, it } from "vitest";
import { buildRollVerdict, clearRollVerdict, settleRollVerdict, useRollVerdictStore, watchRollVerdict } from "./roll-verdict";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameRollTargetView } from "@/rules/game-roll-target";
import type { GameRollHeroTargetView } from "@/rules/game-roll-hero-target";

const creature = (overrides: Partial<GameRollTargetView>) => ({ target: { name: "Гоблін", kind: "attack" as const, isHit: null, damage: null, isDowned: false, gm: null, ...overrides }, heroTarget: null });
const hero = (overrides: Partial<GameRollHeroTargetView>) => ({ target: null, heroTarget: { persId: 1, name: "Тарас", kind: "heal" as const, damage: null, healing: null, isHit: null, armorClass: null, isAppliedToSheet: true, ...overrides } });

describe("вердикт кидка в лотку", () => {
  it("атака: влучання, промах або рішення майстра, коли КЗ невідомий", () => {
    expect(buildRollVerdict(creature({ isHit: true }))).toEqual({ tone: "good", text: "Влучання — Гоблін" });
    expect(buildRollVerdict(creature({ isHit: false }))).toEqual({ tone: "bad", text: "Промах — Гоблін" });
    expect(buildRollVerdict(creature({ isHit: null }))).toEqual({ tone: "plain", text: "Гоблін: КЗ невідомий — вирішує майстер" });
  });

  it("шкода показує зняті хіти й «повалений», лікування — додані хіти, без цілі — нічого", () => {
    expect(buildRollVerdict(creature({ kind: "damage", damage: 7, isDowned: true }))?.text).toBe("Гоблін: −7 · повалений");
    expect(buildRollVerdict(hero({ healing: 6 }))).toEqual({ tone: "good", text: "Тарас: +6 хітів" });
    expect(buildRollVerdict({ target: null, heroTarget: null })).toBeNull();
  });

  it("лоток чекає саме свій кидок: чужа відповідь і очищення іншого ключа його не чіпають", () => {
    const event = { ...hero({ healing: 2 }) } as GameRollEventView;
    watchRollVerdict("a");
    settleRollVerdict("b", event);
    expect(useRollVerdictStore.getState()).toEqual({ key: "a", event: null });
    clearRollVerdict("b");
    settleRollVerdict("a", event);
    expect(useRollVerdictStore.getState().event).toBe(event);
    clearRollVerdict();
    expect(useRollVerdictStore.getState()).toEqual({ key: null, event: null });
  });
});

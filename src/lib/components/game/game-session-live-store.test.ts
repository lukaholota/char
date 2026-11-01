import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionView } from "@/server/db/game-sessions";
import { addGameEvents, addPendingRoll, dropPendingRoll, markMeRolling, markMemberRolling, resetLiveSession, setConnectionStatus, setSessionView, useGameSessionLiveStore } from "./game-session-live-store";

const event = (seq: number, authorUserId: number) => ({ seq, authorUserId }) as GameRollEventView;

describe("стан «кидає…»", () => {
  afterEach(() => {
    resetLiveSession(null);
    vi.useRealTimers();
  });

  it("зникає, щойно від того ж гравця приходить кидок", () => {
    resetLiveSession(1);
    markMemberRolling(1, 5);
    markMemberRolling(1, 6);
    addGameEvents(1, [event(10, 5)]);
    expect(useGameSessionLiveStore.getState().rollingUserIds).toEqual([6]);
  });

  it("саме згасає, якщо результат так і не прийшов", () => {
    vi.useFakeTimers();
    resetLiveSession(1);
    markMemberRolling(1, 5);
    vi.advanceTimersByTime(8000);
    expect(useGameSessionLiveStore.getState().rollingUserIds).toEqual([]);
  });

  it("анімація рахує нові кидки від останнього кидка першої сторінки", () => {
    resetLiveSession(1);
    setConnectionStatus(1, "connecting");
    addGameEvents(1, [event(4, 2)]);
    setConnectionStatus(1, "live");
    setConnectionStatus(1, "reconnecting");
    setConnectionStatus(1, "live");
    expect(useGameSessionLiveStore.getState().liveFromSeq).toBe(4);
  });
});

describe("свій кидок", () => {
  const roll = (seq: number, label: string, total: number) => ({ seq, authorUserId: 5, label, total }) as GameRollEventView;
  const openRoomAsMe = () => {
    resetLiveSession(1);
    setSessionView({ id: 1, myUserId: 5 } as GameSessionView);
  };
  afterEach(() => resetLiveSession(null));

  it("видно одразу, а справжній кидок з потоку займає його місце без нової анімації", () => {
    openRoomAsMe();
    markMeRolling(1);
    addPendingRoll(1, { key: "k1", event: roll(0, "Спритність", 17) });
    expect(useGameSessionLiveStore.getState()).toMatchObject({ rollingUserIds: [], pendingRolls: [{ key: "k1" }] });
    addGameEvents(1, [roll(3, "Спритність", 17)]);
    expect(useGameSessionLiveStore.getState()).toMatchObject({ pendingRolls: [], rollKeys: { 3: "k1" } });
  });

  it("не плутає з іншим кидком і зникає, якщо кімната його не прийняла", () => {
    openRoomAsMe();
    addPendingRoll(1, { key: "k1", event: roll(0, "Спритність", 17) });
    addGameEvents(1, [roll(3, "Спритність", 12), { ...roll(4, "Спритність", 17), authorUserId: 6 }]);
    expect(useGameSessionLiveStore.getState().pendingRolls).toHaveLength(1);
    dropPendingRoll("k1");
    expect(useGameSessionLiveStore.getState().pendingRolls).toEqual([]);
  });
});

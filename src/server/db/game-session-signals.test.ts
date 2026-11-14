import { describe, expect, it, vi } from "vitest";
import { parseSignal } from "./game-session-signals";

vi.mock("@/server/db/game-sessions", () => ({ GAME_SESSION_SIGNAL_CHANNEL: "game_session" }));

describe("parseSignal", () => {
  it("читає звичайні сигнали й сигнал «кидає» з автором і видимістю", () => {
    expect(parseSignal(JSON.stringify({ s: 7, k: "roll" }))).toEqual({ sessionId: 7, wake: "roll" });
    expect(parseSignal(JSON.stringify({ s: 7, k: "rolling", u: 3, v: "GM" }))).toEqual({ sessionId: 7, wake: { rollerUserId: 3, visibility: "GM" } });
  });

  it("відкидає «кидає» без автора чи з чужою видимістю", () => {
    expect(parseSignal(JSON.stringify({ s: 7, k: "rolling", v: "PUBLIC" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ s: 7, k: "rolling", u: 3, v: "ALL" }))).toBeNull();
    expect(parseSignal("not json")).toBeNull();
  });

  it("читає пінг зі сценою й точкою в межах мапи; без сцени чи координат відкидає", () => {
    expect(parseSignal(JSON.stringify({ s: 7, k: "ping", u: 3, c: 12, x: 0.25, y: 1.4 }))).toEqual({ sessionId: 7, wake: { pingerUserId: 3, sceneId: 12, at: { x: 0.25, y: 1 } } });
    expect(parseSignal(JSON.stringify({ s: 7, k: "ping", u: 3, x: 0.25, y: 0.5 }))).toBeNull();
    expect(parseSignal(JSON.stringify({ s: 7, k: "ping", u: 3, c: 12, x: "0.25", y: 0.5 }))).toBeNull();
  });
});

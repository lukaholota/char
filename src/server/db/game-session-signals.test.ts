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
});

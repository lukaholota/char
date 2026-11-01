import { describe, expect, it, vi } from "vitest";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import { createIdempotencyKey, enqueueGameRoll, flushOutbox, GAME_ROLL_OUTBOX_KEY, MAX_QUEUED_AGE_MS, readOutbox, type QueuedGameRoll, type SendOutcome } from "./game-roll-outbox";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

function buildQueued(idempotencyKey: string, queuedAt = 1_000): QueuedGameRoll {
  return {
    sessionId: 7,
    queuedAt,
    draft: { idempotencyKey, visibility: "PUBLIC", source: "FREE", persId: null, label: "1к20", roll: { groups: [{ sides: 20, values: [12] }], d20Mode: null, modeSources: [], extra: [], bonus: 0, total: 12, check: null }, rolledAt: new Date(queuedAt).toISOString() },
  };
}

const sentEvent = { seq: 1 } as GameRollEventView;

function flushWith(storage: Storage, outcomes: Record<string, SendOutcome>, now = 2_000) {
  const handlers = { send: vi.fn(async (item: QueuedGameRoll) => outcomes[item.draft.idempotencyKey]), onSent: vi.fn(), onDropped: vi.fn(), now: () => now };
  return { handlers, remaining: flushOutbox(storage, handlers) };
}

describe("game roll outbox", () => {
  it("keeps a roll the server could not take yet and removes the delivered and refused ones", async () => {
    const storage = createMemoryStorage();
    for (const key of ["sent", "later", "refused"]) enqueueGameRoll(storage, buildQueued(key));
    const { handlers, remaining } = flushWith(storage, { sent: { kind: "sent", event: sentEvent }, later: { kind: "retry" }, refused: { kind: "rejected", status: 403 } });

    expect(await remaining).toBe(1);
    expect(readOutbox(storage).map((item) => item.draft.idempotencyKey)).toEqual(["later"]);
    expect(handlers.onSent).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.objectContaining({ idempotencyKey: "sent" }) }), sentEvent);
    expect(handlers.onDropped).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.objectContaining({ idempotencyKey: "refused" }) }), "rejected");
  });

  it("drops a roll older than ten minutes without sending it", async () => {
    const storage = createMemoryStorage();
    enqueueGameRoll(storage, buildQueued("stale", 0));
    const { handlers, remaining } = flushWith(storage, {}, MAX_QUEUED_AGE_MS + 1);

    expect(await remaining).toBe(0);
    expect(handlers.send).not.toHaveBeenCalled();
    expect(handlers.onDropped).toHaveBeenCalledWith(expect.anything(), "expired");
    expect(storage.getItem(GAME_ROLL_OUTBOX_KEY)).toBeNull();
  });

  it("keeps only the newest fifty rolls and survives a broken stored value", () => {
    const storage = createMemoryStorage();
    for (let index = 0; index < 55; index += 1) enqueueGameRoll(storage, buildQueued(`roll-${index}`));
    const queued = readOutbox(storage);
    expect(queued).toHaveLength(50);
    expect(queued[0].draft.idempotencyKey).toBe("roll-5");

    storage.setItem(GAME_ROLL_OUTBOX_KEY, "{not json");
    expect(readOutbox(storage)).toEqual([]);
  });

  it("creates a UUID-shaped key the server accepts", () => {
    expect(createIdempotencyKey()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

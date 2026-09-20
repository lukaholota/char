// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { holdTrayResize, requestTrayResize, rollAfterHeldTrayResize } from "@/lib/components/dice/dice-tray-layout";

function waitForAnimationFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(count);
  });
}

function countResizeEvents(run: () => void | Promise<void>): Promise<number> {
  let count = 0;
  const onResize = () => count++;
  window.addEventListener("resize", onResize);
  return Promise.resolve(run()).then(() => {
    window.removeEventListener("resize", onResize);
    return count;
  });
}

afterEach(() => {
  holdTrayResize(false);
  vi.restoreAllMocks();
});

/// Кубики, що лежать на столі, зникають на `resize` (2026-09-19), тому подія чекає наступного кидка.
describe("resize лотка кубиків", () => {
  it("іде одразу, коли стіл порожній", async () => {
    expect(await countResizeEvents(() => requestTrayResize())).toBe(1);
  });

  it("притримується, поки на столі лежать кубики, і йде перед наступним кидком", async () => {
    holdTrayResize(true);
    expect(await countResizeEvents(() => requestTrayResize())).toBe(0);

    const roll = vi.fn();
    expect(await countResizeEvents(() => rollAfterHeldTrayResize(roll))).toBe(1);
    expect(roll).not.toHaveBeenCalled();
    await waitForAnimationFrames(3);
    expect(roll).toHaveBeenCalledTimes(1);
  });

  it("кидок без притриманого resize іде одразу, синхронно", () => {
    const roll = vi.fn();
    rollAfterHeldTrayResize(roll);
    expect(roll).toHaveBeenCalledTimes(1);
  });

  it("випускає притриманий resize, щойно стіл спорожнів", async () => {
    holdTrayResize(true);
    requestTrayResize();
    expect(await countResizeEvents(() => holdTrayResize(false))).toBe(1);
  });
});

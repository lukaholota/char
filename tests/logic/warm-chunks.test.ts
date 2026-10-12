// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { warmChunksWhenIdle } from "@/lib/offline/warm-chunks";

const IDLE_FALLBACK_MS = 300;

function createManualChunk() {
  let finish: () => void = () => {};
  const load = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
  return { load, finish: () => finish() };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Прогрів чанків слайдів: сервіс-воркер кешує лише те, що хоч раз завантажилось онлайн", () => {
  it("завантажує кожен чанк по одному, наступний — коли попередній завершився", async () => {
    const first = createManualChunk();
    const second = createManualChunk();
    const warming = warmChunksWhenIdle([first.load, second.load], new AbortController().signal);

    await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS);
    expect(first.load).toHaveBeenCalledTimes(1);
    expect(second.load).not.toHaveBeenCalled();

    first.finish();
    await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS);
    expect(second.load).toHaveBeenCalledTimes(1);

    second.finish();
    await expect(warming).resolves.toBe(true);
  });

  it("чанк, що не завантажився, не зупиняє прогрів решти, але лист не вважається готовим", async () => {
    const failing = vi.fn(async () => {
      throw new Error("Failed to load chunk /_next/static/chunks/a.js");
    });
    const healthy = vi.fn(async () => undefined);
    const warming = warmChunksWhenIdle([failing, healthy], new AbortController().signal);

    await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS * 2);
    expect(healthy).toHaveBeenCalledTimes(1);
    await expect(warming).resolves.toBe(false);
  });

  it("скасування зупиняє прогрів — лист закрито, вантажити нічого", async () => {
    const first = createManualChunk();
    const second = vi.fn(async () => undefined);
    const abort = new AbortController();
    const warming = warmChunksWhenIdle([first.load, second], abort.signal);

    await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS);
    abort.abort();
    first.finish();
    await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS * 2);

    expect(second).not.toHaveBeenCalled();
    await expect(warming).resolves.toBe(false);
  });
});

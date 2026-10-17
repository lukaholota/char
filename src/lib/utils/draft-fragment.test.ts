// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { takeDraftFragment } from "./draft-fragment";

const nativeReplaceState = window.history.replaceState.bind(window.history);
const NEXT_STATE = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ["", {}] };

function patchHistoryLikeNext(routerUrls: string[]) {
  window.history.replaceState = (data, unused, url) => {
    const state = (data ?? {}) as Record<string, unknown>;
    if (state.__NA) return nativeReplaceState(data, unused, url);
    const current = window.history.state as Record<string, unknown>;
    if (url) routerUrls.push(new URL(String(url), window.location.href).href);
    return nativeReplaceState({ ...state, __NA: current.__NA, __PRIVATE_NEXTJS_INTERNALS_TREE: current.__PRIVATE_NEXTJS_INTERNALS_TREE }, unused, url);
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  nativeReplaceState(NEXT_STATE, "", "/char/create?entry_source=telegram#draft=abc");
});

afterEach(() => {
  window.history.replaceState = nativeReplaceState;
  vi.useRealTimers();
});

describe("takeDraftFragment", () => {
  it("cleans the address at once and keeps Next's history entry", () => {
    expect(takeDraftFragment()).toBe("abc");
    expect(window.location.href).toBe("http://localhost:3000/char/create?entry_source=telegram");
    expect(window.history.state).toEqual(NEXT_STATE);
  });

  it("tells Next's router the clean address once Next has patched history", () => {
    const routerUrls: string[] = [];
    takeDraftFragment();
    vi.advanceTimersByTime(0);
    expect(window.history.state).toEqual(NEXT_STATE);

    patchHistoryLikeNext(routerUrls);
    vi.advanceTimersByTime(60);
    expect(routerUrls).toEqual(["http://localhost:3000/char/create?entry_source=telegram"]);
    expect(window.history.state).toEqual(NEXT_STATE);

    vi.advanceTimersByTime(5_000);
    expect(routerUrls).toHaveLength(1);
  });

  it("leaves the router alone after the player has moved to another address", () => {
    const routerUrls: string[] = [];
    patchHistoryLikeNext(routerUrls);
    takeDraftFragment();
    nativeReplaceState(NEXT_STATE, "", "/char/42");
    vi.advanceTimersByTime(5_000);
    expect(routerUrls).toEqual([]);
  });

  it("ignores an address without a draft", () => {
    nativeReplaceState(NEXT_STATE, "", "/char/create#section");
    expect(takeDraftFragment()).toBeNull();
    expect(window.location.hash).toBe("#section");
  });
});

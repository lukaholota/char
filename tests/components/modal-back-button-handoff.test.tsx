// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useModalBackButton } from "@/hooks/useModalBackButton";

// jsdom скасовує перехід назад, якщо до його виконання встиг pushState; Chromium — ні: перехід
// відбувається пізніше й уже від нового запису. Відкладений go() повторює поведінку Chromium.
function traverseBackLikeChromium() {
  const go = History.prototype.go;
  vi.spyOn(window.history, "go").mockImplementation((delta?: number) => {
    setTimeout(() => go.call(window.history, delta), 0);
  });
}

function waitForHistoryTraversal() {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

function renderTwoModals(onCloseFirst: () => void, onCloseSecond: () => void) {
  return renderHook(
    ({ first, second }: { first: boolean; second: boolean }) => {
      useModalBackButton(first, onCloseFirst);
      useModalBackButton(second, onCloseSecond);
    },
    { initialProps: { first: true, second: false } },
  );
}

describe("useModalBackButton — один діалог закривається, інший відкривається тим самим кліком", () => {
  beforeEach(() => traverseBackLikeChromium());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("відкритий діалог не закривається від history.back() попереднього", async () => {
    const onCloseFirst = vi.fn();
    const onCloseSecond = vi.fn();
    const { rerender } = renderTwoModals(onCloseFirst, onCloseSecond);
    await act(waitForHistoryTraversal);

    act(() => rerender({ first: false, second: true }));
    await act(waitForHistoryTraversal);

    expect(onCloseSecond).not.toHaveBeenCalled();
  });

  it("кнопка «Назад» після передачі закриває вже другий діалог", async () => {
    const onCloseFirst = vi.fn();
    const onCloseSecond = vi.fn();
    const { rerender } = renderTwoModals(onCloseFirst, onCloseSecond);
    await act(waitForHistoryTraversal);

    act(() => rerender({ first: false, second: true }));
    await act(waitForHistoryTraversal);
    act(() => window.history.back());
    await act(waitForHistoryTraversal);

    expect(onCloseSecond).toHaveBeenCalledTimes(1);
    expect(onCloseFirst).not.toHaveBeenCalled();
  });
});

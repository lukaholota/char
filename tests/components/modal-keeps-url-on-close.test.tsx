// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import { replaceUrlSearchParams } from "@/lib/catalog-url-helpers";

// jsdom скасовує перехід назад, якщо до його виконання встиг pushState; Chromium — ні.
function traverseBackLikeChromium() {
  const go = History.prototype.go;
  vi.spyOn(window.history, "go").mockImplementation((delta?: number) => {
    setTimeout(() => go.call(window.history, delta), 0);
  });
}

function waitForHistoryTraversal() {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

// У застосунку `locationchange` після replaceState кидає глобальна обгортка історії.
function writeFilterToUrl(level: string) {
  replaceUrlSearchParams(new URLSearchParams({ lvl: level }));
  window.dispatchEvent(new Event("locationchange"));
}

function renderFilterModal(keepUrlOnClose: boolean) {
  const onClose = vi.fn();
  const view = renderHook(({ open }: { open: boolean }) => useModalBackButton(open, onClose, { keepUrlOnClose }), {
    initialProps: { open: true },
  });
  return { ...view, onClose };
}

describe("useModalBackButton з keepUrlOnClose — фільтри каталогу переживають закриття модалки", () => {
  beforeEach(() => {
    window.history.replaceState({ __NA: true }, "", "/spells");
    traverseBackLikeChromium();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("закриття кнопкою лишає фільтр, обраний у модалці", async () => {
    const { rerender } = renderFilterModal(true);
    await act(waitForHistoryTraversal);

    act(() => writeFilterToUrl("3"));
    act(() => rerender({ open: false }));
    await act(waitForHistoryTraversal);

    expect(window.location.search).toBe("?lvl=3");
  });

  it("системне «Назад» закриває модалку й лишає фільтр", async () => {
    const { onClose } = renderFilterModal(true);
    await act(waitForHistoryTraversal);

    act(() => writeFilterToUrl("4"));
    act(() => window.history.back());
    await act(waitForHistoryTraversal);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?lvl=4");
  });

  it("без прапорця закриття повертає адресу, що була до модалки", async () => {
    const { rerender } = renderFilterModal(false);
    await act(waitForHistoryTraversal);

    act(() => writeFilterToUrl("5"));
    act(() => rerender({ open: false }));
    await act(waitForHistoryTraversal);

    expect(window.location.search).toBe("");
  });
});

describe("replaceUrlSearchParams", () => {
  it("лишає власні ключі запису, а ключі Next віддає йому самому", () => {
    window.history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: {}, __modalBackButtonToken: "t" }, "", "/spells");

    replaceUrlSearchParams(new URLSearchParams({ lvl: "1" }));

    expect(window.history.state).toEqual({ __modalBackButtonToken: "t" });
    expect(window.location.search).toBe("?lvl=1");
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import * as urlHelpers from "@/lib/catalog-url-helpers";

const parse = (params: URLSearchParams) => ({ q: params.get("q") ?? "", creature: params.get("creature") });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("URL пошуку каталогу", () => {
  it.each(["/bestiary?q=beholder", "/2024/bestiary?q=beholder&creature=beholder"])("відновлює %s без запису URL при монтуванні", (url) => {
    vi.useFakeTimers();
    window.history.replaceState({ __NA: true }, "", url);
    const write = vi.spyOn(urlHelpers, "replaceUrlSearchParams");
    const { result } = renderHook(() => useCatalogUrlSync(parse));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.qInput).toBe("beholder");
    expect(write).not.toHaveBeenCalled();
    expect(window.location.search).toContain("q=beholder");
  });

  it("скасовує незавершене введення при Back і видаляє q лише після явного очищення", () => {
    vi.useFakeTimers();
    window.history.replaceState({ qa: "preserved" }, "", "/bestiary?q=beholder&creature=beholder");
    const { result } = renderHook(() => useCatalogUrlSync(parse));
    act(() => result.current.setQInput("owlbear"));
    act(() => {
      window.history.replaceState({ qa: "preserved" }, "", "/bestiary?q=shadow&creature=shadow");
      window.dispatchEvent(new PopStateEvent("popstate"));
      vi.advanceTimersByTime(500);
    });
    expect(result.current.qInput).toBe("shadow");
    expect(window.location.search).toBe("?q=shadow&creature=shadow");
    act(() => { result.current.setQInput(""); });
    act(() => vi.advanceTimersByTime(300));
    expect(window.location.search).toBe("?creature=shadow");
    expect(window.history.state.qa).toBe("preserved");
  });
});

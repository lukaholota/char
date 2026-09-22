// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ prefetch: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { usePrefetchWhenVisible } from "@/app/char/home/use-prefetch-when-visible";

let reportVisibility: (isIntersecting: boolean) => void = () => undefined;

class FakeIntersectionObserver {
  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    reportVisibility = (isIntersecting) => callback([{ isIntersecting }]);
  }
  observe() {}
  disconnect() {}
}

function CardProbe({ href }: { href: string | null }) {
  const ref = usePrefetchWhenVisible<HTMLDivElement>(href);
  return <div ref={ref} />;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  router.prefetch.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/// Тап по картці на /char чекав сервера, перш ніж показати хоч щось (2026-09-21).
describe("картка на /char", () => {
  it("заздалегідь тягне свій лист, щойно її видно на екрані", () => {
    render(<CardProbe href="/char/42" />);
    expect(router.prefetch).not.toHaveBeenCalled();

    act(() => reportVisibility(true));
    act(() => vi.advanceTimersByTime(2000));

    expect(router.prefetch).toHaveBeenCalledWith("/char/42");
  });

  it("не тягне нічого, поки картка поза екраном", () => {
    render(<CardProbe href="/char/42" />);

    act(() => reportVisibility(false));
    act(() => vi.advanceTimersByTime(2000));

    expect(router.prefetch).not.toHaveBeenCalled();
  });
});

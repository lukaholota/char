// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { useCatalogDeepLinkFocus } from "@/hooks/useCatalogDeepLinkFocus";
import { announceSearchNavigation } from "@/lib/search/search-navigation";

afterEach(cleanup);

function Catalog({ focus }: { focus: () => void }) {
  useCatalogDeepLinkFocus(focus);
  return null;
}

describe("Каталог відкриває запис із адреси", () => {
  it("читає адресу при монтуванні", () => {
    const focus = vi.fn();
    render(<Catalog focus={focus} />);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("повторний перехід із пошуку на той самий запис теж доходить", () => {
    const focus = vi.fn();
    render(<Catalog focus={focus} />);

    act(() => announceSearchNavigation());
    act(() => announceSearchNavigation());

    expect(focus).toHaveBeenCalledTimes(3);
  });

  it("кнопка «назад» так само повертає каталог до запису з адреси", () => {
    const focus = vi.fn();
    render(<Catalog focus={focus} />);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(focus).toHaveBeenCalledTimes(2);
  });

  it("після розмонтування каталог подій більше не слухає", () => {
    const focus = vi.fn();
    const view = render(<Catalog focus={focus} />);
    view.unmount();

    act(() => announceSearchNavigation());

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("оновлення callback не запускає початкове відкриття вдруге", () => {
    const first = vi.fn();
    const second = vi.fn();
    const view = render(<Catalog focus={first} />);

    view.rerender(<Catalog focus={second} />);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    act(() => announceSearchNavigation());
    expect(second).toHaveBeenCalledTimes(1);
  });
});

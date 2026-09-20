// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useRememberedHomebrewToggle } from "@/hooks/useRememberedHomebrewToggle";

afterEach(cleanup);
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    },
  });
});

function Catalog({ initiallyOn = false }: { initiallyOn?: boolean }) {
  const [isOn, setOn] = useState(initiallyOn);
  useRememberedHomebrewToggle("spells-RULES_2014", isOn, () => setOn(true));
  return (
    <button type="button" onClick={() => setOn((value) => !value)}>
      {isOn ? "увімкнено" : "вимкнено"}
    </button>
  );
}

describe("памʼять перемикача хоумбрю на сторінці каталогу", () => {
  it("увімкнене раз вмикається при наступному відкритті, поки його не вимкнуть", () => {
    const first = render(<Catalog />);
    act(() => screen.getByRole("button").click());
    expect(window.localStorage.getItem("catalog-homebrew:spells-RULES_2014")).toBe("1");
    first.unmount();

    const second = render(<Catalog />);
    expect(screen.getByRole("button").textContent).toBe("увімкнено");
    expect(window.localStorage.getItem("catalog-homebrew:spells-RULES_2014")).toBe("1");
    act(() => screen.getByRole("button").click());
    expect(window.localStorage.getItem("catalog-homebrew:spells-RULES_2014")).toBeNull();
    second.unmount();

    render(<Catalog />);
    expect(screen.getByRole("button").textContent).toBe("вимкнено");
  });

  it("посилання з уже увімкненим хоумбрю нічого не запамʼятовує саме по собі", () => {
    render(<Catalog initiallyOn />);
    expect(window.localStorage.getItem("catalog-homebrew:spells-RULES_2014")).toBeNull();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FeatureCard, type FeatureStateToggle } from "@/lib/components/characterSheet/shared/FeatureCards";

afterEach(cleanup);

const rage = {
  featureId: 10,
  name: "Лють",
  description: "Опис",
  displayType: [],
  restType: "LONG_REST",
  usesCount: 4,
  usesRemaining: 4,
};

function renderRage(toggle: Partial<FeatureStateToggle> = {}) {
  const onChange = vi.fn();
  const onClick = vi.fn();
  render(<FeatureCard feature={rage} onClick={onClick} stateToggle={{ isActive: false, disabled: false, onChange, ...toggle }} />);
  return { onChange, onClick, button: screen.getByRole("button", { name: /Лють:/ }) };
}

describe("O38 — кнопка стану на картці риси", () => {
  it("свайп, що почався з кнопки, дістається каруселі листа", () => {
    expect(renderRage().button.className).not.toContain("swiper-no-swiping");
  });

  it("«Увімкнути» вмикає стан і не відкриває опис риси", () => {
    const { onChange, onClick, button } = renderRage();
    expect(button.textContent).toContain("Увімкнути");
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("активна риса показує «Активна» і вимикається тим самим тапом", () => {
    const { onChange, button } = renderRage({ isActive: true });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.textContent).toContain("Активна");
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("без використань кнопка вимкнена", () => {
    expect(renderRage({ disabled: true }).button.hasAttribute("disabled")).toBe(true);
  });

  it("картка без стану кнопки не має", () => {
    render(<FeatureCard feature={rage} />);
    expect(screen.queryByRole("button", { name: /Лють:/ })).toBeNull();
  });
});

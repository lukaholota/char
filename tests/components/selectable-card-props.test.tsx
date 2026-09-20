// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { buildSelectableCardProps } from "@/lib/components/characterCreator/selectable-card-props";

afterEach(cleanup);

function renderOptionCard(onSelect: () => void) {
  render(
    <div {...buildSelectableCardProps({ isSelected: false, isMultiSelect: false, onSelect })}>
      <span>Безодня</span>
      <a href="?spell=poison-spray" data-stop-card-click onClick={(event) => event.preventDefault()}>
        Отруйні бризки
      </a>
    </div>,
  );
}

describe("KR31.14 — картка-вибір конструктора (P7-mobile-ux-08)", () => {
  it("є радіокнопкою, яку видно з клавіатури й скрінрідера", () => {
    const onSelect = vi.fn();
    renderOptionCard(onSelect);

    const card = screen.getByRole("radio", { name: /Безодня/ });
    expect(card.getAttribute("aria-checked")).toBe("false");
    expect(card.tabIndex).toBe(0);

    fireEvent.keyDown(card, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("тап по посиланню на заклинання в описі не обирає опцію, тап по картці — обирає", () => {
    const onSelect = vi.fn();
    renderOptionCard(onSelect);

    fireEvent.click(screen.getByText("Отруйні бризки"));
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Безодня"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import sprite from "@/lib/generated/spell-icon-sprite.json";
import { SpellIcon } from "@/components/spells/SpellIcon";

afterEach(cleanup);

/// KR40.4: іконка береться зі спрайта за `engName`; заклинання без місця у спрайті малюється
/// плитою школи. Червоний тест означає розʼїзд компонента з індексом.

function renderIcon(engName: string | null, school?: string | null) {
  const { container } = render(<SpellIcon engName={engName} school={school} className="h-8 w-8" />);
  return container.firstElementChild as HTMLElement;
}

describe("SpellIcon", () => {
  it("заклинання зі спрайта малюється спрайтом", () => {
    const element = renderIcon("Fireball");
    expect(element.style.backgroundImage).toContain(sprite.file);
  });

  it("позиція фону відповідає індексу", () => {
    const position = sprite.names.indexOf("Fireball");
    const column = position % sprite.columns;
    const row = Math.floor(position / sprite.columns);
    const element = renderIcon("Fireball");
    expect(element.style.backgroundPosition).toBe(
      `${(column / (sprite.columns - 1)) * 100}% ${(row / (sprite.rows - 1)) * 100}%`,
    );
  });

  it("різні заклинання дають різну позицію", () => {
    const first = renderIcon("Fireball").style.backgroundPosition;
    cleanup();
    const second = renderIcon("Bless").style.backgroundPosition;
    expect(first).not.toBe(second);
  });

  it("невідоме заклинання падає на плиту школи", () => {
    const element = renderIcon("Нема такого заклинання", "Некромантія");
    expect(element.style.backgroundImage).toBe("");
    expect(element.className).toContain("emerald");
  });

  it("порожня назва теж дає плиту", () => {
    const element = renderIcon(null, null);
    expect(element.style.backgroundImage).toBe("");
    expect(element.className).toContain("slate");
  });
});

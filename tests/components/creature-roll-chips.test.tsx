// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";

const DRAGON_BITE = "<p><b>Укус{{Bite}}.</b> Кидок ближньої атаки: +14, досяжність 10 фт. Влучання: 19 (2к10 + 8) колючих ушкоджень плюс 7 (2к6) вогняних. <a href=\"/spells/fireball\">1к6</a></p>";

afterEach(() => {
  cleanup();
  useDiceUIStore.getState().close();
});

describe("кубики в діях істоти", () => {
  it("шкода відкриває панель з атакою того самого удару й кидає натиснуте", () => {
    const { container } = render(<FormattedDescription content={DRAGON_BITE} rollsForCreature="Червоний дракон" />);
    const chips = [...container.querySelectorAll("button")];
    expect(chips.map((chip) => chip.textContent)).toEqual(["+14", "2к10 + 8", "2к6"]);
    fireEvent.click(chips[1]);
    const context = useDiceUIStore.getState().rollContext;
    expect(context).toMatchObject({ title: "Червоний дракон", subtitle: "Укус", autoRollKey: "roll-1", isCreatureRoll: true });
    expect(context?.actions.map((action) => [action.label, action.count, action.sides, action.bonus])).toEqual([["Атака", 1, 20, 14], ["Шкода", 2, 10, 8], ["Шкода", 2, 6, 0]]);
  });

  it("кожен пункт списку променів — окрема дія: своя назва, свій кубик і свій ряткидок", () => {
    const rays = "<p><b>Промені з очей.</b> Для кожного променя киньте к8.</p><ol><li><b>Рійний промінь.</b> Ціль отримує 18 (4к8) колючих ушкоджень.</li><li><b>Промінь Вельзевула.</b> Ціль повинна пройти рятівний кидок Статури СК 17, інакше отримує 27 (6к8) некротичних ушкоджень, а за успіху — половину.</li></ol>";
    const { container } = render(<FormattedDescription content={rays} rollsForCreature="Бджехолдер" />);
    const chips = [...container.querySelectorAll("button")];
    expect(chips.map((chip) => chip.getAttribute("aria-label"))).toEqual(["Кинути: кубик, Промені з очей", "Кинути: шкода, Рійний промінь", "Кинути: шкода, Промінь Вельзевула"]);
    fireEvent.click(chips[0]);
    expect(useDiceUIStore.getState().rollContext?.actions.map((action) => [action.label, action.count, action.sides])).toEqual([["Кидок к8", 1, 8]]);
    fireEvent.click(chips[2]);
    expect(useDiceUIStore.getState().rollContext).toMatchObject({ subtitle: "Промінь Вельзевула", targetSave: { abilityName: "Статури", dc: 17 } });
  });

  it("без назви істоти текст лишається простим", () => {
    const { container } = render(<FormattedDescription content={DRAGON_BITE} />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});

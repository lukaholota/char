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

  it("без назви істоти текст лишається простим", () => {
    const { container } = render(<FormattedDescription content={DRAGON_BITE} />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});

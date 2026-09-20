// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { FeatSpellChoiceStep } from "@/components/spells/FeatSpellChoiceStep";

afterEach(cleanup);

const spell = (spellId: number, name: string, level: number, spellLists: string[]) => ({ spellId, name, engName: name, level, school: "EVOCATION", spellLists });

const discoveries = {
  picks: [
    {
      count: 2,
      spellLevel: 0,
      maxSpellLevel: 3,
      spells: [spell(1, "Священне полумʼя", 0, ["Клірик"]), spell(2, "Дороговказний промінь", 1, ["Клірик"]), spell(3, "Вогняна куля", 3, ["Чарівник"])],
    },
  ],
};

describe("Магічні відкриття — порція на кілька рівнів у кроці вибору заклинань", () => {
  it("підпис називає стелю рівня, картки згруповано за рівнем, а «готово» стає після двох", () => {
    const onChange = vi.fn();
    const onCompleteChange = vi.fn();
    render(<FeatSpellChoiceStep featLabel="Магічні відкриття" offer={discoveries} selectedIds={[]} onChange={onChange} onCompleteChange={onCompleteChange} />);

    expect(screen.getByText(/Магічні відкриття: замовлянь або заклинань до 3-го рівня — 2/)).toBeTruthy();
    expect(screen.getByRole("region", { name: "Замовляння" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "3-й рівень" })).getByRole("button", { name: /^Вогняна куля/ })).toBeTruthy();
    expect(onCompleteChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: /^Вогняна куля/ }));
    expect(onChange).toHaveBeenLastCalledWith([3]);

    cleanup();
    render(<FeatSpellChoiceStep featLabel="Магічні відкриття" offer={discoveries} selectedIds={[3, 2]} onChange={onChange} onCompleteChange={onCompleteChange} />);
    expect(onCompleteChange).toHaveBeenLastCalledWith(true);
  });
});

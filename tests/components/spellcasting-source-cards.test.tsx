// @vitest-environment jsdom
//
// KR31.5 — КС і атака заклинань за джерелом, а не одна пара на весь лист: мультиклас
// клірик + чародій показує дві різні КС, кожну під своїм класом і характеристикою.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import SpellcastingSourceCards from "@/lib/components/characterSheet/shared/SpellcastingSourceCards";
import type { SpellcastingStatRow } from "@/lib/logic/spellcasting-stats";

afterEach(cleanup);

const clericRow: SpellcastingStatRow = { key: "CLERIC_2024", label: "Клірик", ability: "WIS", attackBonus: 6, saveDC: 14 };
const sorcererRow: SpellcastingStatRow = { key: "SORCERER_2024", label: "Чародій", ability: "CHA", attackBonus: 4, saveDC: 12 };

describe("KR31.5 — картки КС і атаки за джерелом", () => {
  it("мультиклас показує дві різні КС, кожну під своїм джерелом", () => {
    render(<SpellcastingSourceCards rows={[clericRow, sorcererRow]} onEdit={vi.fn()} />);

    const cleric = screen.getByRole("region", { name: "Клірик" });
    const sorcerer = screen.getByRole("region", { name: "Чародій" });
    expect(within(cleric).getByText("14")).toBeTruthy();
    expect(within(cleric).getByText("+6")).toBeTruthy();
    expect(within(cleric).getByText("Клірик · МУД")).toBeTruthy();
    expect(within(sorcerer).getByText("12")).toBeTruthy();
    expect(within(sorcerer).getByText("+4")).toBeTruthy();
    expect(within(sorcerer).getByText("Чародій · ХАР")).toBeTruthy();
  });

  it("натискання на КС джерела передає його характеристику в редактор бонусу", () => {
    const onEdit = vi.fn();
    render(<SpellcastingSourceCards rows={[clericRow, sorcererRow]} onEdit={onEdit} />);

    fireEvent.click(within(screen.getByRole("region", { name: "Чародій" })).getByText("12"));

    expect(onEdit).toHaveBeenCalledWith("spellDC", "CHA");
  });

  it("у режимі перегляду картки не редагуються", () => {
    const onEdit = vi.fn();
    render(<SpellcastingSourceCards rows={[clericRow]} isReadOnly onEdit={onEdit} />);

    fireEvent.click(screen.getByText("14"));

    expect(onEdit).not.toHaveBeenCalled();
  });
});

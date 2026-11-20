// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MagicItemRow, type PersMagicItemLink } from "@/lib/components/characterSheet/MagicItemRow";

vi.mock("@/lib/actions/magic-item-actions", () => ({ setMagicItemChargesMax: vi.fn(), stepMagicItemCharges: vi.fn() }));

afterEach(cleanup);

const DAGON = "**Промінь (витрачає 1 заряд).** Дистанційна атака заклинанням: +7 до влучання. Влучання: 5к10 силової шкоди.\n\nПредмет має 3 заряди.";

function buildLink(item: { name: string; itemType: string; description: string }, isEquipped: boolean): PersMagicItemLink {
  return {
    persMagicItemId: 1, persId: 1, magicItemId: 1, isEquipped, isAttuned: false, chargesMax: null, chargesCurrent: null, persWeaponId: null,
    magicItem: { magicItemId: 1, engName: item.name, rarity: "RARE", requiresAttunement: false, imageKey: null, ...item },
  } as unknown as PersMagicItemLink;
}

function renderRow(link: PersMagicItemLink) {
  render(<MagicItemRow pmi={link} isRemoving={false} isPending={false} onDelete={vi.fn()} onUpdate={vi.fn()} onSelect={vi.fn()} onChargesChanged={vi.fn()} />);
}

describe("гравець бачить, що предмет треба екіпірувати", () => {
  it("предмет з кидками в описі підказує екіпірувати, поки не екіпірований", () => {
    renderRow(buildLink({ name: "Dagon", itemType: "WONDROUS_ITEM", description: DAGON }, false));
    expect(screen.getByText("Щоб користуватися, екіпіруйте предмет.")).toBeTruthy();
  });

  it("екіпірований предмет і зілля без перемикача підказки не мають", () => {
    renderRow(buildLink({ name: "Dagon", itemType: "WONDROUS_ITEM", description: DAGON }, true));
    renderRow(buildLink({ name: "Зілля лікування", itemType: "POTION", description: "Ви відновлюєте 2к4 + 2 хітів." }, false));
    expect(screen.queryByText(/Щоб користуватися/)).toBeNull();
  });
});

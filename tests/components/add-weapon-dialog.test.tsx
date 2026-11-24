// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getBaseEquipment: vi.fn(),
  addWeapon: vi.fn(),
  addMagicItemToPers: vi.fn(),
  fetchHomebrewEntries: vi.fn(),
}));
vi.mock("@/lib/actions/equipment-actions", () => ({ getBaseEquipment: mocks.getBaseEquipment, addWeapon: mocks.addWeapon }));
vi.mock("@/lib/actions/magic-item-actions", () => ({ addMagicItemToPers: mocks.addMagicItemToPers }));
vi.mock("@/lib/catalog-reads", () => ({ fetchHomebrewEntries: mocks.fetchHomebrewEntries }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AddWeaponDialog from "@/lib/components/characterSheet/AddWeaponDialog";

const LONGSWORD = { weaponId: 23, name: "LONGSWORD", damage: "1к8", damageType: "SLASHING", weaponType: "MARTIAL_WEAPON", isRanged: false };
const homebrewItem = (entryId: number, name: string, itemType: string) => ({
  entryId, kind: "ITEM", name, authorName: "Ким",
  item: { magicItemId: 1_000_000 + entryId, itemType, isMundane: true, weaponProfile: { damage: "1к6+СИЛ", damageType: "SLASHING" } },
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Додати зброю", () => {
  it("хоумбрю-зброя — окрема категорія: не вантажиться й не показується, доки її не вибрати; додається як предмет персонажа", async () => {
    mocks.getBaseEquipment.mockResolvedValue({ success: true, weapons: [LONGSWORD] });
    mocks.fetchHomebrewEntries.mockResolvedValue([homebrewItem(84, "GRG. Меч довгий 01", "WEAPON"), homebrewItem(85, "Плащ Ден", "WONDROUS_ITEM")]);
    mocks.addMagicItemToPers.mockResolvedValue({ success: true });
    render(<AddWeaponDialog persId={5} ruleset="RULES_2014" />);

    fireEvent.click(screen.getByRole("button", { name: "Додати зброю" }));
    expect(await screen.findByRole("button", { name: "Додати: Довгий меч" })).toBeTruthy();
    expect(screen.queryByText("GRG. Меч довгий 01")).toBeNull();
    expect(mocks.fetchHomebrewEntries).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Хоумбрю" }));
    await screen.findByRole("button", { name: "Додати: GRG. Меч довгий 01" });
    expect(mocks.fetchHomebrewEntries).toHaveBeenCalledWith(expect.objectContaining({ kind: "ITEM", ruleset: "RULES_2014" }));
    expect(screen.getByText("1к6+СИЛ · Ріжуча · Ким")).toBeTruthy();
    expect(screen.queryByText("Плащ Ден")).toBeNull();
    expect(screen.queryByRole("button", { name: "Додати: Довгий меч" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Додати: GRG. Меч довгий 01" }));
    await vi.waitFor(() => expect(mocks.addMagicItemToPers).toHaveBeenCalledWith({ persId: 5, magicItemId: 1_000_084 }));
    expect(mocks.addWeapon).not.toHaveBeenCalled();
  });
});

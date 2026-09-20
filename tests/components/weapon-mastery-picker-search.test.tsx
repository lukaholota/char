// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import {
  WeaponMasteryPicker,
  findMatchingWeapons,
  type PickableMasteryWeapon,
} from "@/components/weapons/WeaponMasteryPicker";

afterEach(cleanup);

const WEAPONS: PickableMasteryWeapon[] = [
  { weaponId: 1, name: "DAGGER", mastery: "NICK" },
  { weaponId: 2, name: "GREATAXE", mastery: "CLEAVE" },
  { weaponId: 3, name: "HANDAXE", mastery: "VEX" },
  { weaponId: 4, name: "JAVELIN", mastery: "SLOW" },
  { weaponId: 5, name: "MACE", mastery: "SAP" },
  { weaponId: 6, name: "QUARTERSTAFF", mastery: "TOPPLE" },
  { weaponId: 7, name: "SPEAR", mastery: "SAP" },
  { weaponId: 8, name: "LIGHT_HAMMER", mastery: "NICK" },
  { weaponId: 9, name: "CLUB", mastery: "SLOW" },
];

describe("пошук у списку майстерності зброї", () => {
  it("знаходить за українською назвою, англійською і назвою властивості", () => {
    expect(findMatchingWeapons(WEAPONS, "кинджал").map((weapon) => weapon.weaponId)).toEqual([1]);
    expect(findMatchingWeapons(WEAPONS, "light hammer").map((weapon) => weapon.weaponId)).toEqual([8]);
    expect(findMatchingWeapons(WEAPONS, "nick").map((weapon) => weapon.weaponId)).toEqual([1, 8]);
    expect(findMatchingWeapons(WEAPONS, "кидок").map((weapon) => weapon.weaponId)).toEqual([1, 8]);
    expect(findMatchingWeapons(WEAPONS, "  ").map((weapon) => weapon.weaponId)).toHaveLength(WEAPONS.length);
  });

  it("поле пошуку звужує список і очищається хрестиком", () => {
    render(
      <WeaponMasteryPicker options={WEAPONS} selectedWeaponIds={[]} capacity={2} onToggle={vi.fn()} />
    );

    fireEvent.change(screen.getByTestId("weapon-mastery-search"), { target: { value: "кинджал" } });
    expect(screen.getAllByRole("button", { name: /Кинджал/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Велика сокира/ })).toBeNull();

    fireEvent.click(screen.getByLabelText("Очистити пошук зброї"));
    expect(screen.getByRole("button", { name: /Велика сокира/ })).toBeTruthy();
  });

  it("запит без збігів пояснює, що нічого не знайдено", () => {
    render(
      <WeaponMasteryPicker options={WEAPONS} selectedWeaponIds={[]} capacity={2} onToggle={vi.fn()} />
    );

    fireEvent.change(screen.getByTestId("weapon-mastery-search"), { target: { value: "requiem" } });
    expect(screen.getByText(/зброї з майстерністю немає/)).toBeTruthy();
  });

  it("короткий список лишається без поля пошуку", () => {
    render(
      <WeaponMasteryPicker
        options={WEAPONS.slice(0, 3)}
        selectedWeaponIds={[]}
        capacity={2}
        onToggle={vi.fn()}
      />
    );

    expect(screen.queryByTestId("weapon-mastery-search")).toBeNull();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";
import WeaponsCard from "@/lib/components/characterSheet/WeaponsCard";

vi.mock("@/lib/components/characterSheet/AddWeaponDialog", () => ({ default: () => null }));
vi.mock("@/lib/components/characterSheet/CrimsonRiteDialog", () => ({ CrimsonRiteDialog: () => null }));

afterEach(cleanup);

function buildPers2024WithQuarterstaff(): PersWithRelations {
  return {
    level: 1,
    ruleset: "RULES_2024",
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    skills: [], feats: [], features: [], multiclasses: [], armors: [], magicItems: [],
    weapons: [
      {
        persWeaponId: 1,
        weaponId: 7,
        isProficient: true,
        weapon: { weaponId: 7, name: "QUARTERSTAFF", damage: "1d6", damageType: "BLUDGEONING", properties: [], weaponType: "SIMPLE_MELEE", isRanged: false },
      },
    ],
  } as unknown as PersWithRelations;
}

describe("KR31.14 — кубики зброї 2024 кирилицею (L09-sheet-derived-11)", () => {
  it("картка зброї пише «1к6», хоча каталог 2024 зберігає «1d6»", () => {
    render(<WeaponsCard pers={buildPers2024WithQuarterstaff()} onCustomize={vi.fn()} />);
    expect(screen.getByText(/^1к6/)).toBeTruthy();
    expect(screen.queryByText(/1d6/)).toBeNull();
  });
});

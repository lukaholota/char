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

function buildPersWithHomebrewSword(): PersWithRelations {
  const pers = buildPers2024WithQuarterstaff();
  return {
    ...pers,
    weapons: [{ ...pers.weapons[0], overrideName: "GRG. Меч довгий 01", isMagical: false }],
    magicItems: [{
      persWeaponId: 1, isEquipped: true, isAttuned: false,
      magicItem: { name: "GRG. Меч довгий 01", isMundane: true, requiresAttunement: false, weaponProfile: { damage: "1к6+СИЛ", damageType: "SLASHING", extraDamage: [{ count: 1, sides: 4, modifier: 0, damageType: "BLUDGEONING" }] } },
    }],
  } as unknown as PersWithRelations;
}

describe("хоумбрю-зброя в листі", () => {
  it("рядок предмета не повторює назву зброї, а звичайна зброя не позначена «Магічна»", () => {
    render(<WeaponsCard pers={buildPersWithHomebrewSword()} onCustomize={vi.fn()} />);
    expect(screen.getAllByText("GRG. Меч довгий 01")).toHaveLength(1);
    expect(screen.getByText("+1к4 дроблячої шкоди")).toBeTruthy();
    expect(screen.queryByText("Магічна")).toBeNull();
  });
});

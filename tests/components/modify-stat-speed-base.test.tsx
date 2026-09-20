// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";
import ModifyStatModal from "@/lib/components/characterSheet/ModifyStatModal";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/actions/bonus-actions", () => ({
  updateBonus: vi.fn(),
  updateSkillProficiency: vi.fn(),
  saveAbilityAdjustments: vi.fn(),
  updateBaseACOverride: vi.fn(),
  updateMaxHp: vi.fn(),
}));

afterEach(cleanup);

function buildGoliathWithManualSpeedBonus(): PersWithRelations {
  return {
    level: 1,
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    skills: [],
    feats: [],
    race: { speed: 35 },
    speedBonuses: { value: 5 },
  } as unknown as PersWithRelations;
}

describe("L10-sheet-config-03 — модалка швидкості", () => {
  it("показує базою швидкість виду, а не 30", () => {
    render(
      <ModifyStatModal
        open
        onOpenChange={vi.fn()}
        onPersUpdate={vi.fn()}
        pers={buildGoliathWithManualSpeedBonus()}
        config={{ type: "simple", field: "speed" }}
      />,
    );

    const preview = screen.getByText("Базове:").parentElement;
    expect(preview?.textContent).toBe("Базове: 35→Фінальне: 40");
  });
});

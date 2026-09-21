// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";

const updateBonus = vi.hoisted(() => vi.fn(async () => ({ success: true, updatedField: "passiveBonuses", updatedValue: null })));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/actions/bonus-actions", () => ({
  updateBonus,
  updateSkillProficiency: vi.fn(),
  saveAbilityAdjustments: vi.fn(),
  updateBaseACOverride: vi.fn(),
  updateMaxHp: vi.fn(),
}));

import ModifyStatModal from "@/lib/components/characterSheet/ModifyStatModal";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function buildObservantWithManualPassiveBonus(): PersWithRelations {
  return {
    persId: 7,
    level: 1,
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    skills: [],
    feats: [{ feat: { name: "OBSERVANT", ruleset: "RULES_2014", grantsFeature: [] } }],
    passiveBonuses: { PERCEPTION: 2 },
  } as unknown as PersWithRelations;
}

function renderPassivePerception(onPersUpdate = vi.fn()) {
  render(
    <ModifyStatModal
      open
      onOpenChange={vi.fn()}
      onPersUpdate={onPersUpdate}
      pers={buildObservantWithManualPassiveBonus()}
      config={{ type: "passive", skill: "PERCEPTION" as never }}
    />,
  );
  return { onPersUpdate };
}

describe("модалка пасивного значення", () => {
  it("база вже містить +5 «Спостережливого», а ручний бонус іде зверху", () => {
    renderPassivePerception();

    const preview = screen.getByText("Базове:").parentElement;
    expect(preview?.textContent).toBe("Базове: 15→Фінальне: 17");
  });

  it("збереження пише ручний бонус саме до пасивного значення", async () => {
    const { onPersUpdate } = renderPassivePerception();

    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() => expect(updateBonus).toHaveBeenCalledWith(7, "passive", "PERCEPTION", 2));
    expect(onPersUpdate.mock.calls[0][0].passiveBonuses).toEqual({ PERCEPTION: 2 });
  });
});

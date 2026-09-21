// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";
import type { ModifyConfig } from "@/lib/components/characterSheet/ModifyStatModal";

const actions = vi.hoisted(() => ({
  updateBonus: vi.fn(),
  updateSkillProficiency: vi.fn(),
  saveAbilityAdjustments: vi.fn(),
  updateBaseACOverride: vi.fn(),
  updateMaxHp: vi.fn(),
}));
const toastError = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/lib/actions/bonus-actions", () => actions);
vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }));

import ModifyStatModal from "@/lib/components/characterSheet/ModifyStatModal";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function buildPers(): PersWithRelations {
  return {
    persId: 7,
    level: 1,
    str: 10, dex: 12, con: 14, int: 10, wis: 10, cha: 10,
    maxHp: 10,
    currentHp: 10,
    skills: [{ name: "ATHLETICS", proficiencyType: "NONE" }],
    feats: [],
  } as unknown as PersWithRelations;
}

function renderModal(config: ModifyConfig) {
  const pers = buildPers();
  const onPersUpdate = vi.fn();
  const onOpenChange = vi.fn();
  render(<ModifyStatModal open onOpenChange={onOpenChange} onPersUpdate={onPersUpdate} pers={pers} config={config} />);
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  return { pers, onPersUpdate, onOpenChange };
}

describe("модалка бонусу: оптимістичне збереження", () => {
  it("характеристика: лист одразу з новим значенням, потім хіти з відповіді сервера", async () => {
    actions.saveAbilityAdjustments.mockResolvedValue({ success: true, maxHp: 13, currentHp: 12 });
    const { onPersUpdate, onOpenChange } = renderModal({ type: "stat", ability: "CON" as never });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(onPersUpdate).toHaveBeenCalledTimes(2));
    expect(onPersUpdate.mock.calls[0][0].maxHp).toBe(10);
    expect(onPersUpdate.mock.calls[1][0]).toMatchObject({ maxHp: 13, currentHp: 12 });
    expect(refresh).toHaveBeenCalled();
  });

  it("навичка: відмова одного з двох запитів повертає попередній лист і показує її текст", async () => {
    actions.updateBonus.mockResolvedValue({ success: true });
    actions.updateSkillProficiency.mockResolvedValue({ success: false, error: "Немає доступу" });
    const { pers, onPersUpdate } = renderModal({ type: "skill", skill: "ATHLETICS" as never });

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Немає доступу"));
    expect(onPersUpdate.mock.lastCall?.[0]).toBe(pers);
    expect(refresh).toHaveBeenCalled();
  });

  it("ініціатива: обрив мережі повертає попередній лист", async () => {
    actions.updateBonus.mockRejectedValue(new Error("мережа"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { pers, onPersUpdate } = renderModal({ type: "simple", field: "initiative" });

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Помилка при збереженні"));
    expect(onPersUpdate.mock.lastCall?.[0]).toBe(pers);
  });

  it("максимум хітів іде окремою дією й урізає поточні", async () => {
    actions.updateMaxHp.mockResolvedValue({ success: true });
    render(<ModifyStatModal open onOpenChange={vi.fn()} onPersUpdate={vi.fn()} pers={buildPers()} config={{ type: "simple", field: "hp" }} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() => expect(actions.updateMaxHp).toHaveBeenCalledWith(7, 8));
  });
});

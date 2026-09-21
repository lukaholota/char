// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";

type SlotResult = { success: true; currentSpellSlots: number[] };
const pendingSpends = vi.hoisted(() => [] as Array<(result: SlotResult) => void>);
const spendSpellSlot = vi.hoisted(() => vi.fn(() => new Promise<SlotResult>((resolve) => pendingSpends.push(resolve))));
const refresh = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/actions/spell-actions", () => ({ removeSpellFromPers: vi.fn(), setSpellPrepared: vi.fn(), updateSpellBadgeForPers: vi.fn() }));
vi.mock("@/lib/actions/spell-slots", () => ({ spendPactSlot: vi.fn(), spendSpellSlot, restorePactSlot: vi.fn(), restoreSpellSlot: vi.fn() }));
vi.mock("@/hooks/useOfflineQueue", () => ({
  useOfflineQueue: () => ({ isOnline: true, commitOperation: async (_operation: unknown, send: () => Promise<unknown>) => ({ queued: false, result: await send() }) }),
}));
vi.mock("@/lib/actions/feature-uses", () => ({ spendFeatureUse: vi.fn(), restoreFeatureUse: vi.fn(), setFeatureActive: vi.fn() }));
vi.mock("@/lib/components/characterSheet/AddSpellDialog", () => ({ default: () => null }));

import MagicSlide from "@/lib/components/characterSheet/slides/MagicSlide";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  pendingSpends.length = 0;
});

const wizardThree = {
  persId: 7,
  ruleset: "RULES_2024",
  level: 3,
  str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 10,
  currentSpellSlots: [4, 2, 0, 0, 0, 0, 0, 0, 0],
  currentPactSlots: 0,
  class: { name: "WIZARD_2024", primaryCastingStat: "INT", spellcastingType: "FULL" },
  subclass: null,
  race: { name: "HUMAN_2024" },
  feats: [],
  multiclasses: [],
  persSpells: [],
} as unknown as PersWithRelations;

function findFirstLevelSlotButton(): HTMLElement {
  const button = screen.getAllByTitle("Натисніть, щоб керувати слотами").find((element) => element.textContent?.startsWith("1-й"));
  if (!button) throw new Error("немає кнопки слотів 1-го рівня");
  return button;
}

function spendFirstLevelSlot() {
  fireEvent.click(findFirstLevelSlotButton());
  fireEvent.click(screen.getByRole("button", { name: "Витратити" }));
}

describe("слоти заклинань — серія швидких натискань", () => {
  it("друге натискання спрацьовує, поки перше ще чекає на сервер", () => {
    render(<MagicSlide pers={wizardThree} spellcastingSources={[]} onPersUpdate={vi.fn()} />);

    spendFirstLevelSlot();
    spendFirstLevelSlot();

    expect(findFirstLevelSlotButton().textContent).toContain("2/4");
    expect(spendSpellSlot).toHaveBeenCalledTimes(2);
  });

  it("запізніла відповідь першого натискання не відкочує показане число", async () => {
    render(<MagicSlide pers={wizardThree} spellcastingSources={[]} onPersUpdate={vi.fn()} />);
    spendFirstLevelSlot();
    spendFirstLevelSlot();

    await act(async () => pendingSpends[0]({ success: true, currentSpellSlots: [3, 2, 0, 0, 0, 0, 0, 0, 0] }));
    expect(findFirstLevelSlotButton().textContent).toContain("2/4");
    expect(refresh).not.toHaveBeenCalled();

    await act(async () => pendingSpends[1]({ success: true, currentSpellSlots: [2, 2, 0, 0, 0, 0, 0, 0, 0] }));
    expect(findFirstLevelSlotButton().textContent).toContain("2/4");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

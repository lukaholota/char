// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FeatureDisplayType } from "@prisma/client";
import type { CharacterFeatureItem, CharacterFeaturesGroupedResult, PersWithRelations } from "@/lib/actions/pers";

const spendFeatureUse = vi.hoisted(() => vi.fn(async (input: { amount?: number }) => ({ success: true, usesRemaining: 25 - (input.amount ?? 1) })));
const spendSpellSlot = vi.hoisted(() => vi.fn(async () => ({ success: true, currentSpellSlots: [4, 1, 0, 0, 0, 0, 0, 0, 0] })));
const applyHpChange = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const openRoomRoll = vi.hoisted(() => vi.fn());
const operations = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), useParams: () => ({}) }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/actions/feature-uses", () => ({ spendFeatureUse, restoreFeatureUse: vi.fn() }));
vi.mock("@/lib/actions/spell-slots", () => ({ spendSpellSlot, spendPactSlot: vi.fn() }));
vi.mock("@/lib/actions/pers-custom-content-actions", () => ({}));
vi.mock("@/lib/actions/combat-actions", () => ({ applyHpChange }));
vi.mock("@/lib/components/game/open-room-roll", () => ({ openRoomRoll }));
vi.mock("@/hooks/useOfflineQueue", () => ({
  useOfflineQueue: () => ({
    isOnline: true,
    commitOperation: async (operation: { operationId: string }, send: (operationId: string) => Promise<unknown>) => {
      operations.push(operation);
      return { queued: false, result: await send(operation.operationId) };
    },
  }),
}));
vi.mock("@/lib/actions/feature-descriptions", () => ({ saveFeatureDescription: vi.fn() }));
vi.mock("@/lib/actions/subclass-option-rechoice", () => ({ loadSubclassOptionRechoice: vi.fn(), saveSubclassOptionRechoice: vi.fn() }));
vi.mock("@/lib/actions/bastion-actions", () => ({ loadBastion: vi.fn() }));
vi.mock("@/lib/components/characterSheet/FeatsSheetManagerModal", () => ({ FeatsSheetManagerModal: () => null }));
vi.mock("@/lib/components/levelUp/MagicItemInfoModal", () => ({ MagicItemInfoModal: () => null }));
vi.mock("@/lib/components/characterSheet/slides/FeaturesHeaderCards", () => ({ FeaturesHeaderCards: () => null }));
vi.mock("@/lib/components/characterCreator/modals/ClassInfoModal", () => ({ ClassInfoModal: () => null }));
vi.mock("@/lib/components/characterCreator/modals/SubclassInfoModal", () => ({ SubclassInfoModal: () => null }));

import FeaturesSlide from "@/lib/components/characterSheet/slides/FeaturesSlide";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  operations.length = 0;
});

const feature = (fields: Partial<CharacterFeatureItem> & Pick<CharacterFeatureItem, "key" | "name">): CharacterFeatureItem => ({
  description: "Опис",
  displayTypes: [FeatureDisplayType.ACTION],
  primaryType: FeatureDisplayType.ACTION,
  source: "CLASS",
  sourceName: "Паладин",
  ...fields,
});

const layOnHands = feature({ key: "loh", featureId: 2368, name: "Накладання рук", engName: "Lay on Hands", usesPer: 25, usesRemaining: 25, usePrice: 1, restType: "LONG_REST" });
const divineSmite = feature({ key: "smite", featureId: 2370, name: "Божественна кара", engName: "Divine Smite", displayTypes: [FeatureDisplayType.PASSIVE], primaryType: FeatureDisplayType.PASSIVE });

const paladinFive = {
  persId: 3,
  ruleset: "RULES_2014",
  level: 5,
  currentHp: 30,
  maxHp: 44,
  currentSpellSlots: [4, 2, 0, 0, 0, 0, 0, 0, 0],
  currentPactSlots: 0,
  classId: 1,
  class: { name: "PALADIN", spellcastingType: "HALF" },
  subclass: null,
  multiclasses: [],
  race: { name: "HUMAN" },
  background: { name: "ACOLYTE" },
  feats: [],
  skills: [],
  choiceOptions: [],
} as unknown as PersWithRelations;

const groupedFeatures: CharacterFeaturesGroupedResult = { actions: [layOnHands], bonusActions: [], reactions: [], passive: [divineSmite] };

function renderSheet(pers: PersWithRelations = paladinFive) {
  const onPersUpdate = vi.fn();
  render(<FeaturesSlide pers={pers} groupedFeatures={groupedFeatures} onPersUpdate={onPersUpdate} />);
  return { onPersUpdate };
}

describe("Божественна кара 2014 однією кнопкою", () => {
  it("тап по слоту списує саме його й кидає кубики кари в ціль", async () => {
    const { onPersUpdate } = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: /Кара · 3к8.*Слот 2-го рівня · лишилось 2/ }));

    expect(onPersUpdate).toHaveBeenCalledWith(expect.objectContaining({ currentSpellSlots: [4, 1, 0, 0, 0, 0, 0, 0, 0] }));
    await waitFor(() => expect(spendSpellSlot).toHaveBeenCalledWith(3, 2, expect.any(String)));
    expect(operations[0]).toMatchObject({ kind: "spend-spell-slot", slotLevel: 2, persId: 3 });
    expect(openRoomRoll).toHaveBeenCalledWith(expect.objectContaining({
      title: "Божественна кара",
      autoRollKey: "divine-smite",
      actions: [expect.objectContaining({ label: "Шкода", count: 3, sides: 8, isD20: false })],
    }));
  });

  it("по нежиті кара на кістку більша", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /Нежить чи нечисть/ }));
    fireEvent.click(screen.getByRole("button", { name: /Слот 1-го рівня/ }));
    expect(openRoomRoll).toHaveBeenCalledWith(expect.objectContaining({ actions: [expect.objectContaining({ count: 3 })] }));
  });

  it("без слотів кнопки вимкнені й лист пояснює чому", () => {
    renderSheet({ ...paladinFive, currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0] } as PersWithRelations);
    expect(screen.getByRole("button", { name: /Слот 1-го рівня/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Слотів не лишилось/)).toBeTruthy();
  });
});

describe("«Зцілити N» для Накладання рук", () => {
  it("пропонує стільки, скільки бракує хітів, і лікує себе одним запитом", async () => {
    const { onPersUpdate } = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Зцілити" }));
    expect((screen.getByRole("spinbutton", { name: "Скільки очок витратити" }) as HTMLInputElement).value).toBe("14");
    fireEvent.click(screen.getByRole("button", { name: "Зцілити себе: +14" }));

    await waitFor(() => expect(applyHpChange).toHaveBeenCalledWith(expect.objectContaining({ persId: 3, mode: "heal", amount: 14 })));
    expect(spendFeatureUse).toHaveBeenCalledTimes(1);
    expect(spendFeatureUse).toHaveBeenCalledWith(expect.objectContaining({ featureId: 2368, amount: 14 }));
    expect(operations).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "feature-use", amount: 14 })]));
    expect(onPersUpdate).toHaveBeenCalledWith(expect.objectContaining({ currentHp: 44 }));
    await waitFor(() => expect(screen.getByText("11")).toBeTruthy());
  });

  it("союзнику — лише витрата з резерву, без зміни своїх хітів", async () => {
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Зцілити" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Скільки очок витратити" }), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Союзнику: витратити 5" }));

    await waitFor(() => expect(spendFeatureUse).toHaveBeenCalledWith(expect.objectContaining({ amount: 5 })));
    expect(applyHpChange).not.toHaveBeenCalled();
  });

  it("з повними хітами себе не лікує, але союзнику витратити можна", () => {
    renderSheet({ ...paladinFive, currentHp: 44 } as PersWithRelations);
    fireEvent.click(screen.getByRole("button", { name: "Зцілити" }));
    expect(screen.getByRole("button", { name: "Ваші хіти повні" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Союзнику: витратити 1" }).hasAttribute("disabled")).toBe(false);
  });
});

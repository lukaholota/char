// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";

const spendSpellSlot = vi.hoisted(() => vi.fn(async () => ({ success: true, currentSpellSlots: [4, 1, 0, 0, 0, 0, 0, 0, 0] })));
const spendFeatureUse = vi.hoisted(() => vi.fn(async () => ({ success: true, usesRemaining: 0 })));
const setSpellPrepared = vi.hoisted(() =>
  vi.fn(async (input: { isPrepared: boolean }) => ({ success: true, isPrepared: input.isPrepared })),
);

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/actions/spell-actions", () => ({ removeSpellFromPers: vi.fn(), setSpellPrepared, updateSpellBadgeForPers: vi.fn() }));
vi.mock("@/lib/actions/spell-slots", () => ({ spendPactSlot: vi.fn(), spendSpellSlot, restorePactSlot: vi.fn(), restoreSpellSlot: vi.fn() }));
vi.mock("@/hooks/useOfflineQueue", () => ({
  useOfflineQueue: () => ({ isOnline: true, commitOperation: async (_operation: unknown, send: () => Promise<unknown>) => ({ queued: false, result: await send() }) }),
}));
vi.mock("@/lib/actions/feature-uses", () => ({ spendFeatureUse, restoreFeatureUse: vi.fn(), setFeatureActive: vi.fn() }));
vi.mock("@/lib/components/characterSheet/AddSpellDialog", () => ({ default: () => null }));

import { toast } from "sonner";
import MagicSlide from "@/lib/components/characterSheet/slides/MagicSlide";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const persSpell = (spellId: number, name: string, level: number) => ({
  persSpellId: spellId,
  spellId,
  isPrepared: true,
  badgeText: "Чарівник",
  excludeFromPreparedCount: false,
  excludeFromKnownCount: false,
  spell: { spellId, name, engName: name, level, ruleset: "RULES_2024", castingTime: "1 дія", range: "120 футів" },
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
  persSpells: [persSpell(1, "Magic Missile", 1), persSpell(2, "Fire Bolt", 0)],
} as unknown as PersWithRelations;

/// Кнопки рядків розрізняються лише назвою заклинання поряд, тож шукаємо їх у межах свого рядка.
function findSpellRow(spellName: string): HTMLElement {
  const title = screen.getByText(new RegExp(spellName));
  const row = title.closest("li") ?? title.parentElement?.parentElement?.parentElement;
  if (!row) throw new Error(`не знайшов рядок заклинання ${spellName}`);
  return row as HTMLElement;
}

function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
}

/// Риса дає заклинання рядком із `origin: FEAT`, а лічильник безкоштовного застосування —
/// фічею обраної в рисі опції (Р38): персонаж мусить нести обидва кінці цього звʼязку.
const initiateWizard = {
  ...wizardThree,
  persSpells: [
    ...wizardThree.persSpells,
    { ...persSpell(3, "Bless", 1), origin: "FEAT", sourceName: "MAGIC_INITIATE", badgeText: "Посвячений у магію", excludeFromPreparedCount: true },
    /// Гравець вивів заклинання з ліміту сам: поза лімітом, але правило його не «завжди підготовує».
    { ...persSpell(4, "Cure Wounds", 1), origin: "MANUAL", badgeText: "Підклас", excludeFromPreparedCount: true },
  ],
  feats: [
    {
      feat: { name: "MAGIC_INITIATE" },
      choices: [
        {
          choiceOption: {
            features: [
              { feature: { featureId: 900, name: "Посвячений у магію: список клірика", usesCount: 1, usesCountSpecial: null, usesCountDependsOnProficiencyBonus: false, limitedUsesPer: "LONG_REST" } },
            ],
          },
        },
      ],
    },
  ],
  features: [{ featureId: 900, usesRemaining: null }],
} as unknown as PersWithRelations;

describe("Р38 — безкоштовне застосування заклинання риси з рядка заклинання", () => {
  it("Благословення від «Посвяченого у магію» пропонує застосування без слоту й витрачає використання риси", async () => {
    render(<MagicSlide pers={initiateWizard} spellcastingSources={[]} onPersUpdate={vi.fn()} />);

    openMenu(screen.getByRole("button", { name: "Накласти «Bless»" }));

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Без слоту — Посвячений у магію: список клірика1",
      "Слот 1-го рівня4",
      "Слот 2-го рівня2",
    ]);

    fireEvent.click(screen.getByRole("menuitem", { name: /Без слоту/ }));

    await waitFor(() => expect(spendFeatureUse).toHaveBeenCalledWith({ persId: 7, featureId: 900 }));
    expect(spendSpellSlot).not.toHaveBeenCalled();
  });

  it("заклинання, яке риса тримає підготованим, зняти не можна", async () => {
    render(<MagicSlide pers={initiateWizard} spellcastingSources={[]} onPersUpdate={vi.fn()} />);

    const locked = within(findSpellRow("Bless")).getByRole("button", { name: "Завжди підготоване" });

    expect(locked.hasAttribute("disabled")).toBe(true);
    fireEvent.click(locked);
    expect(setSpellPrepared).not.toHaveBeenCalled();
  });

  it("зняття підготовки із заклинання поза лімітом не називає числа ліміту класу", async () => {
    render(<MagicSlide pers={initiateWizard} spellcastingSources={[]} onPersUpdate={vi.fn()} />);

    fireEvent.click(within(findSpellRow("Cure Wounds")).getByRole("button", { name: "Зняти підготовку" }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Підготовку знято"));
    expect(vi.mocked(toast.info).mock.calls.flat().join(" ")).not.toContain("підготувати");
  });

  it("заклинання класу безкоштовного застосування не отримує", async () => {
    render(<MagicSlide pers={initiateWizard} spellcastingSources={[]} onPersUpdate={vi.fn()} />);

    openMenu(screen.getByRole("button", { name: "Накласти «Magic Missile»" }));

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["Слот 1-го рівня4", "Слот 2-го рівня2"]);
  });
});

describe("L19-parity-competitors-14 — «Накласти» з рядка заклинання витрачає обраний слот", () => {
  it("Чарівна стріла накладається слотом 2-го рівня, а замовлянню кнопки немає", async () => {
    render(<MagicSlide pers={wizardThree} spellcastingSources={[]} onPersUpdate={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Накласти «Fire Bolt»" })).toBeNull();
    const trigger = screen.getByRole("button", { name: "Накласти «Magic Missile»" });
    // Лист — карусель Swiper, яка гасить pointerdown; jsdom її не відтворює, у Chromium без класу меню не відкривалося.
    expect(trigger.classList.contains("swiper-no-swiping")).toBe(true);
    openMenu(trigger);

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["Слот 1-го рівня4", "Слот 2-го рівня2"]);
    fireEvent.click(screen.getByRole("menuitem", { name: /Слот 2-го рівня/ }));

    await waitFor(() => expect(spendSpellSlot).toHaveBeenCalledWith(7, 2));
    expect(spendSpellSlot).toHaveBeenCalledTimes(1);
  });
});

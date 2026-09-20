// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";
import { SheetStatesProvider } from "@/lib/components/characterSheet/states/SheetStatesContext";
import { StatusChips } from "@/lib/components/characterSheet/states/StatusChips";
import { StatesSheet } from "@/lib/components/characterSheet/states/StatesSheet";
import type { SheetStatesControl } from "@/lib/components/characterSheet/states/useSheetStates";

afterEach(cleanup);

const HASTE = { spellId: 501, name: "Прискорення [Haste]", engName: "Haste", hasConcentration: "так" };
const RAGE = { featureId: 10, engName: "Barbarian: Rage (2024)", name: "Лють" };

const effect = (effectKey: string, extra: Record<string, unknown> = {}) => ({ persEffectId: 1, effectKey, spellId: null, endsWithConcentration: false, spell: null, ...extra });

function buildControl(overrides: Partial<SheetStatesControl> = {}, effects: unknown[] = [], isRaging = false): SheetStatesControl {
  const pers = {
    persId: 1,
    ruleset: "RULES_2024",
    level: 5,
    str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 10,
    exhaustionLevel: 0,
    effects,
    features: [{ featureId: RAGE.featureId, isActive: isRaging, usesRemaining: 2, feature: RAGE }],
    class: { name: "BARBARIAN_2024", features: [] },
    subclass: null, multiclasses: [], race: { traits: [] }, subrace: null, raceVariants: [], raceChoiceOptions: [],
    choiceOptions: [], classOptionalFeatures: [], feats: [], magicItems: [], armors: [], statBonuses: {}, statModifierBonuses: {},
  } as unknown as PersWithRelations;
  const concentration = (effects as Array<{ effectKey: string }>).find((row) => row.effectKey === "CONCENTRATION") ?? null;
  return {
    pers,
    statesPers: pers,
    isReadOnly: false,
    catalog: [
      { key: "MAGE_ARMOR", spellId: 11, name: "Обладунок мага [Mage Armor]" },
      { key: "BLESS", spellId: 12, name: "Благословення [Bless]" },
      { key: "ENLARGE", spellId: 13, name: "Збільшення/Зменшення [Enlarge/Reduce]" },
    ],
    toggleableFeatures: [RAGE as never],
    activeFeatures: isRaging ? [RAGE as never] : [],
    concentration: concentration as never,
    activeBuffKeys: (effects as Array<{ effectKey: string }>).map((row) => row.effectKey).filter((key) => key !== "CONCENTRATION") as never,
    exhaustionLevel: 0,
    isPanelOpen: false,
    setPanelOpen: vi.fn(),
    isFeatureActive: () => isRaging,
    canActivateFeature: () => true,
    findFeatureUses: () => ({ remaining: 2, max: 3 }),
    setFeatureActive: vi.fn(),
    setConcentration: vi.fn(),
    setBuff: vi.fn(),
    setExhaustion: vi.fn(),
    onSpellCast: vi.fn(),
    promptConcentrationCheck: vi.fn(),
    ...overrides,
  };
}

function renderWith(control: SheetStatesControl) {
  render(
    <SheetStatesProvider control={control}>
      <StatusChips />
      <StatesSheet />
    </SheetStatesProvider>,
  );
}

describe("O39 — чипи станів у шапці", () => {
  it("без станів — одна непомітна кнопка «Стан», у режимі читання — нічого", () => {
    renderWith(buildControl());
    expect(screen.getByRole("button", { name: "Стани персонажа" }).textContent).toContain("Стан");
    cleanup();
    renderWith(buildControl({ isReadOnly: true }));
    expect(screen.queryByRole("button", { name: "Стани персонажа" })).toBeNull();
  });

  it("баф, що тримається на концентрації, не дублює чип концентрації", () => {
    renderWith(buildControl({}, [effect("CONCENTRATION", { spellId: 501, spell: HASTE }), effect("HASTE", { spellId: 501, spell: HASTE, endsWithConcentration: true })]));
    expect(screen.getByRole("button", { name: "Концентрація: Прискорення" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Діє: Прискорення" })).toBeNull();
  });

  it("понад три стани ховаються під «+N», тап відкриває шторку", () => {
    const control = buildControl({ exhaustionLevel: 2 }, [effect("MAGE_ARMOR"), effect("BLESS"), effect("ENLARGE")], true);
    renderWith(control);
    const more = screen.getByRole("button", { name: "Ще 2 стани" });
    expect(more.textContent).toBe("+2");
    fireEvent.click(more);
    expect(control.setPanelOpen).toHaveBeenCalledWith(true);
  });

  it("рівень виснаження видно цифрою навіть у стиснутому чипі", () => {
    renderWith(buildControl({ exhaustionLevel: 3 }));
    expect(screen.getByRole("button", { name: "Виснаження, рівень 3" }).textContent).toBe("3");
  });

  it("баф на концентрації — один рядок шторки з його ефектами, а не два", () => {
    renderWith(
      buildControl({ isPanelOpen: true }, [
        effect("CONCENTRATION", { spellId: 501, spell: HASTE }),
        effect("HASTE", { spellId: 501, spell: HASTE, endsWithConcentration: true }),
      ]),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Завершити концентрацію на «Прискорення»" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Завершити: Прискорення" })).toBeNull();
    expect(within(dialog).getAllByText(/швидкість ×2/).length).toBeGreaterThan(0);
  });

  it("Збільшення/Зменшення показує лише ту половину, що діє", () => {
    renderWith(buildControl({}, [effect("ENLARGE")]));
    expect(screen.getByRole("button", { name: "Діє: Збільшення" })).toBeTruthy();
  });
});

describe("O39 — шторка станів", () => {
  it("активний баф має підсумок і хрестик, що його знімає", () => {
    const control = buildControl({ isPanelOpen: true }, [effect("MAGE_ARMOR")]);
    renderWith(control);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByText("КБ 13 + Спр").length).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Завершити: Обладунок мага" }));
    expect(control.setBuff).toHaveBeenCalledWith("MAGE_ARMOR", false);
  });

  it("плитка бафа вмикає його; увімкнена позначена натиснутою", () => {
    const control = buildControl({ isPanelOpen: true }, [effect("BLESS")]);
    renderWith(control);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Благословення: +к4 до атак" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(dialog).getByRole("button", { name: "Обладунок мага: КБ 13 + Спр" }));
    expect(control.setBuff).toHaveBeenCalledWith("MAGE_ARMOR", true);
  });

  it("виснаження змінюється степером, а риса вмикається кнопкою з лічильником", () => {
    const control = buildControl({ isPanelOpen: true });
    renderWith(control);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Збільшити виснаження" }));
    expect(control.setExhaustion).toHaveBeenCalledWith(1);
    expect((within(dialog).getByRole("button", { name: "Зменшити виснаження" }) as HTMLButtonElement).disabled).toBe(true);

    const rageButton = within(dialog).getByRole("button", { name: /Лють/ });
    expect(rageButton.textContent).toContain("2/3");
    fireEvent.click(rageButton);
    expect(control.setFeatureActive).toHaveBeenCalledWith(RAGE.featureId, true);
  });

  it("без використань риса не вмикається", () => {
    renderWith(buildControl({ isPanelOpen: true, findFeatureUses: () => ({ remaining: 0, max: 3 }) }));
    expect((within(screen.getByRole("dialog")).getByRole("button", { name: /Лють/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

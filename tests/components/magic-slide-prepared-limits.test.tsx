// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/actions/spell-actions", () => ({ removeSpellFromPers: vi.fn(), setSpellPrepared: vi.fn(), updateSpellBadgeForPers: vi.fn() }));
vi.mock("@/lib/actions/spell-slots", () => ({ spendPactSlot: vi.fn(), spendSpellSlot: vi.fn(), restorePactSlot: vi.fn(), restoreSpellSlot: vi.fn() }));
vi.mock("@/hooks/useOfflineQueue", () => ({ useOfflineQueue: () => ({ isOnline: true, commitOperation: vi.fn() }) }));
vi.mock("@/lib/components/characterSheet/AddSpellDialog", () => ({ default: () => null }));

import MagicSlide from "@/lib/components/characterSheet/slides/MagicSlide";

afterEach(cleanup);

const persSpell = (spellId: number, name: string, badgeText: string) => ({
  persSpellId: spellId,
  spellId,
  isPrepared: true,
  badgeText,
  excludeFromPreparedCount: false,
  excludeFromKnownCount: false,
  spell: { spellId, name, engName: name, level: 1, ruleset: "RULES_2024" },
});

const pers = {
  persId: 1,
  ruleset: "RULES_2024",
  level: 7,
  str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 14,
  currentSpellSlots: [],
  currentPactSlots: 0,
  class: { name: "RANGER_2024", primaryCastingStat: "WIS" },
  subclass: null,
  race: { name: "HUMAN_2024" },
  feats: [],
  multiclasses: [{ classLevel: 3, class: { name: "SORCERER_2024", primaryCastingStat: "CHA" }, subclass: null }],
  persSpells: [
    persSpell(1, "Hunter's Mark", "Слідопит"),
    ...["Burning Hands", "Charm Person", "Chromatic Orb", "Magic Missile", "Shield", "Sleep", "Thunderwave"].map((name, index) => persSpell(10 + index, name, "Чародій")),
  ],
} as unknown as PersWithRelations;

describe("L07-spellcasting-12 — лист мультикласу 2024 показує ліміт підготовлених за класом", () => {
  it("Слідопит 4 / Чародій 3: 1 / 5 і 7 / 6 окремо, без спільної стелі 11", () => {
    render(<MagicSlide pers={pers} spellcastingSources={[]} onPersUpdate={vi.fn()} isReadOnly />);
    fireEvent.click(screen.getByText("Кількість відомих / підготовлених"));

    expect(screen.getAllByText(/^Підготовлено:/).map((node) => node.textContent)).toEqual(["Підготовлено: 1 / 5", "Підготовлено: 7 / 6"]);
    expect(screen.getByText(/^Заклинань:/).textContent).toBe("Заклинань: 8 · Замовлянь: 0 · Підготовлено: 8");
  });

  it("чарівник 2024 бачить «Книга заклинань: X / Y» під своїм рядком", () => {
    const wizard = {
      ...pers,
      level: 3,
      class: { name: "WIZARD_2024", primaryCastingStat: "INT" },
      multiclasses: [],
      persSpells: ["Shield", "Sleep", "Magic Missile", "Misty Step"].map((name, index) => ({ ...persSpell(30 + index, name, "Чарівник"), isPrepared: index < 2 })),
    } as unknown as PersWithRelations;
    render(<MagicSlide pers={wizard} spellcastingSources={[]} onPersUpdate={vi.fn()} isReadOnly />);
    fireEvent.click(screen.getByText("Кількість відомих / підготовлених"));

    expect(screen.getByText(/^Книга заклинань:/).textContent).toBe("Книга заклинань: 4 / 10");
  });
});


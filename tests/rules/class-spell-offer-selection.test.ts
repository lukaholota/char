import { describe, expect, it } from "vitest";
import type { ClassSpellOffer } from "@/rules/class-spell-choices-2024";
import { findClassSpellSelectionProblem } from "@/rules/class-spell-choices-2024";
import { findPreparableSpells, keepOfferedClassSpells, keepOfferedSpells } from "@/rules/class-spell-offer-selection";

function spell(spellId: number, level = 1) {
  return { spellId, level, school: null, name: `Заклинання ${spellId}`, engName: `Spell ${spellId}` };
}

function buildOffer(overrides: Partial<ClassSpellOffer> = {}): ClassSpellOffer {
  return {
    className: "SORCERER_2014", classLabel: "Чародій", ruleset: "RULES_2014",
    quota: { cantrips: 1, prepared: 1, spellbook: 0, maxSpellLevel: 1 },
    catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
    cantrips: [spell(1, 0), spell(2, 0)],
    spells: [spell(10), spell(11), spell(12)],
    bookSpells: [],
    bookOnlySpellIds: [],
    swap: { droppableCantrips: [], droppableSpells: [spell(20)] },
    canSkipPrepared: false,
    ...overrides,
  };
}

describe("вибір заклинань у межах чинної пропозиції рівня", () => {
  it("відкидає непропоновані й зайві понад квоту", () => {
    const kept = keepOfferedSpells({ cantripIds: [99, 1, 2], preparedIds: [10, 11], spellbookIds: [10] }, buildOffer());

    expect(kept).toEqual({ cantripIds: [1], preparedIds: [10], spellbookIds: [] });
  });

  it("лишає заміну лише з наявного заклинання на пропоноване", () => {
    const offer = buildOffer();

    expect(keepOfferedSpells({ cantripIds: [], preparedIds: [], spellbookIds: [], preparedSwap: { dropId: 20, addId: 11 } }, offer).preparedSwap).toEqual({ dropId: 20, addId: 11 });
    expect(keepOfferedSpells({ cantripIds: [], preparedIds: [], spellbookIds: [], preparedSwap: { dropId: 20, addId: 99 } }, offer).preparedSwap).toEqual({ dropId: 20, addId: null });
    expect(keepOfferedSpells({ cantripIds: [], preparedIds: [], spellbookIds: [], preparedSwap: { dropId: 21, addId: 11 } }, offer)).not.toHaveProperty("preparedSwap");
    expect(keepOfferedSpells({ cantripIds: [], preparedIds: [], spellbookIds: [], cantripSwap: { dropId: null, addId: null } }, offer)).not.toHaveProperty("cantripSwap");
  });

  it("чарівник готує лише з книги: щойно вписаного або вже наявного, крім тільки-книжкових", () => {
    const wizard = buildOffer({ quota: { cantrips: 0, prepared: 2, spellbook: 2, maxSpellLevel: 1 }, bookSpells: [spell(30)], bookOnlySpellIds: [11], swap: null });

    expect(findPreparableSpells(wizard, { cantripIds: [], preparedIds: [], spellbookIds: [10, 11] }).map((entry) => entry.spellId)).toEqual([30, 10]);
    expect(keepOfferedSpells({ cantripIds: [], preparedIds: [10, 12, 30], spellbookIds: [10, 11, 12] }, wizard)).toEqual({ cantripIds: [], preparedIds: [10, 30], spellbookIds: [10, 11] });
  });

  it("левелап відправляє вибір, урізаний до чинної квоти: ручне заклинання на аркуші вже закрило таблицю", () => {
    const swapOnly = buildOffer({ className: "BARD_2014", classLabel: "Бард", quota: { cantrips: 0, prepared: 0, spellbook: 0, maxSpellLevel: 1 } });
    const staleForm = { expectedLevel: 4, classSpells: { cantripIds: [] as number[], preparedIds: [10], spellbookIds: [] } };

    const submitted = keepOfferedClassSpells(staleForm, swapOnly);

    expect(submitted).toEqual({ expectedLevel: 4, classSpells: { cantripIds: [], preparedIds: [], spellbookIds: [] } });
    const filters = { cantrips: { levels: [0], schools: null, spellList: "Бард" }, spells: { levels: [1], schools: null, spellList: "Бард" } };
    const findProblem = (selection: typeof staleForm.classSpells) =>
      findClassSpellSelectionProblem({ quota: swapOnly.quota, filters, selection, candidates: swapOnly.spells, usesSpellbook: false, bookSpellIds: [], unavailableSpellIds: [], spellsCountLabel: "нових заклинань" });
    expect(findProblem(staleForm.classSpells)).toBe("Оберіть нових заклинань: 0");
    expect(findProblem(submitted.classSpells!)).toBeNull();
  });

  it("без пропозиції чи вибору форма йде як є", () => {
    const form = { classSpells: { cantripIds: [1], preparedIds: [], spellbookIds: [] } };

    expect(keepOfferedClassSpells(form, null)).toBe(form);
    expect(keepOfferedClassSpells({ expectedLevel: 2 }, buildOffer())).toEqual({ expectedLevel: 2 });
  });
});

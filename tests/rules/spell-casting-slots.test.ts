import { describe, expect, it } from "vitest";
import { listCastingSlotOptions } from "@/rules/spell-casting-slots";

const wizardFive = { currentSpellSlots: [4, 0, 2, 0, 0, 0, 0, 0, 0], maxSpellSlots: [4, 3, 2, 0, 0, 0, 0, 0, 0], pact: null };

describe("L19-parity-competitors-14 — накласти заклинання слотом його рівня або вищим", () => {
  it("заклинання 2-го рівня пропонує слоти 2-го й 3-го рівня, порожній 2-й — із нулем", () => {
    expect(listCastingSlotOptions({ spellLevel: 2, ...wizardFive })).toEqual([
      { kind: "SPELL_SLOT", slotLevel: 2, remaining: 0 },
      { kind: "SPELL_SLOT", slotLevel: 3, remaining: 2 },
    ]);
  });

  it("замовлянню слот не потрібен", () => {
    expect(listCastingSlotOptions({ spellLevel: 0, ...wizardFive })).toEqual([]);
  });

  it("безкоштовне застосування від риси йде перед слотами", () => {
    const freeCasts = [{ spellId: 11, featureId: 49277, featureName: "Посвячений у магію: список клірика", remaining: 1, maxUses: 1 }];

    expect(listCastingSlotOptions({ spellLevel: 1, ...wizardFive, freeCasts })).toEqual([
      { kind: "FREE_USE", featureId: 49277, featureName: "Посвячений у магію: список клірика", remaining: 1 },
      { kind: "SPELL_SLOT", slotLevel: 1, remaining: 4 },
      { kind: "SPELL_SLOT", slotLevel: 2, remaining: 0 },
      { kind: "SPELL_SLOT", slotLevel: 3, remaining: 2 },
    ]);
  });

  it("слот пакту — лише коли його рівень не нижчий за заклинання", () => {
    const warlock = { currentSpellSlots: Array(9).fill(0), maxSpellSlots: Array(9).fill(0), pact: { current: 1, max: 2, slotLevel: 2 } };

    expect(listCastingSlotOptions({ spellLevel: 1, ...warlock })).toEqual([{ kind: "PACT_SLOT", slotLevel: 2, remaining: 1 }]);
    expect(listCastingSlotOptions({ spellLevel: 3, ...warlock })).toEqual([]);
  });
});

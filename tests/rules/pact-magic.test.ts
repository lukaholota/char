import { describe, expect, it } from "vitest";
import { Classes, SpellcastingType } from "@prisma/client";
import { calculateCasterLevel, type SpellcastingPersLike } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";

describe("KR2.5 — Pact Magic за PHB 2014", () => {
  // PHB 2014, с. 107 «The Warlock»; PHB 2014, с. 164 «Multiclassing → Spell Slots».
  it("не змішує pact level зі стандартним caster level", () => {
    const pers = {
      ruleset: "RULES_2014" as const,
      level: 10,
      class: { name: Classes.WIZARD_2014, spellcastingType: SpellcastingType.FULL },
      subclass: null,
      multiclasses: [{
        classLevel: 5,
        class: { name: Classes.WARLOCK_2014, spellcastingType: SpellcastingType.PACT },
        subclass: null,
      }],
    } satisfies SpellcastingPersLike;

    expect(calculateCasterLevel(pers)).toEqual({ casterLevel: 5, pactLevel: 5 });
    expect(SPELL_SLOT_PROGRESSION.PACT[5]).toEqual({ slots: 2, level: 3 });
  });
});

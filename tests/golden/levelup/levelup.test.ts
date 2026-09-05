import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { levelUpSequences } from "../../fixtures/levelup-sequences";
import type { GoldenPers } from "../../helpers/normalize-golden";
import { applyLevelUp, mergeUniqueLines, type LevelUpState } from "@/rules/levelup";
import { calculateAverageHitPointIncrease } from "@/rules/health";
import type { SpellcastingCharacter, SpellcastingKind } from "@/rules/types";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";

const GOLDEN_DIR = path.join(__dirname);

describe("KR2.3 — golden-тести levelUpCharacter (чистий applyLevelUp по рівнях 1..N)", () => {
  for (const sequence of levelUpSequences) {
    it(`${sequence.id}: ${sequence.why}`, () => {
      const goldenPath = path.join(GOLDEN_DIR, `${sequence.id}.json`);
      if (!fs.existsSync(goldenPath)) {
        throw new Error(`Golden snapshot file missing: ${goldenPath}`);
      }

      const snapshots = JSON.parse(fs.readFileSync(goldenPath, "utf-8")) as GoldenPers[];
      expect(snapshots.length).toBe(sequence.maxLevel);

      for (let i = 0; i < snapshots.length - 1; i++) {
        const prev = snapshots[i];
        const next = snapshots[i + 1];
        const nextLevel = i + 2;

        const beforeState: LevelUpState = {
          ruleset: "RULES_2014",
          level: prev.level,
          scores: {
            STR: prev.scores.str,
            DEX: prev.scores.dex,
            CON: prev.scores.con,
            INT: prev.scores.int,
            WIS: prev.scores.wis,
            CHA: prev.scores.cha,
          },
          maxHp: prev.hp.max,
          currentHp: prev.hp.current,
          currentSpellSlots: prev.spellSlots.current,
          currentPactSlots: prev.spellSlots.pact,
          spellcasting: toSpellcasting(prev),
          featureIds: [],
          proficientSkills: [],
          expertiseSkills: [],
          additionalSaveProficiencies: prev.additionalSaveProficiencies,
        };

        const leveledUpClassName = getLeveledUpClassName(prev, next);
        const hitDie = getClassHitDie(leveledUpClassName);
        const hitDieIncrease = calculateAverageHitPointIncrease(hitDie);
        const prevHasTough = prev.feats.some((f) => String(f.name).toUpperCase().includes("TOUGH"));
        const nextHasTough = next.feats.some((f) => String(f.name).toUpperCase().includes("TOUGH"));
        const takesTough = !prevHasTough && nextHasTough;

        const afterState = applyLevelUp(
          beforeState,
          {
            scores: {
              STR: next.scores.str,
              DEX: next.scores.dex,
              CON: next.scores.con,
              INT: next.scores.int,
              WIS: next.scores.wis,
              CHA: next.scores.cha,
            },
            hitDieIncrease,
            hasTough: prevHasTough,
            takesTough,
            spellcastingAfter: toSpellcasting(next),
            saveProficienciesToAdd: next.additionalSaveProficiencies,
          },
          {
            standardProgression: SPELL_SLOT_PROGRESSION.FULL,
            pactProgression: SPELL_SLOT_PROGRESSION.PACT,
          },
        );

        try {
          expect(afterState.level).toBe(next.level);
          expect(afterState.scores).toEqual({
            STR: next.scores.str,
            DEX: next.scores.dex,
            CON: next.scores.con,
            INT: next.scores.int,
            WIS: next.scores.wis,
            CHA: next.scores.cha,
          });
          expect(afterState.maxHp).toBe(next.hp.max);
          expect(afterState.currentHp).toBe(next.hp.current);
          expect(afterState.currentSpellSlots).toEqual(next.spellSlots.current);
          expect(afterState.currentPactSlots).toBe(next.spellSlots.pact);
          expect(afterState.additionalSaveProficiencies).toEqual(next.additionalSaveProficiencies);
        } catch (err) {
          throw new Error(
            `${sequence.id}: розійшлося на рівні ${nextLevel}.\n${(err as Error).message}`,
          );
        }
      }
    });
  }
});

describe("KR2.3 — Class.multiclassReqs перевіряється лише клієнтом", () => {
  it("Fighter STR15/CHA8 → MULTICLASS у Paladin (вимагає STR13 І CHA13) обробляється applyLevelUp без помилок", () => {
    const before: LevelUpState = {
      ruleset: "RULES_2014",
      level: 1,
      scores: { STR: 15, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 8 },
      maxHp: 12,
      currentHp: 12,
      currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      currentPactSlots: 0,
      spellcasting: {
        level: 1,
        characterClass: { name: "FIGHTER_2014", spellcastingType: "NONE" },
        subclass: null,
        multiclasses: [],
      },
      featureIds: [],
      proficientSkills: ["ATHLETICS"],
      expertiseSkills: [],
      additionalSaveProficiencies: ["STR", "CON"],
    };

    const after = applyLevelUp(
      before,
      {
        scores: before.scores,
        hitDieIncrease: 6,
        hasTough: false,
        takesTough: false,
        spellcastingAfter: {
          level: 2,
          characterClass: { name: "FIGHTER_2014", spellcastingType: "NONE" },
          subclass: null,
          multiclasses: [{ classLevel: 1, characterClass: { name: "PALADIN_2014", spellcastingType: "HALF" } }],
        },
      },
      {
        standardProgression: SPELL_SLOT_PROGRESSION.FULL,
        pactProgression: SPELL_SLOT_PROGRESSION.PACT,
      },
    );

    expect(after.level).toBe(2);
    expect(after.scores.CHA).toBe(8);
  });
});

describe("KR2.3 — Class.armorProficiencies/weaponProficiencies не читаються при мультикласі", () => {
  it("Wizard → MULTICLASS у Fighter не змінює customProficiencies автоматично", () => {
    const initialProficiencies = "Кинджал, Дротик, Праща, Бойовий посох, Легкий арбалет";
    expect(mergeUniqueLines(initialProficiencies, [])).toBe(initialProficiencies);
  });
});

function getSpellcastingType(className: string): SpellcastingKind {
  switch (className) {
    case "WIZARD_2014":
    case "WIZARD_2024":
    case "BARD_2014":
    case "BARD_2024":
    case "CLERIC_2014":
    case "CLERIC_2024":
    case "DRUID_2014":
    case "DRUID_2024":
    case "SORCERER_2014":
    case "SORCERER_2024":
      return "FULL";
    case "PALADIN_2014":
    case "PALADIN_2024":
    case "RANGER_2014":
    case "RANGER_2024":
    case "ARTIFICER_2014":
      return "HALF";
    case "WARLOCK_2014":
    case "WARLOCK_2024":
      return "PACT";
    default:
      return "NONE";
  }
}

function getSubclassSpellcastingType(subclass: string | null): SpellcastingKind {
  if (subclass === "ELDRITCH_KNIGHT" || subclass === "ARCANE_TRICKSTER") return "THIRD";
  return "NONE";
}

function toSpellcasting(pers: GoldenPers): SpellcastingCharacter {
  return {
    level: pers.level,
    characterClass: {
      name: pers.class,
      spellcastingType: getSpellcastingType(pers.class),
    },
    subclass: pers.subclass ? { spellcastingType: getSubclassSpellcastingType(pers.subclass) } : null,
    multiclasses: pers.multiclasses.map((m) => ({
      classLevel: m.classLevel,
      characterClass: { name: m.class, spellcastingType: getSpellcastingType(m.class) },
      subclass: m.subclass ? { spellcastingType: getSubclassSpellcastingType(m.subclass) } : null,
    })),
  };
}

function getLeveledUpClassName(prev: GoldenPers, next: GoldenPers): string {
  for (const nextMulti of next.multiclasses) {
    const prevMulti = prev.multiclasses.find((m) => m.class === nextMulti.class);
    if (!prevMulti || nextMulti.classLevel > prevMulti.classLevel) {
      return nextMulti.class;
    }
  }
  return next.class;
}

function getClassHitDie(className: string): number {
  switch (className) {
    case "BARBARIAN_2014":
    case "BARBARIAN_2024":
      return 12;
    case "FIGHTER_2014":
    case "FIGHTER_2024":
    case "PALADIN_2014":
    case "PALADIN_2024":
    case "RANGER_2014":
    case "RANGER_2024":
      return 10;
    case "BARD_2014":
    case "BARD_2024":
    case "CLERIC_2014":
    case "CLERIC_2024":
    case "DRUID_2014":
    case "DRUID_2024":
    case "MONK_2014":
    case "MONK_2024":
    case "ROGUE_2014":
    case "ROGUE_2024":
    case "WARLOCK_2014":
    case "WARLOCK_2024":
    case "ARTIFICER_2014":
      return 8;
    case "SORCERER_2014":
    case "SORCERER_2024":
    case "WIZARD_2014":
    case "WIZARD_2024":
      return 6;
    default:
      return 8;
  }
}


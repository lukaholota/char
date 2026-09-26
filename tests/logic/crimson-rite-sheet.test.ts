import { describe, expect, it } from "vitest";
import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import { findWeaponCrimsonRite, listKnownCrimsonRites } from "@/lib/logic/crimson-rite-sheet";

const storm = { featureId: 71, name: "Обряд бурі", engName: "Rite of the Storm" };
const flame = { featureId: 72, name: "Обряд полумʼя", engName: "Rite of the Flame" };
const maledict = { featureId: 70, name: "Криваве наврочення", engName: "Blood Maledict (Blood Hunter)" };

function buildLycan(level: number): PersWithRelations {
  return {
    level,
    ruleset: "RULES_2014",
    class: { name: "BLOOD_HUNTER_2014", features: [] },
    multiclasses: [],
    features: [storm, flame, maledict].map((feature) => ({ feature })),
  } as unknown as PersWithRelations;
}

const predatoryStrikes = (crimsonRiteFeatureId: number | null) =>
  ({ persWeaponId: 1, crimsonRiteFeatureId, weapon: { name: "UNARMED_STRIKE" } }) as unknown as PersWeaponWithWeapon;

describe("O45 — Багряний обряд на листі", () => {
  it("обрядами є лише риси обрядів", () => {
    expect(listKnownCrimsonRites(buildLycan(7)).map((rite) => rite.featureId)).toEqual([71, 72]);
  });

  it("BH-004: Обряд бурі на Хижих ударах мисливця 7 — +1к6 блискавкою", () => {
    expect(findWeaponCrimsonRite(buildLycan(7), predatoryStrikes(71))).toEqual({ dice: "1d6", damageType: "LIGHTNING", rite: storm });
  });

  it("без обряду чи з чужою рисою — нічого", () => {
    expect(findWeaponCrimsonRite(buildLycan(7), predatoryStrikes(null))).toBeNull();
    expect(findWeaponCrimsonRite(buildLycan(7), predatoryStrikes(70))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { applyDamageDefense, applyDamageReviewChoices, buildDamageReview, buildDamageReviewParts, parseDamageReviewChoices, resolveReviewedDamage } from "@/rules/damage-review";

const flaming = { damageType: "SLASHING" as const, groups: [{ values: [6] }], extra: [{ sign: 1 as const, label: "Вогняний клинок", value: 5, damageType: "FIRE" as const }], bonus: 3, total: 14 };

describe("перевірка шкоди майстром", () => {
  it("розкладає кидок на рядки за типами з захистом цілі наперед", () => {
    expect(buildDamageReviewParts(flaming, (type) => (type === "FIRE" ? "resistant" : null))).toEqual([
      { damageType: "SLASHING", label: "", amount: 9, defense: null },
      { damageType: "FIRE", label: "Вогняний клинок", amount: 5, defense: "resistant" },
    ]);
    expect(buildDamageReviewParts({ groups: [], extra: [], bonus: 0, total: 0 }, () => "immune")).toEqual([{ damageType: null, label: "", amount: 0, defense: null }]);
  });

  it("запам'ятовує захисти цілі за всіма типами, щоб зміна типу брала захист зі статблоку", () => {
    const review = buildDamageReview(flaming, (type) => (type === "FIRE" ? "immune" : type === "COLD" ? "vulnerable" : null));
    expect(review.defenses).toEqual({ FIRE: "immune", COLD: "vulnerable" });
    expect(review.isPending).toBe(true);
  });

  it("імунітет обнуляє, опір ділить униз, вразливість подвоює", () => {
    expect([applyDamageDefense(7, "immune"), applyDamageDefense(7, "resistant"), applyDamageDefense(7, "vulnerable"), applyDamageDefense(7, null)]).toEqual([0, 3, 14, 7]);
  });

  it("сумує рядки після захистів і пише нотатки лише для типізованих", () => {
    const parts = [
      { damageType: "SLASHING" as const, label: "", amount: 9, defense: "vulnerable" as const },
      { damageType: "FIRE" as const, label: "", amount: 5, defense: "resistant" as const },
      { damageType: null, label: "Без типу", amount: 4, defense: "immune" as const },
    ];
    expect(resolveReviewedDamage(parts)).toEqual({ damage: 20, notes: [{ damageType: "SLASHING", defense: "vulnerable", before: 9, after: 18 }, { damageType: "FIRE", defense: "resistant", before: 5, after: 2 }] });
    expect(resolveReviewedDamage([{ damageType: null, label: "", amount: 9999, defense: "vulnerable" }]).damage).toBe(9999);
  });

  it("приймає від майстра лише числа й захисти, по одному на кожен рядок", () => {
    expect(parseDamageReviewChoices([{ amount: 4, defense: null }, { amount: 0, defense: "immune" }], 2)).toEqual([{ amount: 4, defense: null }, { amount: 0, defense: "immune" }]);
    expect(parseDamageReviewChoices([{ amount: 4, defense: null }], 2)).toBeNull();
    expect(parseDamageReviewChoices([{ amount: -1, defense: null }], 1)).toBeNull();
    expect(parseDamageReviewChoices([{ amount: 1.5, defense: null }], 1)).toBeNull();
    expect(parseDamageReviewChoices([{ amount: 10000, defense: null }], 1)).toBeNull();
    expect(parseDamageReviewChoices([{ amount: 3, defense: "absorb" }], 1)).toBeNull();
    expect(parseDamageReviewChoices([null], 1)).toBeNull();
    expect(parseDamageReviewChoices("all", 1)).toBeNull();
    expect(parseDamageReviewChoices([{ amount: 3, defense: null, damageType: "COLD" }], 1)).toEqual([{ amount: 3, defense: null, damageType: "COLD" }]);
    expect(parseDamageReviewChoices([{ amount: 3, defense: null, damageType: null }], 1)).toEqual([{ amount: 3, defense: null, damageType: null }]);
    expect(parseDamageReviewChoices([{ amount: 3, defense: null, damageType: "Світло" }], 1)).toBeNull();
  });

  it("бере типи рядків зі збереженого кидка, а числа — від майстра", () => {
    const parts = buildDamageReviewParts(flaming, () => null);
    expect(applyDamageReviewChoices(parts, [{ amount: 2, defense: null }, { amount: 5, defense: "immune" }])).toEqual([
      { damageType: "SLASHING", label: "", amount: 2, defense: null },
      { damageType: "FIRE", label: "Вогняний клинок", amount: 5, defense: "immune" },
    ]);
  });

  it("майстер може змінити тип рядка — нотатка журналу йде з новим типом", () => {
    const parts = applyDamageReviewChoices(buildDamageReviewParts(flaming, () => null), [{ amount: 9, defense: null }, { amount: 5, defense: "resistant", damageType: "COLD" }]);
    expect(parts[1]).toMatchObject({ damageType: "COLD", label: "Вогняний клинок" });
    expect(resolveReviewedDamage(parts)).toEqual({ damage: 11, notes: [{ damageType: "COLD", defense: "resistant", before: 5, after: 2 }] });
  });
});

import { describe, expect, it } from "vitest";
import { describeChargeRecovery, fillDefaultCharges, findItemChargeRules, pluralizeCharges, rollChargeRecovery } from "@/rules/magic-item-charge-text";

const WAND_2014 = "Ця паличка має 7 зарядів. Тримаючи її, ви можете дією витратити 1 або більше зарядів.\n\nПаличка відновлює 1к6 + 1 витрачених зарядів щодня на світанку.";
const ALWAYS_HALF = () => 0.5;

describe("заряди з опису предмета", () => {
  it("паличка: 7 зарядів, 1к6 + 1 на світанку", () => {
    expect(findItemChargeRules(WAND_2014)).toEqual({ chargesMax: 7, recovery: { kind: "ROLL", diceCount: 1, diceSides: 6, bonus: 1 } });
  });

  it("розпізнає «мають», «усі», число, «витрачений заряд» і мінус", () => {
    expect(findItemChargeRules("Ці чоботи мають 4 заряди й відновлюють 1к4 витрачених зарядів щодня на світанку.")).toEqual({ chargesMax: 4, recovery: { kind: "ROLL", diceCount: 1, diceSides: 4, bonus: 0 } });
    expect(findItemChargeRules("Паличка має 7 зарядів і відновлює всі витрачені заряди щодня на світанку.").recovery).toEqual({ kind: "ALL" });
    expect(findItemChargeRules("Дошка має 3 заряди й відновлює 1 витрачений заряд щодня на світанку.").recovery).toEqual({ kind: "ROLL", diceCount: 0, diceSides: 0, bonus: 1 });
    expect(findItemChargeRules("Монета має 1 заряд і відновлює витрачений заряд щодня на світанку.").recovery).toEqual({ kind: "ROLL", diceCount: 0, diceSides: 0, bonus: 1 });
    expect(findItemChargeRules("Відновлює 1к6 − 1 витрачений заряд щодня на світанку.").recovery).toEqual({ kind: "ROLL", diceCount: 1, diceSides: 6, bonus: -1 });
  });

  it("інші форми максимуму з опису: «починає з», «із його», «має ще й», «усі»", () => {
    expect(findItemChargeRules("Куб починає з 36 зарядами й відновлює 1к20 витрачених зарядів щодня на світанку.").chargesMax).toBe(36);
    expect(findItemChargeRules("Ви можете дією витратити 1 із його 10 зарядів.").chargesMax).toBe(10);
    expect(findItemChargeRules("Молот має ще й 5 зарядів.").chargesMax).toBe(5);
    expect(findItemChargeRules("Має 3 заряди. Відновлює всі заряди щодня на світанку.").chargesMax).toBe(3);
    expect(findItemChargeRules("Лінзи відновлюють усі витрачені заряди щодня на світанку.").recovery).toEqual({ kind: "ALL" });
  });

  it("кидок замість числа й чужі «відновлює» не вигадують заряди", () => {
    expect(findItemChargeRules("Меч має 1к4 − 1 зарядів.")).toEqual({ chargesMax: null, recovery: null });
    expect(findItemChargeRules("Казан відновлює зарядів і розсипається на попіл.").recovery).toBeNull();
    expect(findItemChargeRules("Відновлює вам дивний заряд.").recovery).toBeNull();
    expect(findItemChargeRules(null)).toEqual({ chargesMax: null, recovery: null });
  });
});

describe("заряди на листі", () => {
  const rules = findItemChargeRules(WAND_2014);

  it("незадані заряди беруть максимум з опису, задані гравцем лишаються", () => {
    expect(fillDefaultCharges({ chargesMax: null, chargesCurrent: null }, rules)).toEqual({ chargesMax: 7, chargesCurrent: 7 });
    expect(fillDefaultCharges({ chargesMax: 5, chargesCurrent: 2 }, rules)).toEqual({ chargesMax: 5, chargesCurrent: 2 });
    expect(fillDefaultCharges({ chargesMax: null, chargesCurrent: null }, { chargesMax: null, recovery: null })).toEqual({ chargesMax: null, chargesCurrent: null });
  });

  it("світанок додає кидок, але не вище максимуму", () => {
    expect(rollChargeRecovery({ chargesMax: 7, chargesCurrent: 1 }, rules.recovery!, ALWAYS_HALF)).toEqual({ chargesMax: 7, chargesCurrent: 6 });
    expect(rollChargeRecovery({ chargesMax: 7, chargesCurrent: 6 }, rules.recovery!, ALWAYS_HALF)).toEqual({ chargesMax: 7, chargesCurrent: 7 });
    expect(rollChargeRecovery({ chargesMax: 3, chargesCurrent: 0 }, { kind: "ALL" })).toEqual({ chargesMax: 3, chargesCurrent: 3 });
    expect(rollChargeRecovery({ chargesMax: 3, chargesCurrent: null }, { kind: "ROLL", diceCount: 1, diceSides: 6, bonus: -1 }, () => 0)).toEqual({ chargesMax: 3, chargesCurrent: 3 });
    expect(rollChargeRecovery({ chargesMax: null, chargesCurrent: null }, { kind: "ALL" })).toEqual({ chargesMax: null, chargesCurrent: null });
  });

  it("підпис відновлення й відмінки", () => {
    expect(describeChargeRecovery(rules.recovery!)).toBe("1к6 + 1 зарядів");
    expect(describeChargeRecovery({ kind: "ROLL", diceCount: 1, diceSides: 6, bonus: -1 })).toBe("1к6 − 1 зарядів");
    expect(describeChargeRecovery({ kind: "ROLL", diceCount: 1, diceSides: 4, bonus: 0 })).toBe("1к4 зарядів");
    expect(describeChargeRecovery({ kind: "ROLL", diceCount: 0, diceSides: 0, bonus: 1 })).toBe("1 заряд");
    expect(describeChargeRecovery({ kind: "ALL" })).toBe("усі заряди");
    expect([1, 2, 5, 11, 12, 21, 22, 25].map(pluralizeCharges)).toEqual(["заряд", "заряди", "зарядів", "зарядів", "зарядів", "заряд", "заряди", "зарядів"]);
  });
});

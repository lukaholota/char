import { describe, expect, it } from "vitest";
import creatures2014 from "@/lib/generated/creatures.json";
import creatures2024 from "@/lib/generated/creatures2024.json";
import dictionary from "@/lib/refs/dictionary.json";
import {
  PARENTHESISED_COMPANION_DIE,
  RETIRED_HIT_DICE,
  countRetiredHitDiceByCarrier,
  findParenthesisedCompanionDice,
  findRetiredHitDice,
} from "../../scripts/terms/hit-dice-occurrences";

/// Зведення «кісток хітів» до ратифікованих «Кубиків Здоровʼя», 2026-09-01. Розхід відкрився
/// на партії 19, коли новий запис пішов за словником, а бестіарій 2014 лишався на старій
/// формі. Правку зроблено у файлах-джерелах (Р33); каталог лише перезібрано.
const HIT_DICE = dictionary.DND_DICTIONARY.restAndRecovery.hitDice;

function findByName(catalog: { nameEng: string }[], nameEng: string) {
  const found = catalog.find((creature) => creature.nameEng === nameEng);
  if (!found) throw new Error(`немає запису ${nameEng}`);
  return found;
}

describe("термін hit dice у бестіарії", () => {
  it("ловить зняту форму — інакше нулі нижче нічого не доводять", () => {
    expect("жертва мала 2 кістки хітів чи менше".match(RETIRED_HIT_DICE)).toEqual([
      "кістки хітів",
    ]);
    expect("має стільки кісток хітів [к8]".match(RETIRED_HIT_DICE)).toEqual(["кісток хітів"]);
    expect(
      "супутник має стільки Кубиків Здоровʼя (к8)".match(PARENTHESISED_COMPANION_DIE)
    ).toEqual(["Кубиків Здоровʼя (к8)"]);
  });

  it("не лишає знятої форми в жодному носії", () => {
    expect(findRetiredHitDice()).toEqual([]);
  });

  it("тримає нуль у кожному носії окремо", () => {
    expect(Object.values(countRetiredHitDiceByCarrier()).filter((n) => n > 0)).toEqual([]);
  });

  it("пише кубик супутника у квадратних дужках в обох редакціях", () => {
    expect(findParenthesisedCompanionDice()).toEqual([]);
    expect(findByName(creatures2014, "Steel Defender").hp).toContain(
      `має стільки Кубиків Здоровʼя [к8]`
    );
    expect(findByName(creatures2024, "Reanimated Companion").hp).toContain(
      `має стільки Кубиків Здоровʼя [к8]`
    );
  });

  it("несе ратифіковану форму в прозі — відмінок за фразою, не за словником", () => {
    expect(findByName(creatures2014, "Ancient Gold Dragon").actions).toContain(
      `хіти, ${HIT_DICE}, здатність говорити`
    );
    expect(findByName(creatures2014, "Devourer").actions).toContain(
      `мала 2 ${HIT_DICE} чи менше`
    );
    expect(findByName(creatures2014, "Devourer").actions).toContain(
      `від 3 до 5 Кубиків Здоровʼя`
    );
  });

  it("тримає ратифікований запис словника", () => {
    expect(HIT_DICE).toBe("Кубики Здоровʼя");
    expect(dictionary.DND_DICTIONARY.restAndRecovery.hitDie).toBe("Кубик Здоровʼя");
  });
});

import { describe, expect, it } from "vitest";
import { findPoolProvider } from "@/rules/resource-pools";

/// BUG-011. `usesPoolKey` носить і фіча, яка пул дає, і кожна, що з нього витрачає, а максимум
/// брався першим-ліпшим рядком без сортування — тобто тим, що випадково лежав першим у купі.
/// Претенденти нижче — не вигадані: це справжні рядки бази, на яких баг і ловився.

const classFeature = { classFeatures: [{ classId: 1 }], subclassFeatures: [] };
const subclassFeature = { classFeatures: [], subclassFeatures: [{ subclass: { classId: 1 } }] };

const WILD_SHAPE = { featureId: 17928, usesCount: 2, ...classFeature };
const SPIRIT_TOTEM = { featureId: 8713, usesCountDependsOnProficiencyBonus: true, ...subclassFeature };

const CHANNEL_DIVINITY_SHARED = { featureId: 2373, usesCount: 1, ...classFeature };
const CHANNEL_DIVINITY_CLERIC = {
  featureId: 17922,
  usesCountSpecial: [
    { lvl: 2, uses: 1 },
    { lvl: 6, uses: 2 },
  ],
  ...classFeature,
};

const PSIONIC_POWER = { featureId: 49321, usesCountDependsOnProficiencyBonus: true, ...subclassFeature };
const PSI_BOLSTERED_KNACK = { featureId: 8371, usesCount: 1, ...subclassFeature };

describe("хто задає максимум спільного пулу", () => {
  /// Той самий випадок, що зламався: «Дух тотема» кола Пастуха витрачає використання Дикої
  /// форми, а не роздає їх.
  it("класова фіча має перевагу над фічею підкласу", () => {
    expect(findPoolProvider([SPIRIT_TOTEM, WILD_SHAPE])).toBe(WILD_SHAPE);
  });

  /// Клірик 6 має два Божественні канали за таблицею рівнів, а не одне пласке з фічі, спільної
  /// з паладином.
  it("максимум за таблицею рівнів має перевагу над пласким числом", () => {
    expect(findPoolProvider([CHANNEL_DIVINITY_SHARED, CHANNEL_DIVINITY_CLERIC])).toBe(CHANNEL_DIVINITY_CLERIC);
  });

  it("серед фіч підкласу виграє та, чий максимум росте з бонусом майстерності", () => {
    expect(findPoolProvider([PSI_BOLSTERED_KNACK, PSIONIC_POWER])).toBe(PSIONIC_POWER);
  });

  /// Головне, чого бракувало: відповідь не залежить від порядку, у якому база віддала рядки.
  it("порядок претендентів відповіді не змінює", () => {
    expect(findPoolProvider([WILD_SHAPE, SPIRIT_TOTEM])).toBe(findPoolProvider([SPIRIT_TOTEM, WILD_SHAPE]));
    expect(findPoolProvider([CHANNEL_DIVINITY_CLERIC, CHANNEL_DIVINITY_SHARED])).toBe(
      findPoolProvider([CHANNEL_DIVINITY_SHARED, CHANNEL_DIVINITY_CLERIC])
    );
  });

  it("за інших рівних виграє менший featureId, а не випадковий рядок", () => {
    const older = { featureId: 8384, usesCount: 1, ...subclassFeature };
    const newer = { featureId: 8385, usesCount: 1, ...subclassFeature };

    expect(findPoolProvider([newer, older])).toBe(older);
  });

  it("порожній перелік претендентів дає null, а не падіння", () => {
    expect(findPoolProvider([])).toBeNull();
  });
});

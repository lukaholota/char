// KR27.8 — альтернативні способи рахувати базовий КЗ.
//
// SRD 2024 (data/2024/srd/character-creation.md, Multiclassing → Armor Class): «If you have
// multiple ways to calculate your Armor Class, you can benefit from only one at a time», і
// приклад книги — рівно Монах/Чародій із Захистом без обладунків і Драконячою живучістю.
// Тобто це ВИБІР гравця, а не мовчазна перемога кращої формули.
//
// Кожна формула змодельована рядком `armor` — так само, як беззбройний захист 2014 і природний
// обладунок видів (рішення власника 2026-09-04: вибір показує наявний список обладунку, де
// «одна за раз» — це прапорець `equipped`, а `calculateArmorClass` бере рівно вдягнений рядок і
// ніколи не складає два). Це правило каже лише, ЯКІ рядки персонажу належать.

/** Значення `ArmorCategory`, якими змодельовані альтернативні формули базового КЗ. */
export type AlternativeArmorClassFormula =
  | "UNARMORED_DEFENSE_MONK"
  | "UNARMORED_DEFENSE_BARBARIAN"
  | "DRACONIC_RESILIENCE";

// Редакція вже стоїть у ключі, тому окремого прапорця `ruleset` тут немає: назви фіч 2014
// («Unarmored Defense») у таблиці не трапляються, а їхні рядки видає створення персонажа за
// назвою початкового класу (`MONK_2014` / `BARBARIAN_2014`).
//
// Драконяча живучість 2014 не входить сюди навмисно: там формула «13 + СПР», і її вже несе
// `NATURAL_ARMOR_13_DEX`. У 2024 книга змінила її на «10 + СПР + ХАР», тобто це інший рядок.
const FORMULA_BY_FEATURE_2024: Readonly<Record<string, AlternativeArmorClassFormula>> = {
  "Monk: Unarmored Defense (2024)": "UNARMORED_DEFENSE_MONK",
  "Barbarian: Unarmored Defense (2024)": "UNARMORED_DEFENSE_BARBARIAN",
  "Draconic Sorcery: Draconic Resilience (2024)": "DRACONIC_RESILIENCE",
};

export function findAlternativeArmorClassFormulas(
  grantedFeatureNames: readonly string[],
): AlternativeArmorClassFormula[] {
  const granted = new Set(grantedFeatureNames);
  return Object.entries(FORMULA_BY_FEATURE_2024)
    .filter(([engName]) => granted.has(engName))
    .map(([, formula]) => formula);
}

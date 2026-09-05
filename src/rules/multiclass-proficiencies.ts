/**
 * KR27.2 — скорочений пакет володінь класу, взятого не першим.
 *
 * «When you gain your first level in a class other than your initial class, you gain only some of
 * the new class's starting proficiencies» (SRD 2024, Multiclassing → Proficiencies). Що саме —
 * написано в розділі «As a Multiclass Character» кожного класу
 * (`data/2024/srd/classes.md`); значення нижче зняті звідти, рядок за рядком.
 *
 * Рятівних кидків тут немає **у жодного** класу — їх дає лише початковий клас. Важкого обладунку
 * теж: воїн і паладин починають із ним, а взяті другими дають лише легкий, середній і щити.
 *
 * Чому таблиця тут, а не стовпцем на `Class`: набір **виводиться з редакції**, а не з контенту.
 * Модель `Class` несе рівно один комплект полів володінь, і він описує початковий клас; другий
 * комплект вимагав би DDL у робочій базі, оновлення `data/2024/normalized/classes.json`, сіду й
 * `src/lib/generated/creator-content-2024.json` — усе заради дванадцяти незмінних рядків книги.
 * Обґрунтування записане в docs/o27-multiclass-2024/kr27.2-multiclass-entry.md.
 *
 * Класи 2014 тут відсутні навмисно: у 2014 своя таблиця скорочених володінь, гілка `MULTICLASS`
 * сьогодні не видає нічого, і 9 394 живих персонажі цієї редакції цим KR не рухаються.
 */
export type MulticlassArmor = "LIGHT" | "MEDIUM" | "HEAVY" | "SHIELD";
export type MulticlassWeapons = { type: Array<"SIMPLE_WEAPON" | "MARTIAL_WEAPON"> };
export type MulticlassTool = "THIEVES_TOOLS";

export type MulticlassProficiencyPackage = {
  armor: MulticlassArmor[];
  weapons: MulticlassWeapons | null;
  tools: MulticlassTool[];
  /** Інструмент на вибір: бард обирає один музичний. */
  toolChoiceCount: number;
  /**
   * Навичка на вибір: бард — будь-яку, слідопит і пройдисвіт — зі списку свого класу.
   * Кроку вибору навички при вході в клас у майстрі підвищення рівня сьогодні немає, тому число
   * лишається даними: воно каже, скільки піків винен майстер, коли цей крок зʼявиться.
   */
  skillChoiceCount: number;
};

const EMPTY_PACKAGE: MulticlassProficiencyPackage = {
  armor: [],
  weapons: null,
  tools: [],
  toolChoiceCount: 0,
  skillChoiceCount: 0,
};

const MARTIAL_WEAPONS: MulticlassWeapons = { type: ["MARTIAL_WEAPON"] };

const MULTICLASS_PROFICIENCIES_2024: Record<string, MulticlassProficiencyPackage> = {
  BARBARIAN_2024: { ...EMPTY_PACKAGE, armor: ["SHIELD"], weapons: MARTIAL_WEAPONS },
  BARD_2024: { ...EMPTY_PACKAGE, armor: ["LIGHT"], toolChoiceCount: 1, skillChoiceCount: 1 },
  CLERIC_2024: { ...EMPTY_PACKAGE, armor: ["LIGHT", "MEDIUM", "SHIELD"] },
  DRUID_2024: { ...EMPTY_PACKAGE, armor: ["LIGHT", "SHIELD"] },
  FIGHTER_2024: {
    ...EMPTY_PACKAGE,
    armor: ["LIGHT", "MEDIUM", "SHIELD"],
    weapons: MARTIAL_WEAPONS,
  },
  MONK_2024: EMPTY_PACKAGE,
  PALADIN_2024: {
    ...EMPTY_PACKAGE,
    armor: ["LIGHT", "MEDIUM", "SHIELD"],
    weapons: MARTIAL_WEAPONS,
  },
  RANGER_2024: {
    ...EMPTY_PACKAGE,
    armor: ["LIGHT", "MEDIUM", "SHIELD"],
    weapons: MARTIAL_WEAPONS,
    skillChoiceCount: 1,
  },
  ROGUE_2024: {
    ...EMPTY_PACKAGE,
    armor: ["LIGHT"],
    tools: ["THIEVES_TOOLS"],
    skillChoiceCount: 1,
  },
  SORCERER_2024: EMPTY_PACKAGE,
  WARLOCK_2024: { ...EMPTY_PACKAGE, armor: ["LIGHT"] },
  WIZARD_2024: EMPTY_PACKAGE,
};

/**
 * `null` — редакція чи клас, для яких книга скороченого набору не дає. Артифіцера 2024 в SRD
 * немає взагалі (12 класів проти 13 у базі), тому рядка для нього тут теж немає — вигадувати
 * його з голови не можна.
 */
export function findMulticlassProficiencies(className: string): MulticlassProficiencyPackage | null {
  return MULTICLASS_PROFICIENCIES_2024[className] ?? null;
}

/**
 * KR31.3 — числа використань і тип дії класових фіч 2024, виведені з книги.
 *
 * Джерело одне — `data/2024/srd/classes.md`. Модуль нічого не читає з диска: його викликають і
 * скрипт, що переливає результат у `data/2024/normalized/classes.json`, і гейт, що звіряє файл
 * із книгою. Через це «числа у файлі» завжди дорівнюють «числам у SRD», а не чиїйсь памʼяті.
 *
 * Форми речень, спільні з підкласами, лежать у `feature-uses-from-text.ts`; тут — те, чого
 * підкласи не мають: таблиця рівнів класу.
 */

import {
  COUNT_WORDS,
  findDisplayTypes,
  findRecoveryRest,
  findUsesInText,
  type DisplayTypeName,
  type FeatureUses2024,
  type UsesByLevel,
  type UsesCounts,
} from "./feature-uses-from-text";

export type { DisplayTypeName, FeatureUses2024 } from "./feature-uses-from-text";

export type ClassFeatureMechanics2024 = {
  className: string;
  level: number;
  featureName: string;
  displayType: DisplayTypeName[];
  uses?: FeatureUses2024;
};

export function extractClassFeatureMechanics2024(srdMarkdown: string): ClassFeatureMechanics2024[] {
  const resourceColumns = collectResourceColumnsByClass(srdMarkdown);

  return collectClassFeatureBlocks(srdMarkdown).map((block) => {
    const uses = findUses(block, resourceColumns);
    return {
      className: block.className,
      level: block.level,
      featureName: block.featureName,
      displayType: findDisplayTypes(block.body, Boolean(uses)),
      ...(uses ? { uses } : {}),
    };
  });
}

type ClassFeatureBlock = {
  className: string;
  level: number;
  featureName: string;
  body: string;
};

/**
 * Тіла класових фіч. Межа — секція `### <Клас> Class Features`: у тому самому файлі лежать
 * підкласи, і без цієї межі в набір заповзають чужі 58 фіч.
 */
function collectClassFeatureBlocks(srdMarkdown: string): ClassFeatureBlock[] {
  const blocks: ClassFeatureBlock[] = [];
  let className = "";
  let inClassFeatures = false;
  let open: { level: number; featureName: string; lines: string[] } | null = null;

  const close = () => {
    if (open) blocks.push({ className, level: open.level, featureName: open.featureName, body: open.lines.join("\n") });
    open = null;
  };

  for (const line of srdMarkdown.split("\n")) {
    const classHeading = /^## (.+)$/.exec(line);
    if (classHeading) {
      close();
      className = classHeading[1].trim();
      inClassFeatures = false;
      continue;
    }

    const sectionHeading = /^### (.+)$/.exec(line);
    if (sectionHeading) {
      close();
      inClassFeatures = sectionHeading[1].trim() === `${className} Class Features`;
      continue;
    }

    const featureHeading = /^#### Level (\d+): (.+)$/.exec(line);
    if (featureHeading) {
      close();
      if (inClassFeatures) open = { level: Number(featureHeading[1]), featureName: featureHeading[2].trim(), lines: [] };
      continue;
    }

    if (/^#{1,4} /.test(line)) {
      close();
      continue;
    }

    if (open) open.lines.push(line);
  }

  close();
  return blocks;
}

// ── Колонки класової таблиці ───────────────────────────────────────────────────────────────

type ResourceColumn = { className: string; column: string; featureName: string };

/**
 * Колонка таблиці рівнів → фіча, якій вона задає максимум. Пара «клас + заголовок колонки»
 * береться з книги дослівно: перейменована колонка зробить таблицю нерозпізнаною, і сід
 * впаде замість того, щоб мовчки лишити фічу без числа.
 */
const RESOURCE_COLUMNS: ResourceColumn[] = [
  { className: "Barbarian", column: "Rages", featureName: "Rage" },
  { className: "Cleric", column: "Channel Divinity", featureName: "Channel Divinity" },
  { className: "Druid", column: "Wild Shape", featureName: "Wild Shape" },
  { className: "Fighter", column: "Second Wind", featureName: "Second Wind" },
  { className: "Monk", column: "Focus Points", featureName: "Monk's Focus" },
  { className: "Paladin", column: "Channel Divinity", featureName: "Channel Divinity" },
  { className: "Ranger", column: "Favored Enemy", featureName: "Favored Enemy" },
  { className: "Sorcerer", column: "Sorcery Points", featureName: "Font of Magic" },
];

/**
 * Колонки, які числом використань **не** є, і чому. Перелік вичерпний навмисно: колонка, якої
 * тут немає й яка не стоїть у `RESOURCE_COLUMNS`, зупиняє витяг — інакше нова колонка книги
 * мовчки лишилася б непоміченою.
 */
const COLUMNS_THAT_ARE_NOT_USES: Record<string, string> = {
  Level: "рядок таблиці",
  "Proficiency Bonus": "бонус майстерності, не ресурс",
  "Class Features": "перелік фіч рівня",
  Cantrips: "відомі замовляння",
  "Prepared Spells": "підготовані заклинання",
  "Spell Slots": "комірки заклинань",
  "Slot Level": "коло комірок чорнокнижника",
  "Rage Damage": "бонус до шкоди",
  "Weapon Mastery": "ємність майстерності зброї, живе в class.weapon_mastery_progression",
  "Bardic Die": "розмір кубика натхнення",
  "Martial Arts": "розмір кубика бойових мистецтв",
  "Unarmored Movement": "приріст швидкості",
  "Sneak Attack": "кубики підступної атаки",
  "Eldritch Invocations":
    "кількість інвокацій, а не використань: лічильник живе в feature.invocations_count і потребує рядка на рівень — поза межами KR31.3",
};

const SPELL_SLOT_COLUMNS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);

type ResourceColumnsByClass = Map<string, Map<string, UsesByLevel[]>>;

function collectResourceColumnsByClass(srdMarkdown: string): ResourceColumnsByClass {
  const byClass: ResourceColumnsByClass = new Map();

  for (const table of collectFeatureTables(srdMarkdown)) {
    const columns = new Map<string, UsesByLevel[]>();

    for (const [index, header] of table.headers.entries()) {
      if (SPELL_SLOT_COLUMNS.has(header) || header in COLUMNS_THAT_ARE_NOT_USES) continue;
      const known = RESOURCE_COLUMNS.some((entry) => entry.className === table.className && entry.column === header);
      if (!known) {
        throw new Error(
          `Таблиця ${table.className}: колонка «${header}» невідома — впиши її в RESOURCE_COLUMNS або в COLUMNS_THAT_ARE_NOT_USES.`,
        );
      }
      columns.set(header, compressUsesByLevel(readColumnByLevel(table, index)));
    }

    byClass.set(table.className, columns);
  }

  return byClass;
}

type FeatureTable = { className: string; headers: string[]; rows: string[][] };

function collectFeatureTables(srdMarkdown: string): FeatureTable[] {
  const lines = srdMarkdown.split("\n");
  const tables: FeatureTable[] = [];
  let className = "";

  for (let index = 0; index < lines.length; index++) {
    const classHeading = /^## (.+)$/.exec(lines[index]);
    if (classHeading) className = classHeading[1].trim();
    if (lines[index].trim() !== `**${className} Features**`) continue;
    tables.push({ className, ...readTableAt(lines, index) });
  }

  return tables;
}

function readTableAt(lines: string[], startIndex: number): { headers: string[]; rows: string[][] } {
  const headers: string[] = [];
  const rows: string[][] = [];
  let inBody = false;
  let row: string[] | null = null;

  for (let index = startIndex; index < lines.length && !/<\/table>/.test(lines[index]); index++) {
    const header = /<th>(.*)<\/th>/.exec(lines[index]);
    if (header) headers.push(header[1].trim());
    if (/<tbody>/.test(lines[index])) inBody = true;
    if (inBody && /<tr>/.test(lines[index])) row = [];
    const cell = /<td>(.*)<\/td>/.exec(lines[index]);
    if (cell && row) row.push(cell[1].trim());
    if (inBody && /<\/tr>/.test(lines[index]) && row) {
      rows.push(row);
      row = null;
    }
  }

  return { headers, rows };
}

function readColumnByLevel(table: FeatureTable, columnIndex: number): UsesByLevel[] {
  return table.rows
    .map((row) => ({ lvl: Number(row[0]), uses: Number(row[columnIndex]) }))
    .filter((entry) => Number.isInteger(entry.lvl) && Number.isInteger(entry.uses));
}

/// Таблиця повторює число щорівня; у базі потрібні лише рівні, на яких воно змінюється.
function compressUsesByLevel(byLevel: UsesByLevel[]): UsesByLevel[] {
  return byLevel.filter((entry, index) => index === 0 || entry.uses !== byLevel[index - 1].uses);
}

// ── Числа використань ──────────────────────────────────────────────────────────────────────

const POOL_KEYS: Record<string, string> = {
  "Bard: Bardic Inspiration": "BARDIC_INSPIRATION",
  "Cleric: Channel Divinity": "CHANNEL_DIVINITY",
  "Druid: Wild Shape": "WILD_SHAPE",
  "Monk: Monk's Focus": "KI",
  "Paladin: Channel Divinity": "CHANNEL_DIVINITY",
  "Sorcerer: Font of Magic": "SORCERY_POINTS",
};

function findUses(block: ClassFeatureBlock, resourceColumns: ResourceColumnsByClass): FeatureUses2024 | undefined {
  const key = `${block.className}: ${block.featureName}`;

  const counts =
    findUsesFromLevelTable(block, resourceColumns) ??
    findFreeCastsOfChosenSpells(block.body) ??
    findUsesInText(block.featureName, block.level, block.body);
  if (!counts) return undefined;

  const limitedUsesPer = findRecoveryRest(block.body);
  if (!limitedUsesPer) {
    throw new Error(`${key}: число використань знайдено, а відпочинку, що їх повертає, — ні.`);
  }

  const poolKey = POOL_KEYS[key];
  return { limitedUsesPer, ...counts, ...(poolKey ? { usesPoolKey: poolKey } : {}) };
}

/**
 * «Characteristic Spells»: «Choose two level 3 spells in your spellbook… you can cast each of them
 * once at level 3 without expending a spell slot» — Характерні заклинання чарівника.
 *
 * Рішення власника 2026-09-08: носій показує **скільки безкоштовних застосувань є насправді**, а
 * не одне й не жодного. Доти фіча стояла у виключеннях саме тому, що лічильник на 2 не стежить,
 * котре із двох заклинань витрачено; власник обрав правильну стелю, бо лист — трекер, а не
 * рушій ([Р26](../../docs/DECISIONS.md#р26)). Та сама форма покриває родоводи видів і два дотики
 * серед рис персонажа.
 */
const CHOSEN_SPELLS_WITH_FREE_CAST = /Choose (\w+) level \d+ spells? in your spellbook/;

function findFreeCastsOfChosenSpells(body: string): UsesCounts | null {
  const match = CHOSEN_SPELLS_WITH_FREE_CAST.exec(body);
  if (!match || !/cast each of them once/.test(body)) return null;

  const usesCount = COUNT_WORDS[match[1].toLowerCase()];
  if (usesCount === undefined) throw new Error(`Характерні заклинання: невідома кількість «${match[1]}».`);

  return { usesCount };
}

function findUsesFromLevelTable(
  block: ClassFeatureBlock,
  resourceColumns: ResourceColumnsByClass,
): UsesCounts | null {
  const entry = RESOURCE_COLUMNS.find(
    (candidate) => candidate.className === block.className && candidate.featureName === block.featureName,
  );
  if (!entry) return null;

  const byLevel = resourceColumns.get(block.className)?.get(entry.column);
  if (!byLevel?.length) {
    throw new Error(`${block.className}: колонка «${entry.column}» не дала жодного числа.`);
  }

  return { usesCountSpecial: byLevel };
}

/**
 * KR31.3 — числа використань, пули й тип дії підкласових фіч 2024, виведені з джерела.
 *
 * Джерело тут інше, ніж у класів, і це рішення власника від 2026-09-07: SRD 5.2 містить рівно
 * 12 підкласів, а корпус — 76, тож «звірка з книгою» для 64 із них неможлива. Натомість беруться
 * локальні сторінки `data/2024/source/raw/subclass/*.html`, з яких `parse-subclasses.ts` уже
 * дістає англійський текст фіч. Властивість лишається та сама, що в класового проходу: числа
 * виводяться з відтворюваного джерела, а не з памʼяті ([Р19](../../docs/DECISIONS.md#р19),
 * [Р27](../../docs/DECISIONS.md#р27)).
 *
 * Форми речень спільні з класами й лежать у `feature-uses-from-text.ts`. Тут — те, чого класи не
 * мають: таблиця прогресії **всередині** тіла фічі й пули, які підклас не дає, а витрачає.
 */

import {
  compressUsesByLevel,
  findDisplayTypes,
  findRecoveryRest,
  findUsesInText,
  COUNT_WORDS,
  type DisplayTypeName,
  type FeatureUses2024,
  type UsesByLevel,
  type UsesCounts,
} from "./feature-uses-from-text";

/// Фіча, яка з пулу тільки **витрачає**, максимуму не має — лише ключ пулу, як у сіді 2014.
export type SubclassFeatureUses2024 = Partial<FeatureUses2024> & { usesPoolKey?: string };

export type SubclassFeatureMechanics2024 = {
  subclassEngName: string;
  level: number;
  featureName: string;
  displayType: DisplayTypeName[];
  uses?: SubclassFeatureUses2024;
};

export type SubclassFeatureSource = { level: number; name: string; descriptionEng: string };
export type SubclassSource = { engName: string; featuresEng: SubclassFeatureSource[] };

export function extractSubclassFeatureMechanics2024(subclasses: SubclassSource[]): SubclassFeatureMechanics2024[] {
  return subclasses.flatMap((subclass) =>
    subclass.featuresEng.map((feature) => {
      const counts = findCounts(subclass.engName, feature);
      const uses = findUses(subclass.engName, feature, counts);
      return {
        subclassEngName: subclass.engName,
        level: feature.level,
        featureName: feature.name,
        displayType: findDisplayTypes(feature.descriptionEng, Boolean(counts)),
        ...(uses ? { uses } : {}),
      };
    }),
  );
}

function findUses(
  subclassEngName: string,
  feature: SubclassFeatureSource,
  counts: UsesCounts | null,
): SubclassFeatureUses2024 | undefined {
  const key = buildFeatureKey(subclassEngName, feature.name);

  if (!counts) {
    const spentPoolKey = findSpentPoolKey(feature.descriptionEng);
    return spentPoolKey ? { usesPoolKey: spentPoolKey } : undefined;
  }

  const limitedUsesPer = findRecoveryRest(feature.descriptionEng);
  if (!limitedUsesPer) {
    throw new Error(`${key}: число використань знайдено, а відпочинку, що їх повертає, — ні.`);
  }

  const providedPoolKey = POOLS_PROVIDED_BY_FEATURE[key];
  return { limitedUsesPer, ...counts, ...(providedPoolKey ? { usesPoolKey: providedPoolKey } : {}) };
}

function findCounts(subclassEngName: string, feature: SubclassFeatureSource): UsesCounts | null {
  const key = buildFeatureKey(subclassEngName, feature.name);

  return (
    findUsesInProgressionTable(key, feature.descriptionEng) ??
    findUsesInDicePoolSentence(feature.name, feature.level, feature.descriptionEng) ??
    findUsesInText(feature.name, feature.level, feature.descriptionEng)
  );
}

function buildFeatureKey(subclassEngName: string, featureName: string): string {
  return `${subclassEngName}: ${featureName.replace(/[’ʼ‘]/g, "'")}`;
}

/// Фіча, яка пул **дає**. Решта носіїв того самого ключа з нього тільки витрачають.
const POOLS_PROVIDED_BY_FEATURE: Record<string, string> = {
  "Battle Master: Combat Superiority": "SUPERIORITY_DICE",
  "Psi Warrior: Psionic Power": "PSIONIC_ENERGY",
  "Soulknife: Psionic Power": "PSIONIC_ENERGY",
};

// ── Таблиця прогресії всередині фічі ───────────────────────────────────────────────────────

/**
 * Колонка таблиці всередині фічі, яка задає максимум. У всьому корпусі таких дві, і обидві —
 * Кубики псіонічної енергії: `| Fighter Level | Die Size | Number |`.
 */
const PROGRESSION_COLUMN_WITH_USES: Record<string, string> = {
  "Psi Warrior: Psionic Power": "Number",
  "Soulknife: Psionic Power": "Number",
};

/**
 * Колонки таблиць прогресії, які числом використань **не** є, і чому. Перелік вичерпний
 * навмисно: невідома колонка зупиняє витяг, як і в класовому проході — інакше нова таблиця
 * книги мовчки лишилася б непоміченою.
 */
const PROGRESSION_COLUMNS_THAT_ARE_NOT_USES: Record<string, string> = {
  Spells: "завжди підготовані заклинання підкласу",
  Spell: "те саме, однина",
  "Prepared Spells": "завжди підготовані заклинання підкласу",
  "Circle Spells": "завжди підготовані заклинання кола",
  "Die Size": "розмір кубика, не кількість",
  "Focus Point Cost": "ціна застосування, живе в feature.use_price — поза межами KR31.3",
  "Min. Monk Level": "поріг доступності рядка, не ресурс",
  "1st": "комірки заклинань",
  "2nd": "комірки заклинань",
  "3rd": "комірки заклинань",
  "4th": "комірки заклинань",
  "1": "комірки заклинань",
  "2": "комірки заклинань",
  "3": "комірки заклинань",
  "4": "комірки заклинань",
};

function findUsesInProgressionTable(key: string, body: string): UsesCounts | null {
  const columnWithUses = PROGRESSION_COLUMN_WITH_USES[key] ?? null;

  for (const table of collectProgressionTables(body)) {
    for (const header of table.headers.slice(1)) {
      if (header === columnWithUses || header in PROGRESSION_COLUMNS_THAT_ARE_NOT_USES) continue;
      throw new Error(
        `${key}: колонка «${header}» невідома — впиши її в PROGRESSION_COLUMN_WITH_USES або в PROGRESSION_COLUMNS_THAT_ARE_NOT_USES.`,
      );
    }

    if (!columnWithUses) continue;
    const index = table.headers.indexOf(columnWithUses);
    if (index > 0) return { usesCountSpecial: compressUsesByLevel(readColumnByLevel(table, index)) };
  }

  return null;
}

type ProgressionTable = { headers: string[]; rows: string[][] };

/**
 * Таблиці прогресії в тілі фічі — ті, чия перша колонка є рівнем. Решта таблиць корпусу
 * (статблоки супутників і форм) прогресією не є, і кількох колонок «Level» не мають.
 */
function collectProgressionTables(body: string): ProgressionTable[] {
  const tables: ProgressionTable[] = [];
  let open: string[][] | null = null;

  const close = () => {
    const [headers, ...rows] = open ?? [];
    if (headers?.[0]?.endsWith("Level")) tables.push({ headers, rows: rows.filter((row) => !/^-+$/.test(row[0])) });
    open = null;
  };

  for (const line of body.split("\n")) {
    if (!line.trimStart().startsWith("|")) {
      close();
      continue;
    }
    (open ??= []).push(line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
  }

  close();
  return tables;
}

function readColumnByLevel(table: ProgressionTable, columnIndex: number): UsesByLevel[] {
  return table.rows
    .map((row) => ({ lvl: Number(row[0]), uses: Number(row[columnIndex]) }))
    .filter((entry) => Number.isInteger(entry.lvl) && Number.isInteger(entry.uses));
}

// ── Кубиковий пул, записаний прозою ────────────────────────────────────────────────────────

/**
 * «You have four Superiority Dice … You gain an additional Superiority Die when you reach
 * Fighter levels 7 (five dice total) and 15 (six dice total)». Форма загальна: база плюс
 * скільки завгодно приростів «(N dice total)». У корпусі 76 підкласів так записана рівно одна
 * фіча — Бойова майстерність майстра бою, — але прирости й базу видно з тексту, а не з памʼяті,
 * тож друга така фіча підхопиться сама.
 */
const DICE_POOL_BASE = /You have (\w+) (?:[A-Z]\w* )*Dice\b/;
const DICE_POOL_GROWTH = /(\d+) \((\w+) dice total\)/g;

function findUsesInDicePoolSentence(featureName: string, level: number, body: string): UsesCounts | null {
  const base = DICE_POOL_BASE.exec(body);
  if (!base) return null;

  const byLevel: UsesByLevel[] = [{ lvl: level, uses: readCountWord(featureName, base[1]) }];
  // `lastIndex` у /g-регекса переживає виклик, тож реєстрова форма клонується на кожен.
  for (const growth of body.matchAll(new RegExp(DICE_POOL_GROWTH.source, DICE_POOL_GROWTH.flags))) {
    byLevel.push({ lvl: Number(growth[1]), uses: readCountWord(featureName, growth[2]) });
  }

  return { usesCountSpecial: compressUsesByLevel(byLevel.sort((left, right) => left.lvl - right.lvl)) };
}

function readCountWord(featureName: string, word: string): number {
  const uses = COUNT_WORDS[word.toLowerCase()];
  if (uses === undefined) throw new Error(`${featureName}: невідома кількість «${word}» у кубиковому пулі.`);
  return uses;
}

// ── Пули, з яких фіча витрачає ─────────────────────────────────────────────────────────────

/**
 * Назва ресурсу в книзі → ключ пулу. Витрата ціною **одне** — і тільки вона: `use_price` фіч
 * класовий прохід свідомо лишив на потім, а без ціни пул із очками (Sorcery Points, Focus
 * Points) списував би одиницю там, де книга бере пʼять. Тому форма нижче вимагає «one» або «a»
 * і не збігається з «spend 5 Sorcery Points».
 */
const SPENDING_SHAPES: Array<{ shape: RegExp; poolKey: string }> = [
  ["Channel Divinity", "CHANNEL_DIVINITY"],
  ["Wild Shape", "WILD_SHAPE"],
  ["Bardic Inspiration", "BARDIC_INSPIRATION"],
  ["Psionic Energy Die", "PSIONIC_ENERGY"],
  ["Superiority Die", "SUPERIORITY_DICE"],
].map(([unitName, poolKey]) => ({
  shape: new RegExp(
    String.raw`expend(?:s|ing)? (?:one|a|an)(?: of (?:your|its) uses of| uses? of)?(?: your| the)? ${unitName}`,
    "i",
  ),
  poolKey,
}));

function findSpentPoolKey(rawBody: string): string | null {
  const body = rawBody.replace(/[’ʼ‘]/g, "'");

  return SPENDING_SHAPES.find(({ shape }) => shape.test(body))?.poolKey ?? null;
}

/**
 * KR16.2 — виправна фаза: кожне виправлення каталогу 2014 має збігатися з пінованим корпусом.
 *
 * Тест не вірить файлу виправлень на слово: він застосовує його до поточного запису й вимагає,
 * щоб розібрані факти зійшлися з 5etools. Помилка у виправленні — це червоний тест, а не тихо
 * зіпсований каталог.
 *
 * Каталог тут — `src/lib/generated/spells.json`, похідний від бази. Відколи власник прогнав
 * `seed:spell-fixes:prod`, він тримає вже **виправлений** стан, тож перевірки описують саме
 * його: виправлення мусить бути правильним і вже застосованим, а не «ще щось міняти».
 */

import { describe, expect, it } from "vitest";
import catalog2014 from "@/lib/generated/spells.json";
import aliasFile from "@/lib/refs/search-aliases.json";
import { spellSchoolTranslations } from "@/lib/refs/translation";
import { toEntitySlug } from "@/lib/slug-utils";
import {
  findDuplicateClassRowIds,
  readSpellCorrections2014,
  SpellCorrection,
} from "../../prisma/seed/spellCorrections2014";
import { SRD_DUPLICATE_PAIRS } from "../../prisma/seed/spellDuplicateMerge2014";
import {
  findEditionBySource,
  findLooseNameKey,
  readSpellClassIndex,
  readSpells,
  SourceSpell,
} from "../../scripts/5etools/schema";
import { readFactsFromSource } from "../../scripts/5etools/source-spell-facts";
import {
  collectUkrainianDice,
  compareSpellFacts,
  readCastingTimeFromUkrainian,
  readClassFromUkrainian,
  readComponentsFromUkrainian,
  readDurationFromUkrainian,
  readRangeFromUkrainian,
  readSchoolFromUkrainian,
  SpellFacts,
} from "../../scripts/5etools/spell-facts";

type CatalogRow = (typeof catalog2014)[number];

const SOURCE_ALIASES: Record<string, string> = {
  PHB: "PHB",
  XGTE: "XGE",
  TCOE: "TCE",
  EGTW: "EGW",
  FTOD: "FTD",
};

/// Monk у переліку `Astral Projection` 5etools виводить із фічі «Empty Body», а не зі списку
/// заклинань, якого в Монаха немає. Той самий виняток стоїть у compare-spells.ts.
const CLASSES_GRANTED_BY_FEATURE: Record<string, string[]> = {
  "Astral Projection": ["Monk"],
};

const corrections = readSpellCorrections2014();
const byEngName = new Map(catalog2014.map((row) => [row.engName, row]));
const classIndex = readSpellClassIndex();
const sourceByName = indexSource2014(readSpells());

function indexSource2014(spells: SourceSpell[]): Map<string, SourceSpell> {
  const index = new Map<string, SourceSpell>();
  for (const spell of spells) {
    if (spell.edition !== "RULES_2014") continue;
    const loose = findLooseNameKey(spell.nameEng);
    if (!index.has(`${spell.source}|${loose}`)) index.set(`${spell.source}|${loose}`, spell);
    if (!index.has(loose)) index.set(loose, spell);
  }
  return index;
}

function applyCorrection(row: CatalogRow, correction: SpellCorrection): CatalogRow {
  const corrected = { ...row, ...(correction.set ?? {}) } as CatalogRow;

  for (const [from, to] of correction.replaceInDescription ?? []) {
    corrected.description = corrected.description.split(from).join(to);
  }

  const classNames = new Set(corrected.spellClasses.map((entry) => entry.className));
  for (const name of correction.addClasses ?? []) classNames.add(name);
  for (const name of correction.removeClasses ?? []) classNames.delete(name);
  corrected.spellClasses = [...classNames].map((className) => ({ className }));

  return corrected;
}

function readFactsFromCatalog(row: CatalogRow): SpellFacts {
  const where = row.engName;
  return {
    level: row.level,
    school: readSchoolFromUkrainian(String(row.school), where),
    castingTime: readCastingTimeFromUkrainian(row.castingTime, where),
    range: readRangeFromUkrainian(row.range, where),
    components: readComponentsFromUkrainian(row.components ?? ""),
    duration: readDurationFromUkrainian(row.duration, where),
    concentration: String(row.hasConcentration).trim() === "так",
    ritual: String(row.hasRitual).trim() === "так",
    classes: row.spellClasses
      .map((entry) => readClassFromUkrainian(entry.className))
      .filter((name): name is string => name !== null)
      .sort(),
    dice: collectUkrainianDice(row.description ?? ""),
  };
}

/// Очікуваний перелік — базовий плюс розширені списки: власник вирішив брати і те, і те.
/// Базовий тримається окремо, бо виправлення цієї сесії чіпають лише його: розширені списки
/// чекають на колонку `spell_classes.source`, без якої нема де показати книгу.
function readExpectedClasses(row: CatalogRow, counterpart: SourceSpell): string[] {
  return [...new Set([...readBaseClasses(row, counterpart), ...readExpandedClasses(counterpart)])];
}

function readBaseClasses(row: CatalogRow, counterpart: SourceSpell): string[] {
  const granted = CLASSES_GRANTED_BY_FEATURE[row.engName] ?? [];
  const entries = readClassEntries(counterpart).filter(
    (entry) => !entry.isVariant && !granted.includes(entry.name)
  );

  return [...new Set(entries.map((entry) => entry.name))];
}

function readExpandedClasses(counterpart: SourceSpell): string[] {
  const entries = readClassEntries(counterpart);
  const base = new Set(entries.filter((entry) => !entry.isVariant).map((entry) => entry.name));

  return [
    ...new Set(
      entries.filter((entry) => entry.isVariant && !base.has(entry.name)).map((e) => e.name)
    ),
  ];
}

function readClassEntries(counterpart: SourceSpell) {
  return (
    classIndex.get(`${counterpart.source}|${findLooseNameKey(counterpart.nameEng)}`) ?? []
  ).filter((entry) => findEditionBySource(entry.source) === "RULES_2014");
}

/// Клас, якого немає в жодному переліку джерела, — дефект; клас із розширеного списку, якого
/// бракує нам, — відкладена робота, і саме тому ці два випадки розведені. Порожній перелік
/// джерела (книги Wildemount його не подають) означає «даних немає», а не «класів нуль».
function findClassProblems(row: CatalogRow, counterpart: SourceSpell): string[] {
  const ours = new Set(
    row.spellClasses
      .map((entry) => readClassFromUkrainian(entry.className))
      .filter((name): name is string => name !== null)
  );

  const expected = readExpectedClasses(row, counterpart);
  const base = readBaseClasses(row, counterpart);
  if (expected.length === 0) return [];

  return [
    ...[...ours].filter((name) => !expected.includes(name)).map((n) => `${row.engName}: зайвий клас ${n}`),
    ...base.filter((name) => !ours.has(name)).map((n) => `${row.engName}: бракує класу ${n}`),
  ];
}

function findAllProblems(row: CatalogRow): string[] {
  const counterpart = findCounterpart(row);
  const theirs = readFactsFromSource(counterpart, [], row.engName);
  const fields = compareSpellFacts(readFactsFromCatalog(row), theirs, { compareClasses: false });

  return [...fields.map((m) => `${row.engName}.${m.field}`), ...findClassProblems(row, counterpart)];
}

function findCounterpart(row: CatalogRow): SourceSpell {
  const loose = findLooseNameKey(row.engName);
  const alias = SOURCE_ALIASES[row.source];
  const found = (alias ? sourceByName.get(`${alias}|${loose}`) : undefined) ?? sourceByName.get(loose);
  if (!found) throw new Error(`${row.engName}: у корпусі немає запису 2014`);
  return found;
}

/// Що саме з виправлення ще не доїхало в каталог. Порожній перелік означає «сід застосовано»;
/// непорожній називає поле, опис або клас, а не просто каже «щось не так».
function findUnappliedParts(row: CatalogRow, correction: SpellCorrection): string[] {
  const fields = row as unknown as Record<string, unknown>;
  const problems: string[] = [];

  for (const [field, value] of Object.entries(correction.set ?? {})) {
    if (String(fields[field]) !== String(value)) {
      problems.push(`${correction.engName}.${field}: «${String(fields[field])}» замість «${value}»`);
    }
  }

  for (const [from] of correction.replaceInDescription ?? []) {
    if (row.description.includes(from)) {
      problems.push(`${correction.engName}: опис усе ще містить «${from}»`);
    }
  }

  const classNames = new Set(row.spellClasses.map((entry) => entry.className));
  for (const name of correction.addClasses ?? []) {
    if (!classNames.has(name)) problems.push(`${correction.engName}: бракує класу ${name}`);
  }
  for (const name of correction.removeClasses ?? []) {
    if (classNames.has(name)) problems.push(`${correction.engName}: лишився клас ${name}`);
  }

  return problems;
}

describe("виправлення каталогу заклинань 2014", () => {
  it("кожне виправлення стосується наявного заклинання і має причину", () => {
    const problems: string[] = [];

    for (const correction of corrections) {
      if (!byEngName.has(correction.engName)) problems.push(`${correction.engName}: немає в каталозі`);
      if (!correction.why?.trim()) problems.push(`${correction.engName}: немає причини`);
    }

    expect(problems).toEqual([]);
  });

  it("сід уже прогнано: у каталозі не лишилося жодної незастосованої частини виправлення", () => {
    const unapplied = corrections.flatMap((correction) =>
      findUnappliedParts(byEngName.get(correction.engName)!, correction)
    );

    expect(unapplied).toEqual([]);
  });

  it("після виправлення механіка збігається з пінованим корпусом 5etools", () => {
    const stillDiverging: string[] = [];

    for (const correction of corrections) {
      const row = applyCorrection(byEngName.get(correction.engName)!, correction);
      const counterpart = findCounterpart(row);
      const theirs = readFactsFromSource(counterpart, [], row.engName);

      for (const mismatch of compareSpellFacts(readFactsFromCatalog(row), theirs, {
        compareClasses: false,
      })) {
        stillDiverging.push(
          `${correction.engName}.${mismatch.field}: «${mismatch.ours}» проти «${mismatch.theirs}»`
        );
      }

      stillDiverging.push(...findClassProblems(row, counterpart));
    }

    expect(stillDiverging).toEqual([]);
  });

  it("виправлені заклинання збігаються з корпусом уже без застосування виправлення", () => {
    const stillBroken = corrections
      .map((correction) => byEngName.get(correction.engName)!)
      .flatMap((row) => findAllProblems(row));

    expect(stillBroken).toEqual([]);
  });

  it("школи в даних записані тим самим словом, що і в spellSchoolTranslations", () => {
    const ratified = new Set(Object.values(spellSchoolTranslations));
    const strangers = [
      ...new Set(catalog2014.map((row) => String(row.school ?? "").trim())),
    ].filter((word) => word !== "" && !ratified.has(word));

    expect(strangers).toEqual([]);
  });

  it("розширені списки лишаються відкладеними, і жодне виправлення їх не чіпає", () => {
    const gated: string[] = [];
    const addedExpanded: string[] = [];

    for (const correction of corrections) {
      const row = byEngName.get(correction.engName)!;
      const counterpart = findCounterpart(row);
      const expandedOnly = readExpandedClasses(counterpart).filter(
        (name) => !readBaseClasses(row, counterpart).includes(name)
      );
      for (const name of correction.addClasses ?? []) {
        if (expandedOnly.includes(readClassFromUkrainian(name) ?? "")) {
          addedExpanded.push(`${correction.engName}: ${name}`);
        }
      }
    }

    for (const row of catalog2014) {
      const counterpart = sourceByName.get(
        `${SOURCE_ALIASES[row.source] ?? row.source}|${findLooseNameKey(row.engName)}`
      ) ?? sourceByName.get(findLooseNameKey(row.engName));
      if (!counterpart) continue;

      const ours = new Set(
        row.spellClasses
          .map((entry) => readClassFromUkrainian(entry.className))
          .filter((name): name is string => name !== null)
      );
      const missing = readExpandedClasses(counterpart).filter((name) => !ours.has(name));
      if (missing.length > 0) gated.push(row.engName);
    }

    expect(gated.length).toBe(46);
    expect(addedExpanded).toEqual([]);
  });

  it("однакові рядки spell_classes зводяться до одного, різні лишаються", () => {
    const rows = [
      { classId: 1, spellId: 10, className: "Друїд" },
      { classId: 2, spellId: 10, className: "Коло землі" },
      { classId: 3, spellId: 10, className: "Коло землі" },
      { classId: 4, spellId: 11, className: "Коло землі" },
      { classId: 5, spellId: 10, className: "Коло землі" },
    ];

    expect(findDuplicateClassRowIds(rows)).toEqual([3, 5]);
  });
});

describe("дублікати під назвами SRD", () => {
  it("злиття прогнано: лишилася книжкова назва, SRD-дублікат зник", () => {
    const survivors = SRD_DUPLICATE_PAIRS.filter((pair) => !byEngName.has(pair.keep)).map((p) => p.keep);
    const leftovers = SRD_DUPLICATE_PAIRS.filter((pair) => byEngName.has(pair.drop)).map((p) => p.drop);

    expect(survivors).toEqual([]);
    expect(leftovers).toEqual([]);
  });

  it("у книзі 2014 виживає саме та назва, яку лишає злиття", () => {
    for (const pair of SRD_DUPLICATE_PAIRS) {
      const loose = findLooseNameKey(pair.keep);
      expect(sourceByName.has(`PHB|${loose}`)).toBe(true);
      expect(sourceByName.has(`PHB|${findLooseNameKey(pair.drop)}`)).toBe(false);
    }
  });

  it("аліас на назву, що зникає, заведено до злиття", () => {
    const aliases = (aliasFile as { aliases: { slug: string; variants: string[] }[] }).aliases;

    for (const pair of SRD_DUPLICATE_PAIRS) {
      const entry = aliases.find((row) => row.slug === toEntitySlug(pair.keep));
      expect(entry, `немає аліаса для ${pair.keep}`).toBeDefined();

      const lowered = entry!.variants.map((variant) => variant.toLocaleLowerCase("uk"));
      expect(lowered).toContain(pair.drop.toLocaleLowerCase("uk"));
      expect(
        lowered.some((variant) => /^арканн/u.test(variant)),
        `немає української форми старої назви для ${pair.drop}`
      ).toBe(true);
    }
  });
});

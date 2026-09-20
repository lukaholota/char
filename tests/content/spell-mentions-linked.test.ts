import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyJsonStringEdits,
  findBareSpellNamesInCarrier,
  findBareSpellNamesInText,
  buildAmbiguousNamesFile,
  collectSpellRegistry,
  countCoverage,
  countJsonCoverage,
  linkMentionsInJson,
  linkMentionsInText,
  linkMentionsInTypeScript,
  listCarriers,
  measureSurfaces,
  readAmbiguousNamesFile,
  readNotASpellFile,
  STATBLOCK_PROSE_KEYS,
  type CoverageRow,
  type SpellRegistry,
} from "../../scripts/spell-links/spell-mentions";

/// KR25.3 — проставляч посилань на заклинання по маркеру `[EngName]` і гейт, який не дає
/// покриттю впасти. Зачіпка — лише маркер: український текст стоїть у відмінках, зшивати по
/// формах слова заборонено тим самим правилом, що й `sed`. Планки нижче — стан після
/// KR25.4 (весь контент 2024, поверхні після прогону сідів і неоднозначні назви за рішенням
/// власника П5 — усе 2026-09-04) бестіарію обох редакцій (KR25.6) і хвоста 2014 (KR25.5) — 2026-09-14; знижувати не можна.

const registry = collectSpellRegistry();

function buildTestRegistry(): SpellRegistry {
  return {
    byEngName: new Map([
      ["fireball", { engName: "Fireball", ukrainianNames: new Set(["Вогнекуля"]) }],
      ["mage hand", { engName: "Mage Hand", ukrainianNames: new Set(["Магічна рука"]) }],
      ["shield", { engName: "Shield", ukrainianNames: new Set(["Щит"]) }],
    ]),
    ambiguous: new Map([["Shield", ["armor"]]]),
  };
}

describe("KR25.3 — що загортається, а що йде у звіт", () => {
  const testRegistry = buildTestRegistry();

  it("загортає рівно «Назва [EngName]» і будує адресу редакції файлу", () => {
    const { text, report } = linkMentionsInText("Ви накладаєте Вогнекуля [Fireball] на ціль.", testRegistry, { edition: "RULES_2024" });
    expect(text).toBe('Ви накладаєте <a href="/2024/spells/fireball">Вогнекуля [Fireball]</a> на ціль.');
    expect(report).toMatchObject({ mentions: 1, wrapped: 1, linked: 0, ambiguous: 0, inflected: [] });

    expect(linkMentionsInText("вивчаєте Магічна рука [Mage Hand].", testRegistry, { edition: "RULES_2014" }).text)
      .toBe('вивчаєте <a href="/spells/mage-hand">Магічна рука [Mage Hand]</a>.');
  });

  it("не чіпає відмінок: «Вогнекулю [Fireball]» лишається текстом і потрапляє у звіт", () => {
    const { text, report } = linkMentionsInText("накладає Вогнекулю [Fireball] щоразу", testRegistry, { edition: "RULES_2024" });
    expect(text).toBe("накладає Вогнекулю [Fireball] щоразу");
    expect(report.inflected).toEqual([{ engName: "Fireball", before: "накладає Вогнекулю " }]);
  });

  it("неоднозначну назву пропускає, посилання в markdown і вже загорнуту згадку — теж", () => {
    const source = [
      "Щит [Shield] дає +2.",
      "[Fireball](#fireball) — стаття.",
      '<a href="/spell/1180">Вогнекуля [Fireball]</a> знову',
    ].join(" ");
    const { text, report } = linkMentionsInText(source, testRegistry, { edition: "RULES_2014" });
    expect(text).toBe(source);
    expect(report).toMatchObject({ mentions: 3, ambiguous: 1, markdownLinks: 1, linked: 1, wrapped: 0 });
  });

  it("другий прогін нічого не міняє", () => {
    const once = linkMentionsInText("Вогнекуля [Fireball] і Магічна рука [Mage Hand]", testRegistry, { edition: "RULES_2024" }).text;
    const twice = linkMentionsInText(once, testRegistry, { edition: "RULES_2024" });
    expect(twice.text).toBe(once);
    expect(twice.report).toMatchObject({ mentions: 2, linked: 2, wrapped: 0 });
  });

  it("у сіді екранує лапки під літерал і не чіпає полів назви", () => {
    const seed = [
      "const features = [{",
      '  name: "Вогнекуля [Fireball]",',
      '  engName: "Fireball",',
      '  optionName: "Вогнекуля [Fireball] необмежено",',
      '  description: "Ви знаєте Вогнекуля [Fireball].",',
      "  shortDescription: 'Ви знаєте Магічна рука [Mage Hand].',",
      "  notes: `Знову Вогнекуля [Fireball]`,",
      "}];",
    ].join("\n");
    const { text, report } = linkMentionsInTypeScript(seed, testRegistry, "RULES_2014");
    expect(text).toContain('description: "Ви знаєте <a href=\\"/spells/fireball\\">Вогнекуля [Fireball]</a>.",');
    expect(text).toContain("shortDescription: 'Ви знаєте <a href=\"/spells/mage-hand\">Магічна рука [Mage Hand]</a>.',");
    expect(text).toContain('notes: `Знову <a href="/spells/fireball">Вогнекуля [Fireball]</a>`,');
    expect(text).toContain('name: "Вогнекуля [Fireball]",');
    expect(text).toContain('optionName: "Вогнекуля [Fireball] необмежено",');
    expect(report).toMatchObject({ mentions: 3, wrapped: 3 });
  });

  it("у JSON пропускає поля назви й підставляє змінений рядок у файл, не переформатовуючи його", () => {
    const value = { name: "Вогнекуля [Fireball]", tags: ["a", "b"], content: "Це Вогнекуля [Fireball]." };
    const source = '{\n  "name": "Вогнекуля [Fireball]",\n  "tags": ["a", "b"],\n  "content": "Це Вогнекуля [Fireball]."\n}\n';
    const edits: { original: string; linked: string }[] = [];
    const linked = linkMentionsInJson(value, testRegistry, "RULES_2024", undefined, edits);
    const written = applyJsonStringEdits(source, edits, linked);

    expect(written).toBe(
      '{\n  "name": "Вогнекуля [Fireball]",\n  "tags": ["a", "b"],\n  "content": "Це <a href=\\"/2024/spells/fireball\\">Вогнекуля [Fireball]</a>."\n}\n'
    );
    expect(countJsonCoverage(value, testRegistry)).toEqual({ mentions: 1, linked: 0 });
    expect(countJsonCoverage(linked, testRegistry)).toEqual({ mentions: 1, linked: 1 });
  });

  it("два записи з дослівно однаковим рядком не завалюють запис файлу", () => {
    const value = [{ prerequisite: "Заклинання Вогнекуля [Fireball]" }, { prerequisite: "Заклинання Вогнекуля [Fireball]" }];
    const source = '[\n  { "prerequisite": "Заклинання Вогнекуля [Fireball]" },\n  { "prerequisite": "Заклинання Вогнекуля [Fireball]" }\n]\n';
    const edits: { original: string; linked: string }[] = [];
    const linked = linkMentionsInJson(value, testRegistry, "RULES_2024", undefined, edits);
    const written = applyJsonStringEdits(source, edits, linked);

    expect(written).not.toBeNull();
    expect(written!.match(/<a href=/g)).toHaveLength(2);
  });
});

/// Друга форма маркера. Назва заклинання в прозі несе `{{Eng}}` (Р20), і проставляч її не бачив:
/// у чародія таблиця «Заклинання чарополумʼя» стояла глосарійними підказками замість посилань.
/// Посилання маркер **заміняє**: сторінка заклинання показує англійську назву сама, а `<a>`
/// навколо `<abbr>` дало б два кліки на одному слові.
describe("маркер оригіналу `Назва{{EngName}}` — посилання заміняє його", () => {
  const testRegistry = buildTestRegistry();

  it("заміняє маркер посиланням і будує адресу редакції файлу", () => {
    const { text, report } = linkMentionsInText("Ви накладаєте Вогнекуля{{Fireball}} на ціль.", testRegistry, { edition: "RULES_2024" });
    expect(text).toBe('Ви накладаєте <a href="/2024/spells/fireball">Вогнекуля</a> на ціль.');
    expect(report).toMatchObject({ mentions: 1, wrapped: 1, linked: 0, ambiguous: 0, inflected: [] });
  });

  it("відмінок і чужий переклад лишає текстом і називає у звіті", () => {
    const { text, report } = linkMentionsInText("накладає Вогнекулю{{Fireball}} щоразу", testRegistry, { edition: "RULES_2024" });
    expect(text).toBe("накладає Вогнекулю{{Fireball}} щоразу");
    expect(report.inflected).toEqual([{ engName: "Fireball", before: "накладає Вогнекулю" }]);
  });

  it("неоднозначну назву без прапорця не чіпає", () => {
    const source = "Щит{{Shield}} дає +2.";
    const { text, report } = linkMentionsInText(source, testRegistry, { edition: "RULES_2014" });
    expect(text).toBe(source);
    expect(report).toMatchObject({ mentions: 1, ambiguous: 1, wrapped: 0 });
  });

  it("парну форму `{{Українське|English}}` не чіпає: ліворуч не назва з каталогу", () => {
    const source = "дає {{Вогняна куля завбільшки з кулак|Fireball}} на вибір.";
    expect(linkMentionsInText(source, testRegistry, { edition: "RULES_2024" }).text).toBe(source);
  });

  it("другий прогін нічого не міняє", () => {
    const once = linkMentionsInText("Вогнекуля{{Fireball}} і Магічна рука{{Mage Hand}}", testRegistry, { edition: "RULES_2024" }).text;
    expect(once).toBe('<a href="/2024/spells/fireball">Вогнекуля</a> і <a href="/2024/spells/mage-hand">Магічна рука</a>');
    expect(linkMentionsInText(once, testRegistry, { edition: "RULES_2024" })).toMatchObject({ text: once, report: { mentions: 0 } });
  });

  it("у таблиці фічі загортає кожну назву окремо", () => {
    const row = "| 3 | Вогнекуля{{Fireball}}, Магічна рука{{Mage Hand}} |";
    expect(linkMentionsInText(row, testRegistry, { edition: "RULES_2024" }).text)
      .toBe('| 3 | <a href="/2024/spells/fireball">Вогнекуля</a>, <a href="/2024/spells/mage-hand">Магічна рука</a> |');
  });

  it("у сіді екранує лапки під літерал і не чіпає полів назви", () => {
    const seed = [
      "const features = [{",
      '  name: "Вогнекуля{{Fireball}}",',
      '  description: "Ви знаєте Вогнекуля{{Fireball}}.",',
      "}];",
    ].join("\n");
    const { text } = linkMentionsInTypeScript(seed, testRegistry, "RULES_2014");
    expect(text).toContain('description: "Ви знаєте <a href=\\"/spells/fireball\\">Вогнекуля</a>.",');
    expect(text).toContain('name: "Вогнекуля{{Fireball}}",');
  });
});

describe("KR25.4 — неоднозначну назву загортає лише свідомий прапорець (П5)", () => {
  const testRegistry = buildTestRegistry();
  const source = "3 рівень: Вогнекуля [Fireball] і Щит [Shield].";

  it("без прапорця неоднозначна назва лишається текстом", () => {
    const { text, report } = linkMentionsInText(source, testRegistry, { edition: "RULES_2024" });
    expect(text).toContain("і Щит [Shield].");
    expect(report).toMatchObject({ wrapped: 1, ambiguous: 1 });
  });

  it("із прапорцем — загортається, як звичайна згадка", () => {
    const { text, report } = linkMentionsInText(source, testRegistry, { edition: "RULES_2024", linkAmbiguous: true });
    expect(text).toContain('і <a href="/2024/spells/shield">Щит [Shield]</a>.');
    expect(report).toMatchObject({ wrapped: 2, ambiguous: 0 });
  });

  it("переглянутий виняток прапорець не бере", () => {
    const options = { edition: "RULES_2024" as const, linkAmbiguous: true, keepAsText: new Set(["Shield"]) };
    const { text, report } = linkMentionsInText(source, testRegistry, options);
    expect(text).toContain("і Щит [Shield].");
    expect(report).toMatchObject({ wrapped: 1, ambiguous: 1 });
  });
});

describe("KR25.6 — статблок: посилання лише в прозі", () => {
  const testRegistry = buildTestRegistry();
  const creature = {
    name: "Маг",
    fields: { damageResistance: "Колюча (від Вогнекуля [Fireball])" },
    actions: [{ name: "Чаклунство", text: "За бажанням: Магічна рука [Mage Hand]" }],
    lairInfo: "У лігві діє Вогнекуля [Fireball].",
  };

  it("механічне поле малюється простим текстом і лишається без якоря, дія й лігво — з якорем", () => {
    const linked = linkMentionsInJson(creature, testRegistry, "RULES_2014", undefined, [], "", { proseKeys: STATBLOCK_PROSE_KEYS }) as typeof creature;

    expect(linked.fields.damageResistance).toBe(creature.fields.damageResistance);
    expect(linked.actions[0].text).toBe('За бажанням: <a href="/spells/mage-hand">Магічна рука [Mage Hand]</a>');
    expect(linked.lairInfo).toBe('У лігві діє <a href="/spells/fireball">Вогнекуля [Fireball]</a>.');
    expect(countJsonCoverage(linked, testRegistry, undefined, "", STATBLOCK_PROSE_KEYS)).toEqual({ mentions: 2, linked: 2 });
  });

  it("партії бестіарію обох редакцій — носії зі статблоковими ключами", () => {
    const bestiary = listCarriers().filter((carrier) => /\/translations\/monsters-20(14|24)\//.test(carrier.path));

    expect(bestiary.length).toBeGreaterThanOrEqual(71);
    expect(bestiary.filter((carrier) => !carrier.proseKeys?.has("text") || carrier.proseKeys.has("damageResistance")).map((carrier) => carrier.path)).toEqual([]);
    expect(new Set(bestiary.map((carrier) => carrier.edition))).toEqual(new Set(["RULES_2014", "RULES_2024"]));
  });
});

/// Файл винятків обслуговує два правила: неоднозначну назву, яку не можна загортати в
/// посилання, і англійську назву, що в українському тексті стоїть предметом розмови, а не
/// згадкою («2014 Branding Smite — Втілення»). Спільне в них одне — запис мусить показувати на
/// живе місце у файлі, інакше він протухає й починає ховати справжню помилку.
describe("KR25.4 — переглянуті винятки лежать у репо з причиною і не протухають", () => {
  it("кожен запис not-a-spell.json указує на реальну згадку в тому файлі", () => {
    const notASpell = readNotASpellFile();
    expect(Object.keys(notASpell).length).toBeGreaterThan(0);

    for (const [path, names] of Object.entries(notASpell)) {
      const carrier = listCarriers().find((c) => c.path === path);
      expect(carrier, `${path}: немає серед носіїв`).toBeDefined();
      const source = readFileSync(join(process.cwd(), path), "utf-8");
      const bareWithoutExceptions = new Set(
        findBareSpellNamesInCarrier(carrier!, registry, process.cwd(), new Set()).map((item) => item.engName),
      );
      for (const [engName, reason] of Object.entries(names)) {
        expect(registry.byEngName.has(engName.toLowerCase()), `${path}: ${engName} — не назва заклинання з каталогу`).toBe(true);
        expect(
          registry.ambiguous.has(engName) ? source.includes(`[${engName}]`) : bareWithoutExceptions.has(engName),
          `${path}: ${engName} — у файлі немає згадки, заради якої стоїть виняток`,
        ).toBe(true);
        expect(reason.trim().length, `${path}: ${engName} без причини`).toBeGreaterThan(20);
      }
    }
  });
});

describe("KR25.3 — неоднозначні назви лежать у репо з причиною", () => {
  it("data/spell-links/ambiguous-names.json дорівнює обчисленому списку, кожен запис — з причиною", () => {
    const stored = readAmbiguousNamesFile();
    expect(stored).toEqual(buildAmbiguousNamesFile(registry));
    for (const [name, reason] of Object.entries(stored)) {
      expect(registry.byEngName.has(name.toLowerCase()), name).toBe(true);
      expect(reason).toMatch(/^так само зветься запис у: \S/);
    }
  });
});

/// Планка — частка звʼязаних згадок і їхня кількість на момент фіксації. Падає й від знятого
/// посилання, і від нового контенту без посилань — саме для цього гейт існує.
/// 2026-09-20 знаменник виріс: проставляч навчився бачити маркер `Назва{{Eng}}`, і згадки, що
/// стояли глосарійними підказками, перестали бути невидимими. Планки перезняті на цьому вимірі —
/// падіння частки тут не «гейт послабили», а «дірку нарешті видно».
type Floor = { mentions: number; linked: number };
const CARRIER_FLOORS: Record<string, Floor> = {
  "data/2024/normalized · RULES_2024": { mentions: 897, linked: 856 },
  "data/2024/rules-uk · RULES_2024": { mentions: 39, linked: 32 },
  "data/2024/bastions-uk · RULES_2024": { mentions: 21, linked: 20 },
  "data/2024/beyond-srd-uk · RULES_2024": { mentions: 40, linked: 38 },
  "data/2024/traps-hazards-uk · RULES_2024": { mentions: 9, linked: 9 },
  "data/2014/rules-uk · RULES_2014": { mentions: 71, linked: 56 },
  "data/2014/beyond-srd-uk · RULES_2014": { mentions: 48, linked: 47 },
  "data/2014/traps-hazards-uk · RULES_2014": { mentions: 8, linked: 8 },
  "data/2014/spells.json · RULES_2014": { mentions: 13, linked: 11 },
  "prisma/seed · RULES_2014": { mentions: 1473, linked: 1457 },
  "prisma/seed · RULES_2024": { mentions: 16, linked: 16 },
  "data/aidedd · RULES_2014": { mentions: 334, linked: 316 },
  "data/5etools/translations/magic-items-2014 · RULES_2014": { mentions: 274, linked: 262 },
  "data/aidedd/translations/monsters-2014 · RULES_2014": { mentions: 1211, linked: 1205 },
  "data/5etools/translations/monsters-2014 · RULES_2014": { mentions: 1027, linked: 1016 },
  "data/aidedd/translations/monsters-2024 · RULES_2024": { mentions: 774, linked: 751 },
  "data/5etools/translations/monsters-2024 · RULES_2024": { mentions: 41, linked: 41 },
};
/// Поверхні, що збираються з бази, приїхали після прогону сідів: 2024 — власником 2026-09-04, хвіст 2014
/// (KR25.5) — 2026-09-14. Між джерелом і сторінкою класу, виду чи предмета стоїть база.
const SURFACE_FLOORS: Record<string, Floor> = {
  "src/lib/generated/rules-2024.json": { mentions: 39, linked: 32 },
  "src/lib/generated/bastions.json": { mentions: 21, linked: 20 },
  "src/lib/generated/creator-content-2024.json": { mentions: 579, linked: 550 },
  "src/lib/generated/creator-content-2014.json": { mentions: 1244, linked: 1227 },
  "src/lib/generated/classes.json": { mentions: 1032, linked: 1012 },
  "src/lib/generated/races.json": { mentions: 235, linked: 219 },
  "src/lib/generated/feats.json": { mentions: 12, linked: 11 },
  "src/lib/generated/infusions.json": { mentions: 18, linked: 16 },
  "src/lib/generated/magicItems.json": { mentions: 659, linked: 629 },
  "src/lib/generated/spells.json": { mentions: 13, linked: 11 },
  "src/lib/generated/rules-2014.json": { mentions: 71, linked: 56 },
  "src/lib/generated/rules-beyond-srd.json": { mentions: 88, linked: 85 },
  "src/lib/generated/traps-hazards.json": { mentions: 17, linked: 17 },
  "src/lib/generated/creatures.json": { mentions: 2402, linked: 2221 },
  "src/lib/generated/creatures2024.json": { mentions: 891, linked: 792 },
};

function groupKey(path: string, edition: string): string {
  const depth = path.includes("/translations/") ? 4 : path.startsWith("prisma/seed") || path.startsWith("data/aidedd") ? 2 : 3;
  return `${path.split("/").slice(0, depth).join("/")} · ${edition}`;
}

function measureGroups(): Record<string, Floor> {
  const groups: Record<string, Floor> = {};
  for (const carrier of listCarriers()) {
    const key = groupKey(carrier.path, carrier.edition);
    const coverage = countCoverage(readFileSync(join(process.cwd(), carrier.path), "utf-8"), carrier.format, registry, carrier.proseKeys);
    groups[key] = { mentions: (groups[key]?.mentions ?? 0) + coverage.mentions, linked: (groups[key]?.linked ?? 0) + coverage.linked };
  }
  return groups;
}

function expectNotBelow(actual: Floor, floor: Floor, label: string): void {
  expect(actual.linked, `${label}: звʼязаних менше за планку`).toBeGreaterThanOrEqual(floor.linked);
  if (floor.mentions > 0) {
    expect(actual.linked * floor.mentions, `${label}: частка впала нижче ${floor.linked}/${floor.mentions}`)
      .toBeGreaterThanOrEqual(floor.linked * actual.mentions);
  }
}

describe("KR25.3 — покриття не падає нижче планки", () => {
  it("джерела — по каталогах", () => {
    const groups = measureGroups();
    for (const [key, floor] of Object.entries(CARRIER_FLOORS)) {
      expect(groups[key], `у списку джерел немає групи ${key}`).toBeDefined();
      expectNotBelow(groups[key], floor, key);
    }
  });

  it("поверхні, що збираються з файлів, несуть те, що є в джерелі", () => {
    const surfaces = Object.fromEntries(measureSurfaces(registry).map((row: CoverageRow) => [row.path, row]));
    for (const [path, floor] of Object.entries(SURFACE_FLOORS)) expectNotBelow(surfaces[path], floor, path);
  });
});

/// Друга дірка того самого правила: проставляч вище чіпляється лише за маркер `[EngName]`, тож
/// назва, написана голою англійською, для нього не існує — ні загорнути, ні порахувати недостачу
/// він її не може. Саме так у картки 2024-виклику потрапило «Накладання Mage Armor на себе».
describe("гола англійська назва заклинання в українському тексті", () => {
  it("детектор бачить голу назву й не чіпає домовлені форми", () => {
    const testRegistry = buildTestRegistry();
    expect(findBareSpellNamesInText("Накладання Fireball на себе", testRegistry)).toEqual(["Fireball"]);
    expect(findBareSpellNamesInText("Вогнекуля [Fireball] на себе", testRegistry)).toEqual([]);
    expect(findBareSpellNamesInText('<a href="/spells/fireball">Вогнекуля [Fireball]</a> знову', testRegistry)).toEqual([]);
    expect(findBareSpellNamesInText("вогняна куля{{Fireball}} у прозі", testRegistry)).toEqual([]);
    expect(findBareSpellNamesInText("A Fireball deals 8d6 damage", testRegistry)).toEqual([]);
    expect(findBareSpellNamesInText("Накладання Fireball на себе", testRegistry, new Set(["Fireball"]))).toEqual([]);
  });

  it("у джерелах контенту жодної не лишилося", () => {
    const found = listCarriers().flatMap((carrier) => findBareSpellNamesInCarrier(carrier, registry));
    expect(found.map((item) => `${item.path} — ${item.engName}: ${item.context}`)).toEqual([]);
  });
});

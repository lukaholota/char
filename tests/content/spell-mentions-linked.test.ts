import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyJsonStringEdits,
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
  type CoverageRow,
  type SpellRegistry,
} from "../../scripts/spell-links/spell-mentions";

/// KR25.3 — проставляч посилань на заклинання по маркеру `[EngName]` і гейт, який не дає
/// покриттю впасти. Зачіпка — лише маркер: український текст стоїть у відмінках, зшивати по
/// формах слова заборонено тим самим правилом, що й `sed`. Планки нижче — стан після
/// KR25.4 (весь контент 2024, поверхні після прогону сідів і неоднозначні назви за рішенням
/// власника П5 — усе 2026-09-04); їх піднімають KR25.5–KR25.6, знижувати не можна.

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

describe("KR25.4 — переглянуті винятки лежать у репо з причиною і не протухають", () => {
  it("кожен запис not-a-spell.json указує на реальну неоднозначну згадку в тому файлі", () => {
    const notASpell = readNotASpellFile();
    expect(Object.keys(notASpell).length).toBeGreaterThan(0);

    for (const [path, names] of Object.entries(notASpell)) {
      const carrier = listCarriers().find((c) => c.path === path);
      expect(carrier, `${path}: немає серед носіїв`).toBeDefined();
      const source = readFileSync(join(process.cwd(), path), "utf-8");
      for (const [engName, reason] of Object.entries(names)) {
        expect(registry.ambiguous.has(engName), `${path}: ${engName} більше не неоднозначна`).toBe(true);
        expect(source, `${path}: ${engName} більше не згадується`).toContain(`[${engName}]`);
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
type Floor = { mentions: number; linked: number };
const CARRIER_FLOORS: Record<string, Floor> = {
  "data/2024/normalized · RULES_2024": { mentions: 732, linked: 697 },
  "data/2024/rules-uk · RULES_2024": { mentions: 39, linked: 32 },
  "data/2024/bastions-uk · RULES_2024": { mentions: 21, linked: 20 },
  "data/2014/rules-uk · RULES_2014": { mentions: 71, linked: 0 },
  "data/2014/beyond-srd-uk · RULES_2014": { mentions: 48, linked: 0 },
  "data/2014/traps-hazards-uk · RULES_2014": { mentions: 8, linked: 0 },
  "prisma/seed · RULES_2014": { mentions: 1123, linked: 1001 },
  "prisma/seed · RULES_2024": { mentions: 16, linked: 16 },
  "data/aidedd · RULES_2014": { mentions: 334, linked: 0 },
};
/// Поверхні 2024 приїхали після прогону сідів власником 2026-09-04 — доти вони стояли на нулі,
/// бо між нормалізованим JSON і сторінкою класу, підкласу й виду стоїть база.
const SURFACE_FLOORS: Record<string, Floor> = {
  "src/lib/generated/rules-2024.json": { mentions: 39, linked: 32 },
  "src/lib/generated/bastions.json": { mentions: 21, linked: 20 },
  "src/lib/generated/creator-content-2024.json": { mentions: 390, linked: 353 },
  "src/lib/generated/classes.json": { mentions: 907, linked: 885 },
  "src/lib/generated/races.json": { mentions: 233, linked: 157 },
};

function groupKey(path: string, edition: string): string {
  const depth = path.startsWith("prisma/seed") || path.startsWith("data/aidedd") ? 2 : 3;
  return `${path.split("/").slice(0, depth).join("/")} · ${edition}`;
}

function measureGroups(): Record<string, Floor> {
  const groups: Record<string, Floor> = {};
  for (const carrier of listCarriers()) {
    const key = groupKey(carrier.path, carrier.edition);
    const coverage = countCoverage(readFileSync(join(process.cwd(), carrier.path), "utf-8"), carrier.format, registry);
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

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Source } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { sourceTranslations } from "@/lib/refs/translation";
import { LEGACY_SUBCLASSES_2024, findSpellEngName2024 } from "@/rules/legacy-subclasses-2024";
import registry from "../../data/2024/legacy-subclasses.json";
import warlockSpellLists from "../../data/2014/warlock-expanded-spell-lists.json";
import subclasses2024 from "../../data/2024/normalized/subclasses.json";
import spells2024 from "../../data/2024/normalized/spells.json";
import { readSubclassFeatureSeedInputs } from "../../prisma/seed/subclassFeatureSeed";
import { readSubclassSeedInputs } from "../../prisma/seed/subclassSeed";
import { toSubclassEnum } from "../../prisma/seed/subclassSeed2024";

/// Задано руками: вгадування за підрядком при вимірі O43 знайшло «Light» у «Twilight».
const FIVE_ETOOLS_SHORT_NAME: Record<string, string> = {
  THE_GENIE: "Genie",
  HEXBLADE: "Hexblade",
  FATHOMLESS: "Fathomless",
  UNDYING: "Undying",
};

const FIVE_ETOOLS_SOURCE: Record<string, string> = {
  PHB: "PHB",
  TCOE: "TCE",
  XGTE: "XGE",
  SCAG: "SCAG",
};

type FiveEtoolsSubclass = { shortName: string; source: string; classSource: string; reprintedAs?: string[] };

function readFiveEtoolsSubclasses(class2014: string): FiveEtoolsSubclass[] {
  const classSlug = class2014.replace(/_2014$/, "").toLowerCase();
  const raw = readFileSync(join(process.cwd(), `data/5etools/raw/class/class-${classSlug}.json`), "utf-8");
  return JSON.parse(raw).subclass;
}

function findOriginal2014Record(entry: (typeof LEGACY_SUBCLASSES_2024)[number]): FiveEtoolsSubclass | undefined {
  return readFiveEtoolsSubclasses(entry.class2014).find(
    (record) =>
      record.classSource === "PHB" &&
      record.shortName === FIVE_ETOOLS_SHORT_NAME[entry.subclass] &&
      record.source === FIVE_ETOOLS_SOURCE[entry.source],
  );
}

function collectOccupied2024SubclassKeys(): Set<string> {
  return new Set(subclasses2024.map((subclass) => `${subclass.className.toUpperCase()}_2024|${toSubclassEnum(subclass.engName)}`));
}

function collectLegacyWarlockSpellNames(): string[] {
  const legacyWarlockSubclasses = new Set(
    LEGACY_SUBCLASSES_2024.filter((entry) => entry.class2014 === "WARLOCK_2014").map((entry) => entry.subclass),
  );
  return warlockSpellLists.lists
    .filter((list) => legacyWarlockSubclasses.has(list.subclass))
    .flatMap((list) => list.spells.map((spell) => spell.engName));
}

describe("O43 — реєстр легасі-підкласів 2024", () => {
  it("кожен підклас реєстру існує як підклас 2014 свого класу", () => {
    const seeded2014 = new Set(readSubclassSeedInputs().map((input) => `${input.classConnect}|${input.name}`));
    const missing = LEGACY_SUBCLASSES_2024.filter((entry) => !seeded2014.has(`${entry.class2014}|${entry.subclass}`));

    expect(missing).toEqual([]);
  });

  it("жоден підклас реєстру не зайнятий тією ж назвою під класом 2024", () => {
    const occupied = collectOccupied2024SubclassKeys();
    const clashing = LEGACY_SUBCLASSES_2024.filter((entry) => occupied.has(`${entry.class2024}|${entry.subclass}`));

    expect(clashing).toEqual([]);
  });

  it("жоден підклас реєстру не перевиданий у 2024 — за записом 5etools із тієї ж книги", () => {
    const unmapped = LEGACY_SUBCLASSES_2024.filter((entry) => FIVE_ETOOLS_SHORT_NAME[entry.subclass] === undefined);
    expect(unmapped).toEqual([]);

    const problems = LEGACY_SUBCLASSES_2024.flatMap((entry) => {
      const original = findOriginal2014Record(entry);
      if (!original) return [`${entry.subclass}: немає запису 5etools classSource PHB з книги ${entry.source}`];
      if (original.reprintedAs) return [`${entry.subclass}: перевиданий як ${original.reprintedAs.join(", ")}`];
      return [];
    });
    expect(problems).toEqual([]);
  });

  it("книга кожного підкласу — значення enum Source з перекладом", () => {
    const sourceValues = new Set<string>(Object.values(Source));
    const translatedSources = new Set(Object.keys(sourceTranslations));
    const bad = LEGACY_SUBCLASSES_2024.filter((entry) => !sourceValues.has(entry.source) || !translatedSources.has(entry.source));

    expect(bad).toEqual([]);
  });

  it("кожне заклинання списку легасі-покровителя має рядок 2024", () => {
    const legacyWarlocks = LEGACY_SUBCLASSES_2024.filter((entry) => entry.class2014 === "WARLOCK_2014");
    const listed = new Set(warlockSpellLists.lists.map((list) => list.subclass));
    expect(legacyWarlocks.filter((entry) => !listed.has(entry.subclass))).toEqual([]);

    const spellNames2024 = new Set(spells2024.map((spell) => spell.engName));
    const without2024Row = collectLegacyWarlockSpellNames().filter((engName) => !spellNames2024.has(findSpellEngName2024(engName)));
    expect([...new Set(without2024Row)]).toEqual([]);
  });

  it("риса розширеного списку 2014, яку заміняє легасі-рядок, є в сіді рис 2014", () => {
    const featureEngNames = new Set(readSubclassFeatureSeedInputs().map((input) => input.engName));

    expect(LEGACY_SUBCLASSES_2024.filter((entry) => !featureEngNames.has(entry.expandedSpellsFeature2014)).map((entry) => entry.subclass)).toEqual([]);
  });

  it("перейменування реєстру — ті самі, що в spells.json 2024, і лише потрібні спискам", () => {
    const renamedInSource = new Set(
      spells2024.filter((spell) => spell.kind === "renamed").map((spell) => `${spell.old2014EngName}→${spell.engName}`),
    );
    const listedSpellNames = new Set(collectLegacyWarlockSpellNames());
    const renames = Object.entries(registry.spellRenames2014To2024);

    expect(renames.filter(([from, to]) => !renamedInSource.has(`${from}→${to}`))).toEqual([]);
    expect(renames.filter(([from]) => !listedSpellNames.has(from))).toEqual([]);
  });
});

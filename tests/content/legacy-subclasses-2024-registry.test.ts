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

/// Пункт «не перевиданий» звіряє реєстр із дзеркалом 5etools, якого в git немає, тому живе окремо —
/// `tests/content/legacy-subclasses-2024-reprints.test.ts` у корпусному наборі.
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

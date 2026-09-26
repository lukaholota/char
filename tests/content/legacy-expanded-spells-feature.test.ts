import { describe, expect, it } from "vitest";

import spells2024 from "../../data/2024/normalized/spells.json";
import { buildLegacyExpandedSpellsFeature } from "../../prisma/seed/helpers/legacyExpandedSpellsFeature";
import { findLegacySubclass2024, LEGACY_SUBCLASSES_2024 } from "@/rules/legacy-subclasses-2024";

const SPELL_NAMES_2024 = new Map(spells2024.map((spell) => [spell.engName, spell.name]));

function buildFor(subclass: string) {
  const entry = findLegacySubclass2024("WARLOCK_2024", subclass);
  if (!entry) throw new Error(`${subclass} не в реєстрі`);
  return buildLegacyExpandedSpellsFeature(entry, SPELL_NAMES_2024);
}

describe("O43 — риса розширеного списку легасі-покровителя зі списком 2024", () => {
  it("кожне посилання веде на заклинання 2024, жодне — у довідник 2014", () => {
    for (const entry of LEGACY_SUBCLASSES_2024.filter((candidate) => candidate.expandedSpellsFeature2014)) {
      const { description } = buildLegacyExpandedSpellsFeature(entry, SPELL_NAMES_2024);
      const hrefs = [...description.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

      expect(hrefs.length, entry.subclass).toBeGreaterThan(0);
      expect(hrefs.filter((href) => !href.startsWith("/2024/spells/")), entry.subclass).toEqual([]);
    }
  });

  it("Відьмацький клинок називає Shining Smite 2024, а не Branding Smite", () => {
    const { description } = buildFor("HEXBLADE");

    expect(description).toContain('href="/2024/spells/shining-smite"');
    expect(description).not.toContain("Branding Smite");
  });

  it("Джин — спільний список і по рядку на кожен рід, назви родів зі словника", () => {
    const { description, name } = buildFor("THE_GENIE");

    expect(name).toBe("Заклинання патрона (Джин)");
    expect(description.match(/^- (Дао|Джин|Іфрит|Марід): /gm)).toHaveLength(4);
    expect(description).toContain("Для будь-якого роду:");
  });

  it("назва риси — переклад підкласу з translation.ts, engName унікальний для легасі-рядка", () => {
    expect(buildFor("UNDYING")).toMatchObject({ name: "Заклинання патрона (Невмирущий)", engName: "Undying: Expanded Spell List (legacy 2024)" });
  });
});

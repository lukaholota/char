/**
 * KR31.3 — числа використань і тип дії рис видів 2024 у файлі-джерелі мусять дорівнювати джерелу.
 *
 * Джерел тут **два**, і це навмисно. Витяг читає локальні сторінки
 * `data/2024/source/raw/species/*.html` — вони покривають усі десять видів. SRD 5.2
 * (`data/2024/srd/character-origins.md`) покриває девʼять із десяти (аазимара в ньому немає) і
 * править тут за **друге, незалежне** читання: гейт виводить із нього ті самі лічильники своїм
 * розбором і вимагає збігу. Помилка в одному розборі не збіжиться сама з собою.
 *
 * Окремо гейт стереже сам `species.json`: його `descriptionEng` — дзеркало сторінок, і воно вже
 * розходилося. Виміряно 2026-09-08: «Orc: Relentless Endurance» ніс зайве речення Адреналінового
 * ривка (БМ використань на короткий відпочинок замість одного на довгий), а «Tiefling:
 * Otherworldly Presence» — абзац Демонічної спадщини про безкоштовне застосування.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSpeciesSources } from "../../scripts/2024/parse-species";
import { extractSpeciesTraitMechanics2024 } from "../../scripts/2024/species-trait-uses";
import { applyMechanicsToSpecies, SPECIES_JSON } from "../../scripts/2024/parse-species-trait-uses";

type TraitJson = { engName: string; descriptionEng: string; displayType?: string[]; uses?: Record<string, unknown> };
type SpeciesJson = { engName: string; traits?: TraitJson[] };

const speciesFromFile: SpeciesJson[] = JSON.parse(readFileSync(join(process.cwd(), SPECIES_JSON), "utf-8"));

function listTraits(predicate: (trait: TraitJson) => boolean): string[] {
  return speciesFromFile
    .flatMap((species) => (species.traits ?? []).map((trait) => ({ species, trait })))
    .filter(({ trait }) => predicate(trait))
    .map(({ species, trait }) => `${species.engName}: ${trait.engName}`)
    .sort();
}

function findTrait(speciesEngName: string, traitEngName: string): TraitJson {
  return speciesFromFile
    .find((species) => species.engName === speciesEngName)!
    .traits!.find((candidate) => candidate.engName === traitEngName)!;
}

function flatten(text: string): string {
  return text.replace(/[’ʼ‘]/g, "'").replace(/\s+/g, " ").trim();
}

/**
 * Друге читання: риси девʼяти видів прямо з SRD. Заголовків два види, і обидва потрібні:
 * курсивний `_Trait._` — сама риса, жирний `**Option.**` — її варіант, який вікі й
 * `species.json` тримають окремою рисою (Лісовий гном, дари Велетенського походження).
 * Секція виду тягнеться від `#### Species` до наступного заголовка того ж рівня.
 */
function readSpeciesTraitsFromSrd(): Map<string, Map<string, string>> {
  const srd = readFileSync(join(process.cwd(), "data/2024/srd/character-origins.md"), "utf-8");
  const section = srd.slice(srd.indexOf("### Species Descriptions"));
  const bySpecies = new Map<string, Map<string, string>>();

  let traits: Map<string, string> | null = null;
  let openName: string | null = null;
  let openLines: string[] = [];

  const closeTrait = () => {
    if (openName && traits) traits.set(openName, openLines.join("\n").trim());
    openName = null;
    openLines = [];
  };

  for (const line of section.split("\n")) {
    const speciesHeading = /^#### (.+)$/.exec(line);
    if (speciesHeading) {
      closeTrait();
      traits = new Map();
      bySpecies.set(speciesHeading[1].trim(), traits);
      continue;
    }

    const traitHeading = /^_([^_]+)\._ ?(.*)$/.exec(line) ?? /^\*\*([^*]+)\.\*\* ?(.*)$/.exec(line);
    if (traitHeading) {
      closeTrait();
      openName = traitHeading[1].trim();
      openLines = [traitHeading[2]];
      continue;
    }

    if (openName) openLines.push(line);
  }

  closeTrait();
  return bySpecies;
}

describe("числа використань рис видів 2024", () => {
  it("файл-джерело дорівнює витягу з сирих сторінок", () => {
    const rebuilt = applyMechanicsToSpecies(
      structuredClone(speciesFromFile),
      extractSpeciesTraitMechanics2024(readSpeciesSources()),
    );

    expect(JSON.stringify(rebuilt, null, 2)).toBe(JSON.stringify(speciesFromFile, null, 2));
  });

  it("лічильник має рівно той перелік рис, який дає джерело", () => {
    expect(listTraits((trait) => Boolean(trait.uses?.limitedUsesPer))).toEqual([
      "Aasimar: Celestial Revelation",
      "Aasimar: Healing Hands",
      "Dragonborn: Breath Weapon",
      "Dragonborn: Draconic Flight",
      "Dwarf: Stonecunning",
      "Elf: Elven Lineage",
      "Gnome: Forest Gnome",
      "Goliath: Giant Ancestry",
      "Goliath: Large Form",
      "Orc: Adrenaline Rush",
      "Orc: Relentless Endurance",
      "Tiefling: Fiendish Legacy",
    ]);
  });

  it("англійський текст риси у файлі не суперечить сторінці, з якої знятий", () => {
    const bySpecies = new Map(
      readSpeciesSources().map((species) => [species.engName, new Map(species.traits.map((t) => [t.name, t.descriptionEng]))]),
    );

    const drifted = speciesFromFile
      .flatMap((species) => (species.traits ?? []).map((trait) => ({ species, trait })))
      .filter(({ species, trait }) => {
        const source = bySpecies.get(species.engName)?.get(trait.engName);
        return source === undefined || !flatten(source).includes(flatten(trait.descriptionEng));
      })
      .map(({ species, trait }) => `${species.engName}: ${trait.engName}`);

    expect(drifted).toEqual([]);
  });

  it("SRD 5.2 дає ті самі лічильники для девʼяти видів, які в ньому є", () => {
    const fromSrd = readSpeciesTraitsFromSrd();
    expect([...fromSrd.keys()]).toEqual([
      "Dragonborn",
      "Dwarf",
      "Elf",
      "Gnome",
      "Goliath",
      "Halfling",
      "Human",
      "Orc",
      "Tiefling",
    ]);

    const asSources = [...fromSrd].map(([engName, traits]) => ({
      engName,
      traits: [...traits].map(([name, descriptionEng]) => ({ name, descriptionEng })),
    }));

    const fromSrdMechanics = extractSpeciesTraitMechanics2024(asSources)
      .filter((row) => row.uses)
      .map((row) => `${row.speciesEngName}: ${row.traitName} → ${JSON.stringify(row.uses)}`)
      .sort();

    const fromFile = speciesFromFile
      .filter((species) => fromSrd.has(species.engName))
      .flatMap((species) => (species.traits ?? []).map((trait) => ({ species, trait })))
      .filter(({ trait }) => trait.uses)
      .map(({ species, trait }) => `${species.engName}: ${trait.engName} → ${JSON.stringify(trait.uses)}`)
      .sort();

    expect(fromSrdMechanics).toEqual(fromFile);
  });

  it("бонус майстерності живе в своїй колонці, а не у формулі", () => {
    const byProficiencyBonus = listTraits((trait) => trait.uses?.usesCountDependsOnProficiencyBonus === true);

    expect(byProficiencyBonus).toEqual([
      "Dragonborn: Breath Weapon",
      "Dwarf: Stonecunning",
      "Gnome: Forest Gnome",
      "Goliath: Giant Ancestry",
      "Orc: Adrenaline Rush",
    ]);
    expect(byProficiencyBonus.map((key) => key.split(": ")).every(([species, trait]) => !findTrait(species, trait).uses?.usesCountSpecial)).toBe(true);
  });

  it("заклинання родоводу дають стільки безкоштовних застосувань, скільки має персонаж", () => {
    for (const [species, trait] of [
      ["Elf", "Elven Lineage"],
      ["Tiefling", "Fiendish Legacy"],
    ]) {
      expect(findTrait(species, trait).uses).toEqual({
        limitedUsesPer: "LONG_REST",
        usesCountSpecial: [
          { lvl: 3, uses: 1 },
          { lvl: 5, uses: 2 },
        ],
      });
    }
  });

  it("у `usesCountSpecial` лежить максимум, а не маркер (BUG-011)", () => {
    const shapes = speciesFromFile
      .flatMap((species) => species.traits ?? [])
      .map((trait) => trait.uses?.usesCountSpecial)
      .filter((special): special is object => Boolean(special))
      .filter((special) => {
        if (Array.isArray(special)) {
          return !special.every((entry) => typeof entry?.lvl === "number" && typeof entry?.uses === "number");
        }
        return (special as { type?: string }).type !== "FORMULA";
      });

    expect(shapes).toEqual([]);
  });

  it("риса з лічильником показується як ресурс класу, і тільки вона", () => {
    expect(listTraits((trait) => Boolean(trait.displayType?.includes("CLASS_RESOURCE")))).toEqual(
      listTraits((trait) => Boolean(trait.uses?.limitedUsesPer)),
    );
  });

  it("кожна риса виду має тип дії — порожнього поля не лишилося", () => {
    expect(listTraits((trait) => !trait.displayType?.length)).toEqual([]);
  });
});

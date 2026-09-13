import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import classes from "../../data/2024/normalized/classes.json";
import classChoices from "../../data/2024/normalized/class-choices.json";
import subclassChoices from "../../data/2024/normalized/subclass-choices.json";
import metamagic from "../../data/2024/normalized/metamagic.json";
import subclassSource from "../../data/2024/source/subclasses-extracted.json";

/**
 * KR31.2 — рівні кожного вибору 2024 звіряються з книгою в репо, не з памʼяті. Класи й три
 * підкласи читаються з `data/2024/srd/classes.md` (заголовки «#### Level N: Назва» всередині
 * секції класу чи підкласу), Майстер бою — зі збереженої сторінки Wikidot, бо в SRD його немає.
 */
const SRD = readFileSync("data/2024/srd/classes.md", "utf8");

const CLASS_SECTIONS: Record<string, string> = {
  BARBARIAN_2024: "Barbarian",
  BARD_2024: "Bard",
  CLERIC_2024: "Cleric",
  DRUID_2024: "Druid",
  FIGHTER_2024: "Fighter",
  MONK_2024: "Monk",
  PALADIN_2024: "Paladin",
  RANGER_2024: "Ranger",
  ROGUE_2024: "Rogue",
  SORCERER_2024: "Sorcerer",
  WARLOCK_2024: "Warlock",
  WIZARD_2024: "Wizard",
};

const SUBCLASS_SECTIONS: Record<string, string> = {
  CIRCLE_OF_THE_LAND: "Druid Subclass: Circle of the Land",
  HUNTER: "Ranger Subclass: Hunter",
  DRACONIC_SORCERY: "Sorcerer Subclass: Draconic Sorcery",
};

type Grant = { owner: string; featureEng: string; levels: number[] };

type ChoiceMechanics = {
  skillExpertises?: { count: number };
  skillProficiencies?: { choiceCount: number };
  repeatAtLevels?: number[];
};

describe("KR31.2 — рівні виборів 2024 проти книги", () => {
  it("дає кожен класовий вибір на тих рівнях, які називає SRD", () => {
    for (const grant of collectClassGrants()) {
      const section = CLASS_SECTIONS[grant.owner];
      expect(section, `клас поза SRD: ${grant.owner}`).toBeDefined();
      const feature = findSrdFeature(`${section} Class Features`, grant.featureEng);
      expect(feature, `${grant.owner}: ${grant.featureEng}`).toBeDefined();

      for (const level of grant.levels) {
        expect(grantsAtLevel(feature!, level, section), `${grant.owner}: ${grant.featureEng}, рівень ${level}`).toBe(true);
      }
    }
  });

  it("дає кожен підкласовий вибір на тих рівнях, які називає SRD", () => {
    for (const grant of collectSubclassGrants()) {
      const section = SUBCLASS_SECTIONS[grant.owner];
      if (!section) continue;
      const feature = findSrdFeature(section, grant.featureEng);
      expect(feature, `${grant.owner}: ${grant.featureEng}`).toBeDefined();

      for (const level of grant.levels) {
        expect(grantsAtLevel(feature!, level, section), `${grant.owner}: ${grant.featureEng}, рівень ${level}`).toBe(true);
      }
    }
  });

  it("бере кількість маневрів Майстра бою з тексту сторінки, а не з памʼяті", () => {
    const superiority = findWikidotFeature("Battle Master", "Combat Superiority");
    const first = superiority.match(/You learn (\w+) maneuvers of your choice/);
    const additional = superiority.match(/You learn (\w+) additional maneuvers of your choice when you reach Fighter levels ([\d,\s]+and \d+)/);
    const group = subclassChoices.groups.find((entry) => entry.subclassName === "BATTLE_MASTER");

    const expected: Record<string, number> = { [String(3)]: toCount(first?.[1]) };
    for (const level of readLevels(additional?.[2])) expected[String(level)] = toCount(additional?.[1]);

    expect(group?.picksAtLevel).toEqual(expected);
    expect(group?.options).toHaveLength(countWikidotManeuvers());
  });

  it("бере кількість експертиз і метамагії з тексту книги", () => {
    const stated = collectStatedCounts();
    expect(stated.filter((entry) => entry.featureEng !== "Metamagic"), "джерело втратило надання експертизи").toHaveLength(5);

    for (const { owner, featureEng, count } of stated) {
      const text = findSrdFeature(`${CLASS_SECTIONS[owner]} Class Features`, featureEng)!;
      expect(findStatedCount(text), `${owner}: ${featureEng}`).toBe(count);
    }
  });
});

function collectClassGrants(): Grant[] {
  const fromArtifact = classChoices.groups.map((group) => ({
    owner: group.className,
    featureEng: group.featureEng,
    levels: Object.keys(group.picksAtLevel).map(Number),
  }));

  const fromFeatures = classes.flatMap((characterClass) =>
    findChoiceBearingFeatures(characterClass).map(({ feature, mechanics }) => ({
      owner: `${characterClass.engName.toUpperCase()}_2024`,
      featureEng: feature.name,
      levels: [feature.level, ...(mechanics.repeatAtLevels ?? [])],
    })),
  );

  return [
    ...fromArtifact,
    ...fromFeatures,
    { owner: metamagic.className, featureEng: "Metamagic", levels: metamagic.levelsGranted },
  ];
}

function collectSubclassGrants(): Grant[] {
  return subclassChoices.groups.map((group) => ({
    owner: group.subclassName,
    featureEng: group.featureEng,
    levels: Object.keys(group.picksAtLevel).map(Number),
  }));
}

function collectStatedCounts() {
  const fromExpertise = classes.flatMap((characterClass) =>
    findChoiceBearingFeatures(characterClass)
      .filter(({ mechanics }) => mechanics.skillExpertises)
      .map(({ feature, mechanics }) => ({
        owner: `${characterClass.engName.toUpperCase()}_2024`,
        featureEng: feature.name,
        count: mechanics.skillExpertises!.count,
      })),
  );

  return [...fromExpertise, { owner: metamagic.className, featureEng: "Metamagic", count: 2 }];
}

/** Механіка риси лежить то в англійському рядку, то в перекладеному — сід читає обидва, гейт теж. */
function findChoiceBearingFeatures(characterClass: (typeof classes)[number]) {
  return characterClass.featuresEng
    .map((feature, index) => ({ feature, mechanics: readMechanics(feature, characterClass.features[index]) }))
    .filter(({ mechanics }) => mechanics.skillExpertises || mechanics.skillProficiencies);
}

function readMechanics(englishRow: object, translatedRow: object | undefined): ChoiceMechanics {
  const merged = { ...englishRow, ...(translatedRow ?? {}) } as ChoiceMechanics;

  return {
    skillExpertises: merged.skillExpertises,
    skillProficiencies: merged.skillProficiencies,
    repeatAtLevels: merged.repeatAtLevels,
  };
}

function findSrdSection(title: string): string {
  const start = SRD.indexOf(`### ${title}`);
  if (start === -1) return "";
  const end = SRD.indexOf("\n### ", start + 1);

  return SRD.slice(start, end === -1 ? undefined : end);
}

function findSrdFeature(sectionTitle: string, featureEng: string): string | undefined {
  const section = findSrdSection(sectionTitle);
  const heading = new RegExp(`^#### Level (\\d+): ${escapeForRegex(featureEng)}\\s*$`, "m");
  const match = section.match(heading);
  if (!match) return undefined;
  const start = match.index ?? 0;
  const next = section.slice(start + match[0].length).search(/^#### /m);

  return next === -1 ? section.slice(start) : section.slice(start, start + match[0].length + next);
}

/** Повторне надання книга описує не заголовком, а реченням у тексті: «At Bard level 9…». */
function grantsAtLevel(feature: string, level: number, sectionTitle: string): boolean {
  const heading = feature.match(/^#### Level (\d+):/m);
  if (Number(heading?.[1]) === level) return true;
  const className = sectionTitle.split(" ")[0];

  return new RegExp(`${escapeForRegex(className)} levels? [^.]*\\b${level}\\b`).test(feature);
}

function findStatedCount(feature: string): number {
  const skills = feature.match(/(?:in|Choose) (\w+) (?:of your skill proficiencies|of the following skills)/);
  const metamagicOptions = feature.match(/gain (\w+) Metamagic options/);

  return toCount(skills?.[1] ?? metamagicOptions?.[1]);
}

function findWikidotFeature(subclassEng: string, featureEng: string): string {
  const subclass = subclassSource.find((entry) => entry.engName === subclassEng);
  const feature = subclass?.featuresEng.find((entry) => entry.name === featureEng);
  if (!feature) throw new Error(`На збереженій сторінці ${subclassEng} немає риси «${featureEng}»`);

  return feature.descriptionEng;
}

function countWikidotManeuvers(): number {
  const options = findWikidotFeature("Battle Master", "Ultimate Combat Superiority").split("**Maneuver Options**")[1] ?? "";

  return [...options.matchAll(/\*\*([^*]+)\.\*\*/g)].length;
}

function readLevels(text: string | undefined): number[] {
  return [...(text ?? "").matchAll(/\d+/g)].map((match) => Number(match[0]));
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function toCount(word: string | undefined): number {
  const index = NUMBER_WORDS.indexOf((word ?? "").toLowerCase());

  return index === -1 ? Number(word) : index;
}

function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

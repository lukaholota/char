/**
 * KR31.3 — числа використань, пули й тип дії підкласових фіч 2024 у файлі-джерелі мусять
 * дорівнювати джерелу.
 *
 * Джерело тут не SRD: у SRD 5.2 лише 12 підкласів із 76, тож числа виводяться з локальних
 * сторінок `data/2024/source/raw/subclass/*.html` (рішення власника 2026-09-07). Гейт читає їх,
 * а не памʼять: правка числа руками в `subclasses.json` робить його червоним, і так само робить
 * нове формулювання в джерелі, якого витяг не розуміє.
 *
 * Числа з таблиць прогресії звіряються **другим, незалежним** читанням тих самих таблиць — прямо
 * тут, комірка за коміркою, — щоб помилка в компресії не збіглася сама з собою.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSubclassSources } from "../../scripts/2024/parse-subclasses";
import { extractSubclassFeatureMechanics2024 } from "../../scripts/2024/subclass-feature-uses";
import { applyMechanicsToSubclasses, SUBCLASSES_JSON } from "../../scripts/2024/parse-subclass-feature-uses";

type FeatureEng = { level: number; name: string; displayType?: string[]; uses?: Record<string, unknown> };
type SubclassJson = { engName: string; featuresEng?: FeatureEng[] };

const subclassesFromFile: SubclassJson[] = JSON.parse(
  readFileSync(join(process.cwd(), SUBCLASSES_JSON), "utf-8"),
);

function listFeatures(predicate: (feature: FeatureEng) => boolean): string[] {
  return subclassesFromFile
    .flatMap((subclass) => (subclass.featuresEng ?? []).map((feature) => ({ subclass, feature })))
    .filter(({ feature }) => predicate(feature))
    .map(({ subclass, feature }) => `${subclass.engName}: ${feature.name}`)
    .sort();
}

/// Друге читання джерела: колонка таблиці прогресії, розгорнута щорівня, без будь-якої компресії.
function readProgressionColumn(subclassEngName: string, featureName: string, column: string): Map<number, number> {
  const feature = readSubclassSources()
    .find((subclass) => subclass.engName === subclassEngName)!
    .featuresEng.find((candidate) => candidate.name === featureName)!;

  const rows = feature.descriptionEng
    .split("\n")
    .filter((line) => line.trimStart().startsWith("|"))
    .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));

  const headers = rows[0];
  const byLevel = new Map<number, number>();
  for (const row of rows.slice(1)) {
    const level = Number(row[0]);
    const value = Number(row[headers.indexOf(column)]);
    if (Number.isInteger(level) && Number.isInteger(value)) byLevel.set(level, value);
  }

  return byLevel;
}

function expandUsesByLevel(byLevel: Array<{ lvl: number; uses: number }>, levels: number[]): Map<number, number> {
  const expanded = new Map<number, number>();
  for (const level of levels) {
    const match = [...byLevel].filter((entry) => entry.lvl <= level).sort((a, b) => b.lvl - a.lvl)[0];
    if (match) expanded.set(level, match.uses);
  }
  return expanded;
}

function findFeature(subclassEngName: string, featureName: string): FeatureEng {
  return subclassesFromFile
    .find((subclass) => subclass.engName === subclassEngName)!
    .featuresEng!.find((candidate) => candidate.name === featureName)!;
}

describe("числа використань підкласових фіч 2024", () => {
  it("файл-джерело дорівнює витягу з сирих сторінок", () => {
    const rebuilt = applyMechanicsToSubclasses(
      structuredClone(subclassesFromFile),
      extractSubclassFeatureMechanics2024(readSubclassSources()),
    );

    expect(JSON.stringify(rebuilt, null, 2)).toBe(JSON.stringify(subclassesFromFile, null, 2));
  });

  it("лічильник має рівно той перелік фіч, який дає джерело", () => {
    expect(listFeatures((feature) => Boolean(feature.uses?.limitedUsesPer))).toEqual([
      "Aberrant Sorcery: Warping Implosion",
      "Alchemist: Chemical Mastery",
      "Alchemist: Restorative Reagents",
      "Arcana Domain: Dispelling Recovery",
      "Arcane Archer: Arcane Shot",
      "Arcane Archer: Magical Ammunition",
      "Arcane Trickster: Spell Thief",
      "Archfey Patron: Beguiling Defenses",
      "Archfey Patron: Steps of the Fey",
      "Armorer: Armor Model",
      "Armorer: Perfected Armor",
      "Artillerist: Eldritch Cannon",
      "Banneret: Group Recovery",
      "Battle Master: Combat Superiority",
      "Battle Master: Know Your Enemy",
      "Battle Smith: Arcane Jolt",
      "Bladesinger: Bladesong",
      "Cartographer: Mapping Magic",
      "Cartographer: Superior Atlas",
      "Celestial Patron: Searing Vengeance",
      "Circle of the Land: Natural Recovery",
      "Circle of the Moon: Moonlight Step",
      "Circle of the Stars: Cosmic Omen",
      "Circle of the Stars: Star Map",
      "Clockwork Sorcery: Clockwork Cavalcade",
      "Clockwork Sorcery: Restore Balance",
      "Clockwork Sorcery: Trance of Order",
      "College of Glamour: Beguiling Magic",
      "College of Glamour: Mantle of Majesty",
      "College of Glamour: Unbreakable Majesty",
      "College of Spirits: Empowered Channeling",
      "College of the Moon: Blessing of Moonlight",
      "Conjurer: Benign Transposition",
      "Diviner: The Third Eye",
      "Draconic Sorcery: Dragon Wings",
      "Enchanter: Hypnotic Presence",
      "Enchanter: Instinctive Charm",
      "Enchanter: Split Enchantment",
      "Fey Wanderer: Misty Wanderer",
      "Fiend Patron: Dark One’s Own Luck",
      "Fiend Patron: Hurl Through Hell",
      "Gloom Stalker: Dread Ambusher",
      "Grave Domain: Divine Reaper",
      "Grave Domain: Sentinel at Death’s Door",
      "Great Old One Patron: Clairvoyant Combatant",
      "Hollow Warden: Ancient Might",
      "Illusionist: Illusory Self",
      "Knowledge Domain: Divine Foreknowledge",
      "Light Domain: Corona of Light",
      "Light Domain: Warding Flare",
      "Necromancer: Death's Master",
      "Necromancer: Undead Thralls",
      "Oath of Devotion: Holy Nimbus",
      "Oath of Glory: Glorious Defense",
      "Oath of Glory: Living Legend",
      "Oath of Vengeance: Avenging Angel",
      "Oath of the Ancients: Elder Champion",
      "Oath of the Ancients: Undying Sentinel",
      "Oath of the Noble Genies: Elemental Rebuke",
      "Oath of the Noble Genies: Noble Scion",
      "Path of the Berserker: Intimidating Presence",
      "Path of the Zealot: Rage of the Gods",
      "Path of the Zealot: Zealous Presence",
      "Phantom: Ghost Walk",
      "Phantom: Wails from the Grave",
      "Psi Warrior: Bulwark of Force",
      "Psi Warrior: Psionic Power",
      "Psi Warrior: Telekinetic Adept",
      "Psi Warrior: Telekinetic Master",
      "Reanimator: Reanimated Companion",
      "Reanimator: Reanimator’s Skill Set",
      "Reanimator: Refined Reanimation",
      "Scion of the Three: Bloodthirst",
      "Shadow Sorcery: Power of Shadow",
      "Shadow Sorcery: Umbral Form",
      "Soulknife: Psionic Power",
      "Soulknife: Psychic Veil",
      "Soulknife: Rend Mind",
      "Spellfire Sorcery: Crown of Spellfire",
      "Transmuter: Empowered Transmutation",
      "Transmuter: Shape-Shifter",
      "Undead Patron: Form of Dread",
      "Undead Patron: Necrotic Husk",
      "Vestige Patron: Semblance of Life",
      "Vestige Patron: Vestige Recovery",
      "War Domain: War Priest",
      "Warrior of Mercy: Flurry of Healing and Harm",
      "Warrior of Mercy: Hand of Ultimate Mercy",
      "Warrior of the Open Hand: Wholeness of Body",
      "Wild Magic Sorcery: Tamed Surge",
      "Winter Walker: Chilling Retribution",
      "Winter Walker: Fortifying Soul",
      "Winter Walker: Frozen Haunt",
    ]);
  });

  it("ключ пулу без власного максимуму несуть рівно ті фічі, що з пулу витрачають", () => {
    const spenders = subclassesFromFile
      .flatMap((subclass) => (subclass.featuresEng ?? []).map((feature) => ({ subclass, feature })))
      .filter(({ feature }) => feature.uses && !feature.uses.limitedUsesPer)
      .map(({ subclass, feature }) => `${subclass.engName}: ${feature.name} → ${feature.uses!.usesPoolKey}`)
      .sort();

    expect(spenders).toEqual([
      "Arcana Domain: Modify Magic → CHANNEL_DIVINITY",
      "Battle Master: Relentless → SUPERIORITY_DICE",
      "Battle Master: Ultimate Combat Superiority → SUPERIORITY_DICE",
      "Circle of the Land: Land’s Aid → WILD_SHAPE",
      "Circle of the Land: Nature’s Sanctuary → WILD_SHAPE",
      "Circle of the Sea: Wrath of the Sea → WILD_SHAPE",
      "Circle of the Stars: Starry Form → WILD_SHAPE",
      "College of Dance: Dazzling Footwork → BARDIC_INSPIRATION",
      "College of Dance: Inspiring Movement → BARDIC_INSPIRATION",
      "College of Dance: Tandem Footwork → BARDIC_INSPIRATION",
      "College of Glamour: Mantle of Inspiration → BARDIC_INSPIRATION",
      "College of Lore: Cutting Words → BARDIC_INSPIRATION",
      "College of Lore: Peerless Skill → BARDIC_INSPIRATION",
      "College of Spirits: Spirits from Beyond → BARDIC_INSPIRATION",
      "College of the Moon: Eventide's Splendor → BARDIC_INSPIRATION",
      "College of the Moon: Moon's Inspiration → BARDIC_INSPIRATION",
      "Grave Domain: Path to the Grave → CHANNEL_DIVINITY",
      "Knowledge Domain: Mind Magic → CHANNEL_DIVINITY",
      "Life Domain: Preserve Life → CHANNEL_DIVINITY",
      "Light Domain: Radiance of the Dawn → CHANNEL_DIVINITY",
      "Oath of Devotion: Sacred Weapon → CHANNEL_DIVINITY",
      "Oath of Glory: Inspiring Smite → CHANNEL_DIVINITY",
      "Oath of Glory: Peerless Athlete → CHANNEL_DIVINITY",
      "Oath of Vengeance: Vow of Enmity → CHANNEL_DIVINITY",
      "Oath of the Ancients: Nature's Wrath → CHANNEL_DIVINITY",
      "Oath of the Noble Genies: Elemental Smite → CHANNEL_DIVINITY",
      "Psi Warrior: Guarded Mind → PSIONIC_ENERGY",
      "Soulknife: Soul Blades → PSIONIC_ENERGY",
      "Trickery Domain: Invoke Duplicity → CHANNEL_DIVINITY",
      "War Domain: Guided Strike → CHANNEL_DIVINITY",
      "War Domain: War God’s Blessing → CHANNEL_DIVINITY",
    ]);
  });

  it.each([
    ["Psi Warrior", "Psionic Power", "Number"],
    ["Soulknife", "Psionic Power", "Number"],
  ])("%s: «%s» у файлі щорівня дорівнює колонці джерела", (subclassEngName, featureName, column) => {
    const fromSource = readProgressionColumn(subclassEngName, featureName, column);
    const feature = findFeature(subclassEngName, featureName);

    const fromFile = expandUsesByLevel(
      feature.uses!.usesCountSpecial as Array<{ lvl: number; uses: number }>,
      [...fromSource.keys()],
    );

    expect([...fromFile.entries()]).toEqual([...fromSource.entries()]);
  });

  it("Бойова майстерність бере кубики з речення джерела, а не з памʼяті", () => {
    const source = readSubclassSources()
      .find((subclass) => subclass.engName === "Battle Master")!
      .featuresEng.find((feature) => feature.name === "Combat Superiority")!.descriptionEng;

    expect(source).toContain("You have four Superiority Dice");
    expect(source).toContain("(five dice total)");
    expect(source).toContain("(six dice total)");

    expect(findFeature("Battle Master", "Combat Superiority").uses).toEqual({
      limitedUsesPer: "SHORT_REST",
      usesCountSpecial: [
        { lvl: 3, uses: 4 },
        { lvl: 7, uses: 5 },
        { lvl: 15, uses: 6 },
      ],
      usesPoolKey: "SUPERIORITY_DICE",
    });
  });

  it("у `usesCountSpecial` лежить максимум, а не маркер (BUG-011)", () => {
    const shapes = subclassesFromFile
      .flatMap((subclass) => subclass.featuresEng ?? [])
      .map((feature) => feature.uses?.usesCountSpecial)
      .filter((special): special is object => Boolean(special))
      .filter((special) => {
        if (Array.isArray(special)) {
          return !special.every((entry) => typeof entry?.lvl === "number" && typeof entry?.uses === "number");
        }
        return (special as { type?: string }).type !== "FORMULA";
      });

    expect(shapes).toEqual([]);
  });

  it("фіча, що з пулу лише витрачає, не несе масштабованого максимуму — інакше вона переб'є класову", () => {
    const spendersWithMaximum = subclassesFromFile
      .flatMap((subclass) => (subclass.featuresEng ?? []).map((feature) => ({ subclass, feature })))
      .filter(({ feature }) => feature.uses && !feature.uses.limitedUsesPer)
      .filter(({ feature }) => feature.uses!.usesCountSpecial || feature.uses!.usesCount)
      .map(({ subclass, feature }) => `${subclass.engName}: ${feature.name}`);

    expect(spendersWithMaximum).toEqual([]);
  });

  it("фіча з лічильником показується як ресурс класу, і тільки вона", () => {
    const asResource = listFeatures((feature) => Boolean(feature.displayType?.includes("CLASS_RESOURCE")));

    expect(asResource).toEqual(listFeatures((feature) => Boolean(feature.uses?.limitedUsesPer)));
  });

  it("кожна підкласова фіча має тип дії — порожнього поля не лишилося", () => {
    const withoutDisplayType = listFeatures((feature) => !feature.displayType?.length);

    expect(withoutDisplayType).toEqual([]);
  });
});

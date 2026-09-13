import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { decomposeMarkup, findReferenceKey, KNOWN_MARKUP_TAGS } from "../../scripts/5etools/markup";
import { MIRROR_REPOSITORY, MIRROR_REVISION } from "../../scripts/5etools/mirror";
import {
  collectStringsDeep,
  findEditionBySource,
  findLooseNameKey,
  readCreaturesFrom,
  readFacilitiesFrom,
  readItemsFrom,
  readSpellsFrom,
} from "../../scripts/5etools/schema";
import dictionary from "../../src/lib/refs/dictionary.json";
import importManifest from "../../data/aidedd/import-manifest.json";
import sourceLock from "../../data/5etools/source-lock.json";

/// Зрізи лежать у tests/fixtures, а не в data/5etools/raw: сирий корпус у .gitignore і його
/// зносить будь-яке перекачування, а тест має бути відтворюваним на свіжому клоні.
const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/5etools");

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf-8"));
}

const creatures = readCreaturesFrom(readFixture("bestiary-slice"), "bestiary-slice");
const items = readItemsFrom(readFixture("items-slice"), "items-slice");
const facilities = readFacilitiesFrom(readFixture("bastions-slice"), "bastions-slice");
const spells = readSpellsFrom(readFixture("spells-slice"), "spells-slice");

function findCreature(nameEng: string, source: string) {
  const found = creatures.find((c) => c.nameEng === nameEng && c.source === source);
  if (!found) throw new Error(`Немає у зрізі: ${nameEng}|${source}`);
  return found;
}

function findItem(nameEng: string, source: string) {
  const found = items.find((i) => i.nameEng === nameEng && i.source === source);
  if (!found) throw new Error(`Немає у зрізі: ${nameEng}|${source}`);
  return found;
}

describe("KR16.1 — розкладач розмітки 5etools", () => {
  it("KR33.5: показує частину тексту так само, як render.js, для тегів класів, рас і бастіонів", () => {
    const cases: [string, string][] = [
      ["{@background vizier|PSA|viziers}", "viziers"],
      ["{@optfeature Superior Technique|TCE}", "Superior Technique"],
      ["{@subclass Alchemist|Artificer|EFA|EFA}", "Alchemist"],
      ["{@subclass Lore|Bard||Lore|College of Lore}", "College of Lore"],
      ["{@subclassFeature Dreadnaught|Artificer|EFA|Armorer|EFA|3|EFA}", "Dreadnaught"],
      ["{@subclassFeature Dreadnaught|Artificer|EFA|Armorer|EFA|3|EFA|Велетень}", "Велетень"],
      ["{@tip Die Size|Psionic Energy Die Size}", "Die Size"],
      ["{@facility Bedroom|XDMG}", "Bedroom"],
      ["{@vehicle Rowboat|GoS|човен}", "човен"],
      ["{@vehupgrade Churning Hull|GoS}", "Churning Hull"],
    ];

    expect(cases.map(([raw]) => decomposeMarkup(raw).text)).toEqual(cases.map(([, text]) => text));
  });

  it("падає на невідомому тегу замість викинути його мовчки", () => {
    expect(() => decomposeMarkup("шкода {@fireballz 8d6} вогнем", "фікстура")).toThrow(
      /Невідомий тег розмітки \{@fireballz\}.*фікстура/s
    );
  });

  it("віддає ключ заклинання, яким воно шукається в dictionary.json → SPELLS", () => {
    const { text, references } = decomposeMarkup("Ти твориш {@spell fireball}.");

    expect(text).toBe("Ти твориш fireball.");
    expect(references).toEqual([
      { kind: "spell", nameEng: "fireball", source: "PHB", key: "fireball" },
    ]);

    const ratified = Object.values(dictionary.SPELLS).map((spell) =>
      findReferenceKey(spell.eng_name)
    );
    expect(ratified).toContain(references[0].key);
  });

  it("віддає ключ істоти, яким вона шукається в маніфесті бестіарію", () => {
    const { text, references } = decomposeMarkup("Кличе {@creature Goblin|MM}.");

    expect(text).toBe("Кличе Goblin.");
    expect(references[0]).toEqual({
      kind: "creature",
      nameEng: "Goblin",
      source: "MM",
      key: "goblin",
    });

    const known = importManifest.map((row) => findReferenceKey(row.nameEng));
    expect(known).toContain(references[0].key);
  });

  it("бере джерело тега за замовчуванням, коли його не написали явно", () => {
    const { references } = decomposeMarkup("{@creature goblin} і {@item longsword}");

    expect(references.map((reference) => reference.source)).toEqual(["MM", "DMG"]);
  });

  it("знімає 5etools-уточнення в дужках із ключа, лишаючи текст показу", () => {
    const { text, references } = decomposeMarkup(
      "у {@variantrule Emanation [Area of Effect]|XPHB|Emanation} на 5 футів"
    );

    expect(text).toBe("у Emanation на 5 футів");
    expect(references[0]).toEqual({
      kind: "variantrule",
      nameEng: "Emanation [Area of Effect]",
      source: "XPHB",
      key: "emanation",
    });
  });

  it("розгортає атаку зі спільними позначками без повтору слова", () => {
    expect(decomposeMarkup("{@atk ms,rs}").text).toBe("Melee or Ranged Spell Attack:");
    expect(decomposeMarkup("{@atkr m,r}").text).toBe("Melee or Ranged Attack Roll:");
    expect(decomposeMarkup("{@atk mw}").text).toBe("Melee Weapon Attack:");
  });

  it("рахує перезарядку діапазоном, а порожню — шісткою", () => {
    expect(decomposeMarkup("{@recharge 5}").text).toBe("(Recharge 5–6)");
    expect(decomposeMarkup("{@recharge}").text).toBe("(Recharge 6)");
  });

  it("ставить знак модифікатора, зокрема відʼємного", () => {
    expect(decomposeMarkup("{@hit 4} to hit").text).toBe("+4 to hit");
    expect(decomposeMarkup("{@hit -1} to hit").text).toBe("-1 to hit");
  });

  it("дістає посилання з тега, вкладеного в інший тег", () => {
    const { text, references } = decomposeMarkup(
      "{@note The {@creature Priest|MM} has been used as an example.}"
    );

    expect(text).toBe("The Priest has been used as an example.");
    expect(references).toEqual([
      { kind: "creature", nameEng: "Priest", source: "MM", key: "priest" },
    ]);
  });

  it("відкочується на назву, коли частина показу порожня", () => {
    expect(decomposeMarkup("носить {@item longsword|phb|}").text).toBe("носить longsword");
  });

  it("робить із рядка статблоку читабельний текст", () => {
    const goblin = findCreature("Goblin", "MM");
    const scimitar = collectStringsDeep(goblin.raw).find((text) => text.includes("{@atk mw}"));

    expect(decomposeMarkup(scimitar ?? "").text).toBe(
      "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage."
    );
  });

  it("розкладає кожен рядок кожної фікстури без невідомих тегів", () => {
    const fixtures = [
      "bestiary-slice",
      "items-slice",
      "magicvariants-slice",
      "bastions-slice",
      "spells-slice",
    ];

    const decomposed = fixtures.flatMap((name) =>
      collectStringsDeep(readFixture(name))
        .filter((text) => text.includes("{@"))
        .map((text) => decomposeMarkup(text, name).text)
    );

    expect(decomposed.length).toBeGreaterThan(20);
    expect(decomposed.every((text) => !text.includes("{@"))).toBe(true);
    expect(KNOWN_MARKUP_TAGS).toContain("variantrule");
  });
});

describe("KR16.1 — схеми джерела", () => {
  it("читає істоту з повним статблоком і без нього", () => {
    const goblin = findCreature("Goblin", "MM");

    expect(goblin.page).toBe(166);
    expect(goblin.challengeRating).toBe("1/4");
    expect(goblin.isFullStatblock).toBe(true);
  });

  it("вважає заклинальний статблок 2024 повним, хоча в нього немає CR", () => {
    const summon = findCreature("Animated Object", "XPHB");

    expect(summon.challengeRating).toBeNull();
    expect(summon.isFullStatblock).toBe(true);
  });

  it("бере редакцію за джерелом, а не за назвою", () => {
    expect(findEditionBySource("XGE")).toBe("RULES_2014");
    expect(findEditionBySource("XDMG")).toBe("RULES_2024");
    expect(findCreature("Goblin", "MM").edition).toBe("RULES_2014");
    expect(findCreature("Goblin Warrior", "XMM").edition).toBe("RULES_2024");
  });

  it("розводить дві редакції предмета з однаковою назвою", () => {
    const classic = findItem("Boots of False Tracks", "XGE");
    const modern = findItem("Boots of False Tracks", "XDMG");

    expect(classic.edition).toBe("RULES_2014");
    expect(modern.edition).toBe("RULES_2024");
    expect(classic.page).toBe(136);
    expect(modern.page).toBe(239);
    expect(classic.hasFullText).toBe(true);
  });

  it("читає споруду бастіону з наказами й простором", () => {
    const den = facilities.find((facility) => facility.nameEng === "Amethyst Dragon Den");

    expect(den?.facilityType).toBe("special");
    expect(den?.level).toBe(5);
    expect(den?.space).toEqual(["vast"]);
    expect(den?.orders).toEqual(["empower"]);
    expect(facilities.filter((facility) => facility.facilityType === "basic")).toHaveLength(1);
  });

  it("читає обидві редакції одного заклинання нарізно", () => {
    const classic = spells.find((spell) => spell.source === "PHB");
    const modern = spells.find((spell) => spell.source === "XPHB");

    expect(classic?.edition).toBe("RULES_2014");
    expect(modern?.edition).toBe("RULES_2024");
    expect(collectStringsDeep(modern?.raw).join(" ")).toContain("{@damage 1d10}");
    expect(collectStringsDeep(classic?.raw).join(" ")).toContain("{@damage 1d8}");
  });

  it("падає на записі без джерела замість вигадати його", () => {
    expect(() =>
      readCreaturesFrom({ monster: [{ name: "Безіменний" }] }, "зріз")
    ).toThrow(/поле «source»/);
  });

  it("зводить назви, що різняться лише пробілом", () => {
    expect(findLooseNameKey("Were Bat")).toBe(findLooseNameKey("Werebat"));
  });
});

describe("KR16.1 — замок ревізії", () => {
  it("пінить повний SHA коміту дзеркала, а не гілку", () => {
    expect(MIRROR_REVISION).toMatch(/^[0-9a-f]{40}$/);
    expect(sourceLock.revision).toBe(MIRROR_REVISION);
    expect(sourceLock.repository).toBe(MIRROR_REPOSITORY);
  });

  it("тримає контрольну суму кожного файла корпусу", () => {
    const files = Object.entries(sourceLock.files);

    expect(files.length).toBeGreaterThan(100);
    expect(files.every(([, file]) => /^[0-9a-f]{64}$/.test(file.sha256))).toBe(true);
    expect(files.every(([, file]) => file.bytes > 0)).toBe(true);
  });
});

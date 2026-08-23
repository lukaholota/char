import { describe, it, expect } from "vitest";
import { getAllCreatures, CreatureData } from "@/lib/bestiaryData";
import { buildOmniSearchIndex } from "@/lib/omniSearchData";
import dictionaryFile from "@/lib/refs/dictionary.json";
import {
  LanguageTranslations,
  armorTranslations,
  equipmentCategoryTranslations,
  toolTranslations,
  weaponTranslations,
} from "@/lib/refs/translation";
import { parseChallengeRating } from "../../scripts/aidedd/statblock-fields";
import manifest from "../../data/aidedd/import-manifest.json";
import batchOne from "../../data/aidedd/translations/monsters-2024/batch-01.json";
import batchTwo from "../../data/aidedd/translations/monsters-2024/batch-02.json";
import batchThree from "../../data/aidedd/translations/monsters-2024/batch-03.json";
import batchFour from "../../data/aidedd/translations/monsters-2024/batch-04.json";
import batchFive from "../../data/aidedd/translations/monsters-2024/batch-05.json";
import batchSix from "../../data/aidedd/translations/monsters-2024/batch-06.json";
import batchSeven from "../../data/aidedd/translations/monsters-2024/batch-07.json";
import batchEight from "../../data/aidedd/translations/monsters-2024/batch-08.json";
import batchNine from "../../data/aidedd/translations/monsters-2024/batch-09.json";
import batchTen from "../../data/aidedd/translations/monsters-2024/batch-10.json";
import batchEleven from "../../data/aidedd/translations/monsters-2024/batch-11.json";
import batchTwelve from "../../data/aidedd/translations/monsters-2024/batch-12.json";
import batchThirteen from "../../data/aidedd/translations/monsters-2024/batch-13.json";
import batchFourteen from "../../data/aidedd/translations/monsters-2024/batch-14.json";
import batchFifteen from "../../data/aidedd/translations/monsters-2024/batch-15.json";
import batchSixteen from "../../data/aidedd/translations/monsters-2024/batch-16.json";
import batchSeventeen from "../../data/aidedd/translations/monsters-2024/batch-17.json";

const DICTIONARY = dictionaryFile.DND_DICTIONARY;
const BATCH_SIZE = 30;
const FIRST_IMPORT_ID = 20024;
const SECOND_BATCH_FIRST_ID = 20054;
const THIRD_BATCH_FIRST_ID = 20084;
const FOURTH_BATCH_FIRST_ID = 20114;
const FIFTH_BATCH_FIRST_ID = 20144;
const SIXTH_BATCH_FIRST_ID = 20174;
const SEVENTH_BATCH_FIRST_ID = 20204;
const EIGHTH_BATCH_FIRST_ID = 20234;
const NINTH_BATCH_FIRST_ID = 20264;
const TENTH_BATCH_FIRST_ID = 20294;
const ELEVENTH_BATCH_FIRST_ID = 20324;
const TWELFTH_BATCH_FIRST_ID = 20354;
const THIRTEENTH_BATCH_FIRST_ID = 20384;
const FOURTEENTH_BATCH_FIRST_ID = 20414;
const FIFTEENTH_BATCH_FIRST_ID = 20444;
const SIXTEENTH_BATCH_FIRST_ID = 20474;
const SEVENTEENTH_BATCH_FIRST_ID = 20504;
const SEVENTEENTH_BATCH_SIZE = 28;
const TRANSLATED_CREATURE_COUNT = 491;

/// aidedd genuinely lists this creature's Traits/Actions by name only, with no mechanical text
/// anywhere on the page (verified against the raw cached HTML) — the same terse cross-reference
/// format used by the three other *-of-lolth pages, none of which are in this batch. Inventing
/// numbers would break "aidedd — єдине джерело імпорту"; the owner chose to defer it rather than
/// fabricate. It stays `status: pending` and out of batch 3's translated count until a real fix
/// (parser support or an owner-approved source) exists.
///
/// bulette-pup (batch 7) has the same defect: its Actions/Bonus actions sections give only bare
/// names ("Bite.", "Leap.") with no mechanical text anywhere on the page. The owner chose the same
/// resolution — defer rather than invent numbers.
///
/// drow-elite-warrior-of-lolth (batch 11) is the fourth *-of-lolth sister and has the identical
/// defect: Traits/Actions/Bonus actions give only bare names, and the trait "Fey Ancestry" and the
/// actions "Multiattack"/"Shortsword"/"Drow Hand Crossbow"/"Underdark Magic" have no mechanical
/// text anywhere in the cached page set (checked all 521 pages) — same resolution, deferred.
///
/// flesh-golem (batch 11) is a different defect class: its Speed field is genuinely blank on the
/// source page (`<strong>Speed</strong> <br>`, verified byte-for-byte against the raw HTML — not a
/// parser bug, the rest of the statblock is complete and correct). The owner chose to defer rather
/// than fill in "30 ft." from memory, since aidedd is the sole import source.
///
/// Batch 13 added four more of the bare-name class, all verified byte-for-byte in the raw HTML:
/// drow-mage-of-lolth and drow-priestess-of-lolth are the fifth and sixth *-of-lolth sisters, and
/// cultist-of-bhaal and primeval-owlbear share the identical defect without being drow at all
/// ("Blood-Soaked Resolve." / "Magic Resistance." / "Multiattack." and so on, with no mechanical
/// text). A sweep of all 521 cached pages found full text for the generic traits only
/// (Sunlight Sensitivity on 13 pages, Magic Resistance on 74), never for the creature-specific
/// actions — so nothing can be restored honestly, same resolution as the four above.
///
/// Batch 14 added cultist-of-bane, the same defect class again (verified byte-for-byte: Traits/
/// Actions/Reactions give only bare names — "Determined Survivor.", "Gauntlet.", "Oppressive
/// Burst.", "Spellcasting.", "Counterattack." — with no mechanical text anywhere on the 4.8 KB
/// page). None of its action names have full text on any other cached page; the one page with a
/// "Counterattack" match (warrior-commander) is a different creature with different numbers, not
/// a legitimate source. Batch 13's full-cache sweep had already identified this page (and four
/// others still pending: animal-lord, beholder, blob-of-annihilation, cultist-of-myrkul,
/// elemental-cataclysm) as carrying the same defect.
///
/// Batch 15 added cultist-of-myrkul, the fifth of those five pending pages, same defect class:
/// Traits/Actions give only bare names ("Nearer to the Dead.", "Multiattack.", "Necrotic Burst.",
/// "Spellcasting.") with no mechanical text anywhere on the page. A cache-wide search found one
/// page mentioning "Necrotic Burst" by name (demilich), but its numbers ("+11", "24 (7d6)") are a
/// different creature's stat block, not a legitimate source — same class of false match as
/// batch 14's "Counterattack"/warrior-commander case. The remaining four pending pages from
/// batch 13's sweep (animal-lord, beholder, blob-of-annihilation, elemental-cataclysm) were not
/// in batch 15's ID range and stay pending.
///
/// Batch 16 added beholder, the last of the four remaining pages from batch 13's sweep (the other
/// three — animal-lord, blob-of-annihilation, elemental-cataclysm — were not in batch 16's ID
/// range and stay pending). Verified byte-for-byte: Actions/Bonus actions/Legendary actions give
/// only bare names ("Multiattack.", "Bite.", "Eye Rays.", "Antimagic Cone.", "Chomp.", "Glare.")
/// with no mechanical text anywhere on the page. "Antimagic Cone", "Chomp" and "Glare" appear on no
/// other cached page; "Eye Rays" also appears on death-tyrant (this same batch), but death-tyrant's
/// Eye Rays has its own DC and damage numbers for an unrelated creature — a false match, same class
/// as batch 15's demilich/"Necrotic Burst" case, not a legitimate source for beholder's numbers.
///
/// Batch 17 closed the "bare action name" list batch 13 predicted: animal-lord, elemental-cataclysm
/// and blob-of-annihilation were the three pages still pending from that sweep, all three landed in
/// batch 17's ID range, and all three verified byte-for-byte as the same defect (Traits/Actions/
/// Legendary actions give only names — "Animal Lordship.", "Rend.", "Feral Strike.", "Earth Glide.",
/// "Cataclysmic Event.", "Astral Implosion.", "Decay." and so on — with no mechanical text anywhere
/// on any of the three pages). A full-cache sweep of all 521 pages found no legitimate source for
/// any of the names; the only "matches" were the next bare name on the same defective page (e.g.
/// "Legendary Resistance." picking up "Multiattack." as its "text") — the same false-match class as
/// every prior page in this set. This closes the batch 13 prediction exactly: DEFERRED_SLUGS grows
/// from eleven to seventeen (these three plus the three below), and the aidedd-only ceiling of
/// 484/498 is now fully realized — no more pages of this defect class remain in the cache.
///
/// Batch 17 also found a second, different defect class: animated-object, giant-insect and
/// ranimated-companion (IDs 20529–20531) are not ordinary monsters but 2024 spell-summon templates
/// (statblocks for creatures conjured by Animate Objects/Giant Insect/Reanimate) — the only
/// creatures of this shape in the entire 521-page cache. Their AC/HP are formulas keyed to the
/// caster's spell level ("AC 11 + the spell's level", "HP 30 + 10 for each spell level above 4*"),
/// and — the actual blocker — all three give Challenge Rating as "None (XP 0; PB equals your
/// Proficiency Bonus)", a format none of `parseChallengeRating`'s four regexes recognize. The whole
/// raw string leaks unparsed into `challenge`, `xp` stays empty, and `formatExperience` in
/// build-creature-record.ts throws at build time as a result. Extending the parser/schema for a
/// caster-relative CR economy is a structural change to the record-building step, not a translation
/// task; the owner chose to defer all three rather than change parser/build-creature-record.ts this
/// session — tracked as a tail for the KR12.4 (images) pass, see the batch 17 journal entry.
const DEFERRED_SLUGS = new Set([
  "drow-of-lolth",
  "bulette-pup",
  "drow-elite-warrior-of-lolth",
  "flesh-golem",
  "cultist-of-bhaal",
  "drow-mage-of-lolth",
  "primeval-owlbear",
  "drow-priestess-of-lolth",
  "cultist-of-bane",
  "cultist-of-myrkul",
  "beholder",
  "animal-lord",
  "elemental-cataclysm",
  "blob-of-annihilation",
  "animated-object",
  "giant-insect",
  "ranimated-companion",
]);

/// aidedd genuinely has no lore paragraph for these — verified against the raw cached HTML
/// (empty `<div class='description'></div>`), not a parser gap. Listing them by name keeps the
/// test able to catch a *real* regression (any other creature losing its description) instead of
/// just weakening the check globally.
const EMPTY_DESCRIPTION_NAMES = new Set([
  "Vulture",
  "Weasel",
  "Blood Hawk",
  "Camel",
  "Flumph",
  "Flying Snake",
  "Giant Crab",
  "Giant Rat",
  "Giant Weasel",
  "Mastiff",
  "Mule",
  "Pony",
  "Venomous Snake",
  "Boar",
  "Constrictor Snake",
  "Draft Horse",
  "Elk",
  "Giant Badger",
  "Giant Bat",
  "Giant Centipede",
  "Giant Frog",
  "Giant Lizard",
  "Giant Owl",
  "Giant Venomous Snake",
  "Giant Wolf Spider",
  "Grimlock",
  "Kenku",
  "Panther",
  "Pteranodon",
  "Riding Horse",
  "Swarm of Bats",
  "Swarm of Rats",
  "Swarm of Ravens",
  "Troglodyte",
  "Wolf",
  "Ape",
  "Black Bear",
  "Crocodile",
  "Giant Goat",
  "Giant Seahorse",
  "Giant Wasp",
  "Jackalwere",
  "Magmin",
  "Piercer",
  "Reef Shark",
  "Rust Monster",
  "Swarm of Insects",
  "Troll Limb",
  "Warhorse",
  "Brown Bear",
  "Death Dog",
  "Dire Wolf",
  "Dryad",
  "Giant Eagle",
  "Giant Hyena",
  "Giant Octopus",
  "Giant Spider",
  "Giant Toad",
  "Giant Vulture",
  "Harpy",
  "Hippogriff",
  "Lion",
  "Scarecrow",
  "Specter",
  "Swarm of Piranhas",
  "Tiger",
  "Allosaurus",
  "Ankheg",
  "Ettercap",
  "Giant Boar",
  "Giant Constrictor Snake",
  "Giant Elk",
  "Gibbering Mouther",
  "Griffon",
  "Hunter Shark",
  "Intellect Devourer",
  "Merrow",
  "Ochre Jelly",
  "Pegasus",
  "Peryton",
  "Plesiosaurus",
  "Polar Bear",
  "Poltergeist",
  "Rhinoceros",
  "Saber-Toothed Tiger",
  "Spined Devil",
  "Swarm of Venomous Snakes",
  "Wererat",
  "Will-o'-Wisp",
  "Ankylosaurus",
  "Basilisk",
  "Bearded Devil",
  "Displacer Beast",
  "Giant Scorpion",
  "Grell",
  "Hell Hound",
  "Hook Horror",
  "Killer Whale",
  "Manticore",
  "Minotaur of Baphomet",
  "Nightmare",
  "Phase Spider",
  "Spectator",
  "Water Weird",
  "Werewolf",
  "Wight",
  "Winter Wolf",
  "Archelon",
  "Banshee",
  "Bone Naga",
  "Chuul",
  "Couatl",
  "Elephant",
  "Ettin",
  "Flameskull",
  "Ghost",
  "Helmed Horror",
  "Hippopotamus",
  "Juvenile Shadow Dragon",
  "Lamia",
  "Shadow Demon",
  "Wereboar",
  "Weretiger",
  "Air Elemental",
  "Barbed Devil",
  "Barlgura",
  "Cambion",
  "Earth Elemental",
  "Giant Crocodile",
  "Giant Shark",
  "Gladiator",
  "Hill Giant",
  "Mezzoloth",
  "Otyugh",
  "Roper",
  "Shambling Mound",
  "Triceratops",
  "Troll",
  "Umber Hulk",
  "Unicorn",
  "Water Elemental",
  "Werebear",
  "Xorn",
  "Chasme",
  "Chimera",
  "Drider",
  "Galeb Duhr",
  "Giant Squid",
  "Invisible Stalker",
  "Mammoth",
  "Medusa",
  "Vrock",
  "Wyvern",
  "Giant Ape",
  "Oni",
  "Shield Guardian",
  "Stone Giant",
  "Chain Devil",
  "Cloaker",
  "Fomorian",
  "Frost Giant",
  "Hezrou",
  "Hydra",
  "Spirit Naga",
  "Tyrannosaurus Rex",
  "Bone Devil",
  "Clay Golem",
  "Cloud Giant",
  "Fire Giant",
  "Glabrezu",
  "Nycaloth",
  "Treant",
  "Aboleth",
  "Deva",
  "Dire Worg",
  "Guardian Naga",
  "Yochlol",
  "Behir",
  "Dao",
  "Djinni",
  "Efreeti",
  "Horned Devil",
  "Marid",
  "Roc",
  "Arcanaloth",
  "Erinyes",
  "Nalfeshnee",
  "Rakshasa",
  "Shadow Dragon",
  "Storm Giant",
  "Ultroloth",
  "Death Tyrant",
  "Ice Devil",
  "Purple Worm",
  "Iron Golem",
  "Marilith",
  "Planetar",
  "Dracolich",
  "Dragon Turtle",
  "Goristro",
  "Balor",
  "Pit Fiend",
  "Solar",
  "Kraken",
  "Colossus",
  "Tarrasque",
]);

const imported = (): CreatureData[] =>
  getAllCreatures("RULES_2024").filter((creature) => creature.creatureId >= FIRST_IMPORT_ID);

/// KR12.3 added RULES_2014 rows to the same manifest file — every check in this describe block is
/// about the 2024 import queue specifically, so it reads this 2024-only view, never `manifest` raw.
const manifest2024 = manifest.filter((row) => row.edition === "RULES_2024");
const readBatchRows = (batch: number) => manifest2024.filter((row) => row.batch === batch);

describe("KR12.2 — маніфест партій імпорту 2024", () => {
  it("тримає рядок на кожну з 521 істоти 2024 і не перетинає ID із наявним каталогом", () => {
    expect(manifest2024.length).toBe(521);
    expect(new Set(manifest2024.map((row) => row.slug)).size).toBe(manifest2024.length);
    expect(new Set(manifest2024.map((row) => row.creatureId)).size).toBe(manifest2024.length);
    expect(manifest2024.every((row) => row.edition === "RULES_2024")).toBe(true);

    const ids2014 = new Set(getAllCreatures("RULES_2014").map((creature) => creature.creatureId));
    for (const row of manifest2024) {
      expect(ids2014.has(row.creatureId)).toBe(false);
    }
  });

  it("веде партію рівно на 30 істот і сортує чергу за ПС від низького", () => {
    const first = readBatchRows(1);
    expect(first.length).toBe(BATCH_SIZE);
    expect(first.every((row) => row.status === "translated")).toBe(true);
    expect(first.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => FIRST_IMPORT_ID + index)
    );

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of first) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.challenge).toBe("0");
    }
  });

  it("веде партію 2 рівно на 30 істот, ID 20054–20083, і лишає партію 3 в черзі", () => {
    const second = readBatchRows(2);
    expect(second.length).toBe(BATCH_SIZE);
    expect(second.every((row) => row.status === "translated")).toBe(true);
    expect(second.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => SECOND_BATCH_FIRST_ID + index)
    );

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of second) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
    }

    expect(readBatchRows(3).length).toBe(BATCH_SIZE);
  });

  it("веде партію 3 на ID 20084–20113, з drow-of-lolth відкладеним, а не перекладеним", () => {
    const third = readBatchRows(3);
    expect(third.length).toBe(BATCH_SIZE);
    expect(third.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => THIRD_BATCH_FIRST_ID + index)
    );

    const deferred = third.filter((row) => DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(1);
    expect(deferred.every((row) => row.status === "pending")).toBe(true);

    const translated = third.filter((row) => !DEFERRED_SLUGS.has(row.slug));
    expect(translated.every((row) => row.status === "translated")).toBe(true);

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of translated) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
    }
    for (const row of deferred) {
      expect(catalogued.has(row.creatureId)).toBe(false);
    }

    expect(readBatchRows(4).length).toBe(BATCH_SIZE);
  });

  it("веде партію 4 на ID 20114–20143, усі 30 перекладені", () => {
    const fourth = readBatchRows(4);
    expect(fourth.length).toBe(BATCH_SIZE);
    expect(fourth.every((row) => row.status === "translated")).toBe(true);
    expect(fourth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => FOURTH_BATCH_FIRST_ID + index)
    );

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of fourth) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
    }
  });

  it("веде партію 5 на ID 20144–20173, усі 30 перекладені", () => {
    const fifth = readBatchRows(5);
    expect(fifth.length).toBe(BATCH_SIZE);
    expect(fifth.every((row) => row.status === "translated")).toBe(true);
    expect(fifth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => FIFTH_BATCH_FIRST_ID + index)
    );

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of fifth) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
    }
  });

  it("веде партію 6 на ID 20174–20203, усі 30 перекладені", () => {
    const sixth = readBatchRows(6);
    expect(sixth.length).toBe(BATCH_SIZE);
    expect(sixth.every((row) => row.status === "translated")).toBe(true);
    expect(sixth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => SIXTH_BATCH_FIRST_ID + index)
    );

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of sixth) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
    }
  });

  it("веде партію 7 на ID 20204–20233, з bulette-pup відкладеним, а не перекладеним, і лишає партію 8 в черзі", () => {
    const seventh = readBatchRows(7);
    expect(seventh.length).toBe(BATCH_SIZE);
    expect(seventh.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => SEVENTH_BATCH_FIRST_ID + index)
    );

    const deferred = seventh.filter((row) => DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(1);
    expect(deferred.every((row) => row.status === "pending")).toBe(true);

    const translated = seventh.filter((row) => !DEFERRED_SLUGS.has(row.slug));
    expect(translated.every((row) => row.status === "translated")).toBe(true);

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of translated) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
    }
    for (const row of deferred) {
      expect(catalogued.has(row.creatureId)).toBe(false);
    }

    expect(readBatchRows(8).length).toBe(BATCH_SIZE);
  });

  it("веде партію 8 на ID 20234–20263, усі 30 перекладені, і лишає партію 9 в черзі", () => {
    const eighth = readBatchRows(8);
    expect(eighth.length).toBe(BATCH_SIZE);
    expect(eighth.every((row) => row.status === "translated")).toBe(true);
    expect(eighth.filter((row) => DEFERRED_SLUGS.has(row.slug)).length).toBe(0);
    expect(eighth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => EIGHTH_BATCH_FIRST_ID + index)
    );

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of eighth) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }

    expect(readBatchRows(9).length).toBe(BATCH_SIZE);
  });

  it("веде партію 9 на ID 20264–20293, усі 30 перекладені, і лишає партію 10 в черзі", () => {
    const ninth = readBatchRows(9);
    expect(ninth.length).toBe(BATCH_SIZE);
    expect(ninth.every((row) => row.status === "translated")).toBe(true);
    expect(ninth.filter((row) => DEFERRED_SLUGS.has(row.slug)).length).toBe(0);
    expect(ninth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => NINTH_BATCH_FIRST_ID + index)
    );

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of ninth) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }

    expect(readBatchRows(10).length).toBe(BATCH_SIZE);
  });

  it("веде партію 10 на ID 20294–20323, усі 30 перекладені, і лишає партію 11 в черзі", () => {
    const tenth = readBatchRows(10);
    expect(tenth.length).toBe(BATCH_SIZE);
    expect(tenth.every((row) => row.status === "translated")).toBe(true);
    expect(tenth.filter((row) => DEFERRED_SLUGS.has(row.slug)).length).toBe(0);
    expect(tenth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => TENTH_BATCH_FIRST_ID + index)
    );

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of tenth) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }

    expect(readBatchRows(11).length).toBe(BATCH_SIZE);
  });

  it("веде партію 11 на ID 20324–20353, з drow-elite-warrior-of-lolth і flesh-golem відкладеними, а не перекладеними, і лишає партію 12 в черзі", () => {
    const eleventh = readBatchRows(11);
    expect(eleventh.length).toBe(BATCH_SIZE);
    expect(eleventh.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => ELEVENTH_BATCH_FIRST_ID + index)
    );

    const deferred = eleventh.filter((row) => DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(2);
    expect(deferred.every((row) => row.status === "pending")).toBe(true);

    const translated = eleventh.filter((row) => !DEFERRED_SLUGS.has(row.slug));
    expect(translated.every((row) => row.status === "translated")).toBe(true);

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of translated) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }
    for (const row of deferred) {
      expect(catalogued.has(row.creatureId)).toBe(false);
    }

    expect(readBatchRows(12).length).toBe(BATCH_SIZE);
  });

  it("веде партію 12 на ID 20354–20383, усі 30 перекладені, і лишає партію 13 в черзі", () => {
    const twelfth = readBatchRows(12);
    expect(twelfth.length).toBe(BATCH_SIZE);
    expect(twelfth.every((row) => row.status === "translated")).toBe(true);
    expect(twelfth.filter((row) => DEFERRED_SLUGS.has(row.slug)).length).toBe(0);
    expect(twelfth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => TWELFTH_BATCH_FIRST_ID + index)
    );

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of twelfth) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }

    expect(readBatchRows(13).length).toBe(BATCH_SIZE);
  });

  it("веде партію 13 на ID 20384–20413, з чотирма відкладеними записами, і лишає партію 14 в черзі", () => {
    const thirteenth = readBatchRows(13);
    expect(thirteenth.length).toBe(BATCH_SIZE);
    expect(thirteenth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => THIRTEENTH_BATCH_FIRST_ID + index)
    );

    const deferred = thirteenth.filter((row) => DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(4);
    expect(deferred.every((row) => row.status === "pending")).toBe(true);

    const translated = thirteenth.filter((row) => !DEFERRED_SLUGS.has(row.slug));
    expect(translated.every((row) => row.status === "translated")).toBe(true);

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of translated) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }
    for (const row of deferred) {
      expect(catalogued.has(row.creatureId)).toBe(false);
    }

    expect(readBatchRows(14).length).toBe(BATCH_SIZE);
  });

  it("веде партію 14 на ID 20414–20443, з cultist-of-bane відкладеним, а не перекладеним, і лишає партію 15 в черзі", () => {
    const fourteenth = readBatchRows(14);
    expect(fourteenth.length).toBe(BATCH_SIZE);
    expect(fourteenth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => FOURTEENTH_BATCH_FIRST_ID + index)
    );

    const deferred = fourteenth.filter((row) => DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(1);
    expect(deferred.every((row) => row.status === "pending")).toBe(true);

    const translated = fourteenth.filter((row) => !DEFERRED_SLUGS.has(row.slug));
    expect(translated.every((row) => row.status === "translated")).toBe(true);

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of translated) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }
    for (const row of deferred) {
      expect(catalogued.has(row.creatureId)).toBe(false);
    }

    expect(readBatchRows(15).length).toBe(BATCH_SIZE);
  });

  it("веде партію 15 на ID 20444–20473, з cultist-of-myrkul відкладеним, а не перекладеним, і лишає партію 16 в черзі", () => {
    const fifteenth = readBatchRows(15);
    expect(fifteenth.length).toBe(BATCH_SIZE);
    expect(fifteenth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => FIFTEENTH_BATCH_FIRST_ID + index)
    );

    const deferred = fifteenth.filter((row) => DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(1);
    expect(deferred.every((row) => row.status === "pending")).toBe(true);

    const translated = fifteenth.filter((row) => !DEFERRED_SLUGS.has(row.slug));
    expect(translated.every((row) => row.status === "translated")).toBe(true);

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of translated) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }
    for (const row of deferred) {
      expect(catalogued.has(row.creatureId)).toBe(false);
    }

    expect(readBatchRows(16).length).toBe(BATCH_SIZE);
  });

  it("веде партію 16 на ID 20474–20503, з beholder відкладеним, а не перекладеним, і лишає партію 17 на 28 істот у черзі", () => {
    const sixteenth = readBatchRows(16);
    expect(sixteenth.length).toBe(BATCH_SIZE);
    expect(sixteenth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: BATCH_SIZE }, (_, index) => SIXTEENTH_BATCH_FIRST_ID + index)
    );

    const deferred = sixteenth.filter((row) => DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(1);
    expect(deferred.every((row) => row.status === "pending")).toBe(true);

    const translated = sixteenth.filter((row) => !DEFERRED_SLUGS.has(row.slug));
    expect(translated.every((row) => row.status === "translated")).toBe(true);

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of translated) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }
    for (const row of deferred) {
      expect(catalogued.has(row.creatureId)).toBe(false);
    }

    expect(readBatchRows(17).length).toBe(SEVENTEENTH_BATCH_SIZE);
  });

  it("веде партію 17 на ID 20504–20531, з шістьма відкладеними записами, і закриває чергу партій", () => {
    const seventeenth = readBatchRows(17);
    expect(seventeenth.length).toBe(SEVENTEENTH_BATCH_SIZE);
    expect(seventeenth.map((row) => row.creatureId)).toEqual(
      Array.from({ length: SEVENTEENTH_BATCH_SIZE }, (_, index) => SEVENTEENTH_BATCH_FIRST_ID + index)
    );

    const deferred = seventeenth.filter((row) => DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(6);
    expect(deferred.every((row) => row.status === "pending")).toBe(true);

    const translated = seventeenth.filter((row) => !DEFERRED_SLUGS.has(row.slug));
    expect(translated.every((row) => row.status === "translated")).toBe(true);

    const catalogued = new Map(imported().map((creature) => [creature.creatureId, creature]));
    for (const row of translated) {
      expect(catalogued.get(row.creatureId)?.nameEng).toBe(row.nameEng);
      expect(catalogued.get(row.creatureId)?.ruleset).toBe("RULES_2024");
    }
    for (const row of deferred) {
      expect(catalogued.has(row.creatureId)).toBe(false);
    }

    // Batch 17 is the last batch — the import queue closes here, not at a batch 18.
    expect(manifest2024.every((row) => row.batch <= 17)).toBe(true);
  });

  it("виводить 13 істот, які каталог мав до імпорту, з черги партій", () => {
    const existing = manifest2024.filter((row) => row.status === "existing");
    expect(existing.length).toBe(13);
    expect(existing.every((row) => row.batch === 0)).toBe(true);
    expect(existing.every((row) => row.creatureId < FIRST_IMPORT_ID)).toBe(true);
  });
});

describe("KR12.2 — записи перекладених партій", () => {
  it("імпортує всі перекладені партії і позначає їх правилами 2024", () => {
    expect(imported().length).toBe(TRANSLATED_CREATURE_COUNT);
    expect(batchOne.length).toBe(BATCH_SIZE);
    expect(batchTwo.length).toBe(BATCH_SIZE);
    expect(batchThree.length).toBe(BATCH_SIZE - 1);
    expect(batchFour.length).toBe(BATCH_SIZE);
    expect(batchFive.length).toBe(BATCH_SIZE);
    expect(batchSix.length).toBe(BATCH_SIZE);
    expect(batchSeven.length).toBe(BATCH_SIZE - 1);
    expect(batchEight.length).toBe(BATCH_SIZE);
    expect(batchNine.length).toBe(BATCH_SIZE);
    expect(batchTen.length).toBe(BATCH_SIZE);
    expect(batchEleven.length).toBe(BATCH_SIZE - 2);
    expect(batchTwelve.length).toBe(BATCH_SIZE);
    expect(batchThirteen.length).toBe(BATCH_SIZE - 4);
    expect(batchFourteen.length).toBe(BATCH_SIZE - 1);
    expect(batchFifteen.length).toBe(BATCH_SIZE - 1);
    expect(batchSixteen.length).toBe(BATCH_SIZE - 1);
    expect(batchSeventeen.length).toBe(SEVENTEENTH_BATCH_SIZE - 6);
    expect(imported().every((creature) => creature.ruleset === "RULES_2024")).toBe(true);
    expect(imported().every((creature) => creature.source === "MM_2024")).toBe(true);
  });

  it("тримає ID і слаги унікальними В МЕЖАХ редакції 2024", () => {
    const list = getAllCreatures("RULES_2024");
    expect(new Set(list.map((creature) => creature.creatureId)).size).toBe(list.length);
    expect(new Set(list.map((creature) => creature.nameEng.toLowerCase())).size).toBe(list.length);
    expect(new Set(list.map((creature) => creature.name)).size).toBe(list.length);
  });

  it("дає кожній істоті українську назву, опис і дії", () => {
    for (const creature of imported()) {
      expect(creature.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature.name).not.toMatch(/[a-zA-Z]/);
      if (EMPTY_DESCRIPTION_NAMES.has(creature.nameEng)) {
        expect(creature.description).toBe("");
      } else {
        expect(creature.description).toMatch(/[Ѐ-ӿ]/);
      }
      expect(creature.senses).toMatch(/[Ѐ-ӿ]/);
      expect(creature.xp).toMatch(/^\d+ XP$/);
      expect(creature.proficiencyBonus).toMatch(/^\+\d+$/);
      expect(creature.initiative).toMatch(/^[+-]\d+ \(\d+\)$/);

      const sections = [
        creature.specialAbilities,
        creature.actions,
        creature.bonusActions ?? "",
        creature.reactions,
      ].join("");
      expect(sections).toMatch(/[Ѐ-ӿ]/);
      expect(sections).toMatch(/^(<p><b>[^<]+\.<\/b> [^<]+<\/p>)+$/);
    }
  });

  it("не лишає англійського тексту поза назвами заклинань у дужках", () => {
    for (const creature of imported()) {
      const ukrainianFields = [
        creature.name,
        creature.size,
        creature.type,
        creature.alignment,
        creature.speed,
        creature.senses,
        creature.languages,
        creature.skills,
        creature.gear ?? "",
        creature.damageImmunity,
        creature.damageResistance,
        creature.damageVulnerability ?? "",
        creature.conditionImmunity,
        creature.specialAbilities,
        creature.actions,
        creature.reactions,
        creature.description,
      ].join(" ");

      const withoutMarkupAndOriginals = ukrainianFields
        .replace(/<[^>]*>/g, "")
        .replace(/\[[^\]]*\]/g, "");
      expect(withoutMarkupAndOriginals).not.toMatch(/[a-zA-Z]/);
    }
  });
});

describe("KR12.2 — терміни лише із затвердженого реєстру", () => {
  const findApprovedValues = (map: Record<string, string>) => Object.values(map);

  const readPrimaryVariant = (term: string) =>
    term.split(" або ")[0].replace(/\s*\(.*\)$/, "").trim();

  it("бере розміри, типи, теги і світогляди зі словника", () => {
    const sizes = findApprovedValues(DICTIONARY.creatureSizes);
    const types = findApprovedValues(DICTIONARY.creatureTypes);
    const tags = findApprovedValues(DICTIONARY.creatureTypeTags);
    const alignments = findApprovedValues(DICTIONARY.alignments);

    for (const creature of imported()) {
      for (const size of creature.size.split(" або ")) {
        expect(sizes).toContain(size);
      }

      const type = /^([^(]+?)(?:\s*\(([^)]*)\))?$/.exec(creature.type);
      for (const base of type?.[1]?.split(" або ") ?? []) {
        expect(types).toContain(base);
      }
      for (const tag of type?.[2]?.split(", ") ?? []) {
        expect(tags).toContain(tag);
      }

      expect(alignments).toContain(creature.alignment);
    }
  });

  it("бере типи ушкоджень, стани і навички зі словника", () => {
    const damageTypes = findApprovedValues(DICTIONARY.damageTypes).map(readPrimaryVariant);
    const conditions = findApprovedValues(DICTIONARY.conditions);
    const skills = findApprovedValues(DICTIONARY.skills);

    for (const creature of imported()) {
      for (const term of splitTerms(creature.damageImmunity)) expect(damageTypes).toContain(term);

      // damageVulnerability got a 7th TranslatedFields slot in batch 16 for rakshasa's conditional
      // "Piercing damage from weapons wielded by creatures under the effect of a Bless spell" — a
      // prose cross-reference to a spell, not a flat type list, and the sole creature across all
      // 521 cached pages with this shape. Same class of manual bypass as damageResistance's
      // "Див. рису" case below.
      if (!/Благословення/.test(creature.damageVulnerability ?? "")) {
        for (const term of splitTerms(creature.damageVulnerability ?? "")) {
          expect(damageTypes).toContain(term);
        }
      }

      // damageResistance got a fields override in batch 10 (juvenile-shadow-dragon's "See Living
      // Shadow", a cross-reference to a trait rather than a flat damage-type list) — the same class
      // of manual bypass conditionImmunity/skills already have. A hand-written "Див. рису «X»"
      // cross-reference is allowed instead of a dictionary term for that one creature; every other
      // creature's damageResistance still must resolve to approved terms.
      for (const term of splitTerms(creature.damageResistance)) {
        if (/^Див\. рису/.test(term)) continue;
        expect(damageTypes).toContain(term);
      }

      // conditionImmunity got a fields override in batch 9 (vampire-familiar's "Charmed (except
      // from its vampire master)"), the same class of manual bypass gear/senses/speed already had —
      // the base condition still must come from the dictionary, but a parenthetical qualifier
      // written by hand is allowed, same as gear's "(count)" suffix below.
      for (const term of splitTerms(creature.conditionImmunity)) {
        expect(conditions).toContain(term.replace(/\s*\(.*\)$/, "").trim());
      }

      // skills got a fields override in batch 9 (yuan-ti-malison's "Stealth +4 (+6 while in snake
      // form)"), the same class of manual bypass as conditionImmunity above — strip the hand-written
      // parenthetical qualifier before checking the base skill name against the dictionary.
      for (const term of splitTerms(creature.skills)) {
        expect(skills).toContain(
          term
            .replace(/\s*\(.*\)$/, "")
            .replace(/\s*[+-]\d+$/, "")
            .trim()
        );
      }
    }
  });

  it("бере режими руху, чуття, мови і спорядження зі словника", () => {
    const movement = findApprovedValues(DICTIONARY.rules2024.movementModes).map((mode) =>
      mode.toLocaleLowerCase("uk")
    );
    const senses = [
      ...findApprovedValues(DICTIONARY.environments),
      ...findApprovedValues(DICTIONARY.rules2024.sensesTerms),
    ];
    const languages = [
      ...findApprovedValues(LanguageTranslations),
      ...findApprovedValues(DICTIONARY.rules2024.languageFormats),
    ];
    // findEquipmentTerm in the converter only checks the three maps above; "Component Pouch"
    // (mage-apprentice, batch 7) lives in equipmentCategoryTranslations instead, so it went
    // through the same manual fields.gear bypass as fields.languages/fields.speed elsewhere.
    // "Wand" (mage, bandit-deceiver — batch 12) is the same structural gap: findEquipmentTerm
    // never checks DICTIONARY.magicItemTypes, so it went through the same fields.gear bypass
    // using that map's already-approved "wand" → "Паличка".
    const gear = [
      ...findApprovedValues(weaponTranslations),
      ...findApprovedValues(armorTranslations),
      ...findApprovedValues(toolTranslations),
      ...findApprovedValues(equipmentCategoryTranslations),
      ...findApprovedValues(DICTIONARY.magicItemTypes),
    ];

    for (const creature of imported()) {
      for (const segment of splitTerms(creature.speed)) {
        const mode = /^([^\d]+?)\s+\d/.exec(segment);
        if (mode) {
          for (const single of mode[1].split(" або ")) expect(movement).toContain(single);
        }
      }

      for (const segment of splitTerms(creature.senses)) {
        expect(senses).toContain(segment.replace(/\s+[\d—].*$/, "").trim());
      }

      for (const item of splitTerms(creature.gear ?? "")) {
        expect(gear).toContain(item.replace(/\s*\(\d+\)$/, ""));
      }

      if (creature.languages !== "—") {
        const [firstClause] = creature.languages.split(";");
        if (!firstClause.trim().startsWith("Розуміє")) {
          for (const language of splitTopLevelTerms(firstClause)) {
            const dialectGroup = /^Первинна \(([^)]+)\)$/.exec(language.trim());
            if (dialectGroup) {
              for (const dialect of splitTerms(dialectGroup[1])) expect(languages).toContain(dialect);
              continue;
            }
            expect(languages).toContain(language.replace(/\s+\d.*$/, "").trim());
          }
        }
      }
    }
  });
});

describe("KR12.2 — позначка редакції у видачі бестіарію", () => {
  it("підписує істот у Cmd+K редакцією, а решту категорій — ні", () => {
    const creatures2024 = buildOmniSearchIndex("RULES_2024").filter(
      (item) => item.category === "bestiary"
    );
    const creatures2014 = buildOmniSearchIndex("RULES_2014").filter(
      (item) => item.category === "bestiary"
    );

    expect(creatures2024.length).toBeGreaterThanOrEqual(53);
    expect(creatures2024.every((item) => item.edition === "2024")).toBe(true);
    expect(creatures2014.every((item) => item.edition === "2014")).toBe(true);

    const spells = buildOmniSearchIndex("RULES_2024").filter((item) => item.category === "spells");
    expect(spells.every((item) => item.edition === undefined)).toBe(true);
  });

  it("показує однойменних істот обох редакцій як два різні записи", () => {
    const findBadger = (ruleset: "RULES_2014" | "RULES_2024") =>
      buildOmniSearchIndex(ruleset).find(
        (item) => item.category === "bestiary" && item.subtitle === "Badger"
      );

    const badger2014 = findBadger("RULES_2014");
    const badger2024 = findBadger("RULES_2024");

    expect(badger2014?.edition).toBe("2014");
    expect(badger2024?.edition).toBe("2024");
    expect(badger2014?.href).toBe("/bestiary/badger");
    expect(badger2024?.href).toBe("/2024/bestiary/badger");
    expect(badger2014?.id).not.toBe(badger2024?.id);
  });
});

describe("KR12.2 — розбір рядка ПС", () => {
  it("читає БМ, коли джерело не подає очок досвіду", () => {
    expect(parseChallengeRating("0 (PB +2)", "RULES_2024")).toEqual({
      challenge: "0",
      xp: "",
      xpInLair: "",
      proficiencyBonus: "+2",
    });
  });

  it("нормалізує коротке тире в мінус", () => {
    expect(parseChallengeRating("2 (XP 450; PB –2)", "RULES_2024").proficiencyBonus).toBe("-2");
  });
});

function splitTerms(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "" && part !== "—");
}

/// Same as splitTerms but keeps a "Первинна (X, Y)" multi-dialect group intact — a naive comma
/// split cuts it into two unmatched fragments, as found while writing batch 3 (mud-mephit /
/// smoke-mephit speak two Primordial dialects at once).
function splitTopLevelTerms(value: string): string[] {
  const terms: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      terms.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  terms.push(current.trim());

  return terms.filter((term) => term !== "" && term !== "—");
}

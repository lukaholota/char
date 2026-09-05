import { describe, expect, it } from "vitest";
import creatures2014 from "../../src/lib/generated/creatures.json";
import creatures2024 from "../../src/lib/generated/creatures2024.json";
import dictionaryFile from "../../src/lib/refs/dictionary.json";
import { ParsedCreature } from "../../scripts/aidedd/creature-schema";
import { GeneratedCreature } from "../../scripts/generate-creatures";
import {
  BatchRow,
  buildImportedCreaturesFrom5etools,
  findPinnedStatblock,
  readBatchPlan,
  readBatchTranslations,
} from "../../scripts/5etools/creature-batches";
import { buildMarkedName, splitNameTail } from "../../scripts/terms/section-name-markers";
import {
  findExperienceByChallenge,
  findProficiencyBonusByChallenge,
  findSourceKeyByBookCode,
} from "../../scripts/5etools/creature-statblock";
import { findLooseNameKey, readCreatures } from "../../scripts/5etools/schema";
import { readSourceStatblock } from "../../scripts/5etools/creature-statblock";
import { stripGlossaryMarkers } from "../../src/lib/refs/glossary-marker";

const EXPECTED_BATCH_1 = [
  "Fox",
  "Hare",
  "Knucklehead Trout",
  "Seal",
  "Hoard Scarab",
  "Monodrone",
  "Mountain Goat",
  "Young Kruthik",
  "Deep Rothé",
  "Duodrone",
  "Gnoll Witherling",
  "Kender Skirmisher",
  "Night Blade",
  "Oblex Spawn",
  "Ox",
  "Star Spawn Grue",
  "Tabaxi Minstrel",
  "Walrus",
  "Wretched Sorrowsworn",
  "Yellow Musk Zombie",
];

const EXPECTED_BATCH_2 = [
  "Baaz Draconian",
  "Draconian Foot Soldier",
  "Fist of Bane",
  "Giant Lynx",
  "Necromite of Myrkul",
  "Sage",
  "Stench Kow",
  "Swarm of Rot Grubs",
  "Tridrone",
  "Bag Jelly",
  "Deep Dragon Wyrmling",
  "Duergar Soulblade",
  "Giant Ram",
  "Gnoll Flesh Gnawer",
  "Grinning Cat",
  "Maw Demon",
  "Meazel",
  "Quadrone",
  "Sea Spawn",
  "Skull Lasher of Myrkul",
];

const EXPECTED_BATCH_3 = [
  "Stone Cursed",
  "Tabaxi Hunter",
  "Thorny Vegepygmy",
  "Xvart Warlock of Raxivort",
  "Adult Kruthik",
  "Aurochs",
  "Berbalang",
  "Bozak Draconian",
  "Crystal Dragon Wyrmling",
  "Darkling Elder",
  "Draconian Mage",
  "Dragon Speaker",
  "Dragonnel",
  "Duergar Kavalrachni",
  "Duergar Mind Master",
  "Duergar Stone Guard",
  "Emerald Dragon Wyrmling",
  "Iron Consul",
  "Moonstone Dragon Wyrmling",
  "Ogre Bolt Launcher",
];

/// Назви — як їх подає план, тобто як їх подає маніфест aidedd. Для `Were Bat` корпус пише
/// `Werebat`; зведення нежорстке (див. перевірку [3]), і в каталог їде назва корпусу.
const EXPECTED_BATCH_4 = [
  "Ogre Howdah",
  "Pentadrone",
  "Reaper of Bhaal",
  "Rutterkin",
  "Shadow Mastiff",
  "Topaz Dragon Wyrmling",
  "Uthgardt Shaman",
  "Were Bat",
  "Yellow Musk Creeper",
  "Assassin Vine",
  "Bulezau",
  "Cave Fisher",
  "Choldrith",
  "Deathlock Wight",
  "Deep Scion",
  "Dolphin Delighter",
  "Draconian Infiltrator",
  "Dragon Chosen",
  "Dragonflesh Grafter",
  "Flail Snail",
];

const EXPECTED_BATCH_5 = [
  "Giant Goose",
  "Giant Ox",
  "Goliath Giant-Kin",
  "Kapak Draconian",
  "Mud Hulk",
  "Sapphire Dragon Wyrmling",
  "Shadow Mastiff Alpha",
  "Slithering Tracker",
  "Spotted Lion",
  "Sword Wraith Warrior",
  "Vampiric Mist",
  "Amethyst Dragon Wyrmling",
  "Clockwork Iron Cobra",
  "Draconian Dreadnought",
  "Dragon Turtle Wyrmling",
  "Dybbuk",
  "Firbolg Primeval Warden",
  "Giant Walrus",
  "Hobgoblin Devastator",
  "Master of Souls",
];

const EXPECTED_BATCH_6 = [
  "Ogre Battering Ram",
  "Sivak Draconian",
  "Vellynne Harpell",
  "Yuan-ti Mind Whisperer",
  "Yuan-ti Nightmare Speaker",
  "Adult Oblex",
  "Death's Head of Bhaal",
  "Dragon Blessed",
  "Dragonblood Ooze",
  "Dust Hulk",
  "Firbolg Wanderer",
  "Frost Druid",
  "Gem Stalker",
  "Hellwasp",
  "Kruthik Hive Lord",
  "Master Sage",
  "Mindwitness",
  "Rime Hulk",
  "Spawn of Kyuss",
  "Star Spawn Mangler",
];

const EXPECTED_BATCH_7 = [
  "Swarm of Cranium Rats",
  "Titanothere",
  "Tlincalli",
  "Young Crystal Dragon",
  "Young Deep Dragon",
  "Animated Breath",
  "Aurak Draconian",
  "Black Gauntlet of Bane",
  "Draconian Mastermind",
  "Dragonborn of Sardior",
  "Dragonflesh Abomination",
  "Echo of Demogorgon",
  "Fensir Skirmisher",
  "Mist Hulk",
  "Mouth of Grolantor",
  "Air Elemental Myrmidon",
  "Armanite",
  "Barrowghast",
  "Bheur Hag",
  "Cinder Hulk",
];

const EXPECTED_BATCH_8 = [
  "Dhergoloth",
  "Draegloth",
  "Dragonborn of Tiamat",
  "Earth Elemental Myrmidon",
  "Fire Elemental Myrmidon",
  "Korred",
  "Liondrake",
  "Lost Sorrowsworn",
  "Maurezhi",
  "Shadar-kai Shadow Dancer",
  "Skeletal Knight",
  "Troll Mutate",
  "Venom Troll",
  "Water Elemental Myrmidon",
  "Young Topaz Dragon",
  "Canoloth",
  "Corpse Flower",
  "Deathlock Mastermind",
  "Dragonborn of Bahamut",
  "Ettin Ceremorph",
];

const EXPECTED_BATCH_9 = [
  "Eyedrake",
  "Fensir Devourer",
  "Hoard Mimic",
  "Howler",
  "Sperm Whale",
  "Sword Wraith Commander",
  "Young Emerald Dragon",
  "Young Moonstone Dragon",
  "Young Sea Serpent",
  "Cairnwight",
  "Hydroloth",
  "Lightning Hulk",
  "Lonely Sorrowsworn",
  "Rot Troll",
  "Shadar-kai Gloom Weaver",
  "Stone Giant of Evil Earth",
  "Ulitharid",
  "Young Amethyst Dragon",
  "Young Sapphire Dragon",
  "Alhoon",
];

const EXPECTED_BATCH_10 = [
  "Autumn Eladrin",
  "Death Kiss",
  "Elder Oblex",
  "Fire Giant of Evil Fire",
  "Fomorian Deep Crawler",
  "Frostmourn",
  "Githyanki Gish",
  "Githzerai Enlightened",
  "Maw of Yeenoghu",
  "Orthon",
  "Spring Eladrin",
  "Star Spawn Hulk",
  "Stone Giant Dreamwalker",
  "Young Dragon Turtle",
  "Adult Deep Dragon",
  "Alkilith",
  "Balhannoth",
  "Cloud Giant Smiling One",
  "Dracohydra",
  "Dragonbone Golem",
];

const EXPECTED_BATCH_11 = [
  "Fire Hellion",
  "Firegaunt",
  "Frost Giant of Evil Water",
  "Hungry Sorrowsworn",
  "Morkoth",
  "Shadar-kai Soul Monger",
  "Spirit Troll",
  "Storm Crab",
  "Adult Crystal Dragon",
  "Cloud Giant of Evil Air",
  "Death Giant Reaper",
  "Duergar Despot",
  "Fomorian Warlock of the Dark",
  "Frost Giant Everlasting One",
  "Githyanki Kith'rak",
  "Hill Giant Avalancher",
  "Oinoloth",
  "Stalker of Baphomet",
  "Yuan-ti Anathema",
  "Adult Topaz Dragon",
];

const EXPECTED_BATCH_12 = [
  "Angry Sorrowsworn",
  "Dire Troll",
  "Manshoon",
  "Muiral",
  "Neothelid",
  "Spectral Cloud",
  "Star Spawn Seer",
  "Vajra Safahr",
  "Wastrilith",
  "Adult Emerald Dragon",
  "Ancient Sea Serpent",
  "Cadaver Collector",
  "Crokek'toeck",
  "Elder Brain",
  "Fire Giant Dreadnought",
  "Fury of Kostchtchie",
  "Githyanki Supreme Commander",
  "Regisaur",
  "Wersten Kern",
  "Adult Moonstone Dragon",
];

const EXPECTED_BATCH_13 = [
  "Adult Sapphire Dragon",
  "Death Giant Shrouded One",
  "Fomorian Noble",
  "Jarlaxle Baenre",
  "Strahd von Zarovich",
  "Tempest Spirit",
  "Adult Amethyst Dragon",
  "Githzerai Anarch",
  "Hellfire Engine",
  "Phoenix",
  "Star Spawn Larva Mage",
  "Steel Predator",
  "Stone Giant Rockspeaker",
  "Storm Giant Quintessent",
  "Titivilus",
  "Draconic Shard",
  "Frost Giant Ice Shaper",
  "Ghost Dragon",
  "Storm Herald",
  "Troll Amalgam",
];

const EXPECTED_BATCH_14 = [
  "Zargon the Returner",
  "Amnizu",
  "Ancient Deep Dragon",
  "Fire Giant Forgecaller",
  "Hollow Dragon",
  "Olhydra",
  "Yan-C-Bin",
  "Ancient Crystal Dragon",
  "Bael",
  "Cloud Giant Destiny Gambler",
  "Imix",
  "Lord Soth",
  "Ancient Topaz Dragon",
  "Flesh Colossus",
  "Gigant",
  "Iggwilv the Witch Queen",
  "Leviathan",
  "Ogrémoch",
  "Storm Giant Tempest Caller",
  "Ancient Emerald Dragon",
];

const EXPECTED_BATCH_15 = [
  "Ancient Moonstone Dragon",
  "Gargantua",
  "Hutijin",
  "Moloch",
  "Molydeus",
  "Runic Colossus",
  "Ancient Sapphire Dragon",
  "Cradle of the Hill Scion",
  "Elder Brain Dragon",
  "Geryon",
  "Miirym",
  "Scion of Grolantor",
  "Zaratan",
  "Acererak",
  "Ancient Amethyst Dragon",
  "Baphomet",
  "Cradle of the Stone Scion",
  "Elder Tempest",
  "Fraz-Urb'luu",
  "Halaster Blackcloak",
];

const EXPECTED_BATCH_16 = [
  "Scion of Skoraeus",
  "Zuggtmoy",
  "Ancient Dragon Turtle",
  "Cradle of the Frost Scion",
  "Graz'zt",
  "Scion of Thrym",
  "Yeenoghu",
  "Bel",
  "Belial",
  "Cradle of the Fire Scion",
  "Fierna",
  "Glasya",
  "Marut",
  "Scion of Surtur",
  "Baalzebul",
  "Cradle of the Cloud Scion",
  "Levistus",
  "Mammon",
  "Scion of Memnor",
  "Cradle of the Storm Scion",
];

/// Партія 17 — хвіст черги 2014, а не партія неповного розміру: `batchSize` лишається 20,
/// але pending-рядків із повним статблоком у корпусі лишалося рівно чотири. Три «Greatwyrm»
/// маніфесту планувальник відкидає ще до нарізки, бо 5etools розписує їх по кольорах, а
/// `Ranimated Companion` — помилка назви в маніфесті. Тому перевірка стереже склад і порядок
/// кожної партії окремо від розміру: інакше вичерпана черга валила б гейт як дефект.
const EXPECTED_BATCH_17 = ["Dispater", "Mephistopheles", "Scion of Stronmaus", "Asmodeus"];

/// Партія 18 — перша партія редакції 2024 в цьому KR, і теж не повного розміру: pending-рядків
/// 2024 у маніфесті сімнадцять, але `Ranimated Companion` у корпусі не існує (помилка назви в
/// маніфесті), тож планувальник віддає шістнадцять.
const EXPECTED_BATCH_18 = [
  "Drow of Lolth",
  "Bulette Pup",
  "Drow Elite Warrior of Lolth",
  "Flesh Golem",
  "Cultist of Bhaal",
  "Drow Mage of Lolth",
  "Primeval Owlbear",
  "Drow Priestess of Lolth",
  "Cultist of Bane",
  "Cultist of Myrkul",
  "Beholder",
  "Animal Lord",
  "Elemental Cataclysm",
  "Blob of Annihilation",
  "Animated Object",
  "Giant Insect",
];

const EXPECTED_BATCH_19 = ["Reanimated Companion"];

/// Партія 20 — перша, чиї рядки не походять із маніфесту aidedd: aidedd публікує три збірні
/// сторінки `*-greatwyrm` без статблоків, а корпус FTD тримає 15 поіменних прадраконів.
/// Порядок — родинами (самоцвітні, хроматичні, металеві), бо саме родина визначає шаблон.
const EXPECTED_BATCH_20 = [
  "Amethyst Greatwyrm",
  "Crystal Greatwyrm",
  "Emerald Greatwyrm",
  "Sapphire Greatwyrm",
  "Topaz Greatwyrm",
  "Black Greatwyrm",
  "Blue Greatwyrm",
  "Green Greatwyrm",
  "Red Greatwyrm",
  "White Greatwyrm",
  "Brass Greatwyrm",
  "Bronze Greatwyrm",
  "Copper Greatwyrm",
  "Gold Greatwyrm",
  "Silver Greatwyrm",
];

/// Перелік і є сторожем: запис, знятий без названого blocker-а, має валити гейт, а не тихо
/// зникати з каталогу. Партія 4 відкрила один — мова `Bothii` у `Uthgardt Shaman`, — і власник
/// ратифікував «Ботійську» того ж дня (питання 26), тож перелік знову порожній, а запис поїхав
/// у каталог. Так само закрилася партія 1: чотири терміни, питання 20 і 21.

/// Маніфест aidedd і корпус 5etools подеколи пишуть ту саму істоту по-різному. Зведення
/// нежорстке, тож конвеєр це переживає, — але різниця має бути **видимою**, інакше нежорсткість
/// одного дня зведе рядок із чужим записом. Партія 4 привела першу таку пару.
const KNOWN_SPELLING_DIFFERENCES = ["Were Bat → Werebat"];

/// Партія 7 відкрила два — мову `Tlincalli` й тег типу `hill giant`, обидва закриті реєстри, на
/// яких **падає словниковий шар**. Власник ратифікував обидва того ж дня (питання 28 і 29):
/// «Тлінкальська» / «Тлінкаллі» і **«Пагорбовий велетень»**, тож перелік знову порожній, а
/// обидва записи поїхали в каталог. Це третій раз, коли перелік відпрацював як задумано:
/// він не дав запису тихо зникнути, поки термін не назвали.
///
/// Партія 9 відкрила четвертий: тег типу `mind flayer` (`Ulitharid` і `Alhoon`) — теж закритий
/// реєстр `creatureTypeTags`, на якому падає словниковий шар. Власник ратифікував **«Мізкожер»**
/// того ж дня (питання 30) і звелів звести форму скрізь: попередній «Зжирач розуму» знято з обох
/// каталогів. Обидва записи поїхали в каталог, і перелік знову порожній — учетверте відпрацював
/// рівно так, як задумувався.
///
/// Партія 12 відкрила пʼятий: мову `Solamnic` (`Wersten Kern`) — знову `LanguageTranslations`.
/// Власник ратифікував **«Соламнійська»** 2026-08-27 (питання 34), реєстр виріс 51 → 52, і
/// перелік спорожнів упʼяте. Розблокувався заразом `Lord Soth` (1038) у партії 14.
const EXPECTED_BLOCKERS: string[] = [];

/// Зняті форми. «ушкодження» тут разом із «пошкодженням»: останній ратифікований власником
/// переклад (KR17.3, 2026-08-24) уживає «шкоду», і словник каже те саме (`rules.damage`).
/// «клас небезпеки» — знята форма показника небезпеки (ратифіковано 2026-08-24).
/// «КЗ» — знята форма Класу броні: питання 3 [O17] закрите на користь «КБ», і словник
/// (`rules.armorClass`) каже те саме. Успадковані записи вживають «КЗ» 44 рази — саме тому
/// перевірка дивиться лише на нові записи з 5etools, а звід каталогу лишається окремою роботою.
const WITHDRAWN_TERMS =
  /чарунк|комірк|пункт\S* здоров|(?<![\p{L}])хіт(?:и|ів|ами|ам|ах|ом|у|а)?(?![\p{L}])|пошкодж|ушкодж|спаскид|урон|клас небезпеки|показник складності|(?<![\p{L}])КЗ(?![\p{L}])/iu;

/// Зняті форми Статури: скорочення «Тіл» у ряткидках і «Тілобудова» у прозі. Ратифікована
/// форма одна — `abilityTranslations.CON` = «Статура», тож обидві сюди й потрапили.
/// Перевірка [10] їх не бачить за побудовою: вона дивиться на **нові** переклади, а ці форми
/// живуть в успадкованих записах. Саме тому вони пережили девʼять партій.
const WITHDRAWN_CONSTITUTION = /(?<![\p{L}])Тіл(?![\p{L}\u2019'])|Тілобудов/u;
const RATIFIED_FEATURES: Record<string, string> = dictionaryFile.DND_DICTIONARY.statblockFeatures;

const RATIFIED_CONDITIONS: Record<string, string> = dictionaryFile.DND_DICTIONARY.conditions;

/// Друге імʼя ратифікованого стану — не «зняте слово», а синонім, і саме тому [9] його не ловить.
/// Партія 9 зняла девʼять таких уживань із партій 7 і 8; кожна пара тут — це варіант, який уже
/// траплявся в тексті цього KR, і ключ словника, під яким лежить канон.
///
/// Перевірка **чутлива до регістру**, і це не послаблення: посилання на стан пишеться з великої
/// («дістає стан Повалений»), а з малої те саме слово буває звичайним прикметником — «скамʼянілий
/// газ» у драконоподібних описує газ, а не стан. Перша редакція перевірки була нечутлива й дала
/// саме такі хибні спрацювання.
const CONDITION_ALIASES: Array<[string, string]> = [
  ["Скамʼянілий", "petrified"],
  ["Лежачий", "prone"],
  ["Знерухомлений", "restrained"],
  ["Оглушений", "stunned"],
  ["Зачарований", "charmed"],
  ["Осліплений", "blinded"],
];

/// Знайдено цим гейтом у **успадкованому** каталозі, а не в партії: `Archmage` має ПС 12 і
/// 8 000 XP замість 8 400. Запис не з 5etools і правиться окремо, тож він названий поіменно —
/// інакше довелося б послабити перевірку, яка й знайшла дефект.
const KNOWN_EXPERIENCE_DEFECTS = ["Archmage"];

/// Той самий клас, знайдений тим самим гейтом: сім успадкованих записів несуть `+2` там, де
/// показник небезпеки вимагає більшого. Жоден із них не з 5etools.
const KNOWN_PROFICIENCY_DEFECTS = [
  "Necromancer",
  "Evoker Mage",
  "Aquatic Chimera",
  "Troll Chieftain",
  "Solar Exarch",
  "Beholder (2024)",
  "Mind Flayer (2024)",
];

const plan = readBatchPlan();
const corpus = readCreatures().filter((creature) => creature.isFullStatblock);
const rows = plan.batches.flatMap((batch) => batch.creatures);
const ready = rows.filter((row) => row.status === "ready");
/// Побудова лінива: якщо рядок партії зламано, впасти має та перевірка, що його стереже,
/// а не збір усього файла — інакше гейт каже «no tests» замість імені дефекту.
///
/// Обидві редакції, а не 2014: партія 17 закрила чергу 2014, і наступна партія — 2024. Поки
/// тут стояла одна редакція, кожен 2024-й рядок плану падав би в `findRecord` як «запис не
/// побудовано», тобто гейт мовчки не стеріг би жодного нового запису 2024.
let cached: GeneratedCreature[] | null = null;

function readBuilt(): GeneratedCreature[] {
  cached ??= [
    ...buildImportedCreaturesFrom5etools("RULES_2014"),
    ...buildImportedCreaturesFrom5etools("RULES_2024"),
  ];
  return cached;
}

describe("KR16.3 — бестіарій з 5etools", () => {
  it("пінить склад і порядок кожної партії, а розмір партії — окремо", () => {
    expect(plan.batchSize).toBe(20);
    expect(plan.batches.map((batch) => batch.creatures.map((row) => row.nameEng))).toEqual([
      EXPECTED_BATCH_1,
      EXPECTED_BATCH_2,
      EXPECTED_BATCH_3,
      EXPECTED_BATCH_4,
      EXPECTED_BATCH_5,
      EXPECTED_BATCH_6,
      EXPECTED_BATCH_7,
      EXPECTED_BATCH_8,
      EXPECTED_BATCH_9,
      EXPECTED_BATCH_10,
      EXPECTED_BATCH_11,
      EXPECTED_BATCH_12,
      EXPECTED_BATCH_13,
      EXPECTED_BATCH_14,
      EXPECTED_BATCH_15,
      EXPECTED_BATCH_16,
      EXPECTED_BATCH_17,
      EXPECTED_BATCH_18,
      EXPECTED_BATCH_19,
      EXPECTED_BATCH_20,
    ]);
  });

  it("пінить ревізію корпусу, з якої знято статблоки", () => {
    expect(plan.revision).toBe("e5f3e77b303a92df10487207857200245e71957c");
  });

  it("відкладає лише відомі словникові blockers", () => {
    const blocked = rows
      .filter((row) => row.status === "blocked-term")
      .map((row) => `${row.nameEng}: ${row.blocker}`);

    expect(blocked).toEqual(EXPECTED_BLOCKERS);
  });

  /// Зводиться тим самим правилом, яким зводить сам конвеєр (`findPinnedStatblock`): книга,
  /// редакція і **нежорстка** назва. Точне порівняння тут розходилося з конвеєром — маніфест
  /// aidedd пише `Were Bat`, корпус `Werebat`, — тобто перевірка стерегла не те, що робить код.
  ///
  /// **Ця перевірка — дзеркало конвеєра й сама впасти не може:** `findPinnedStatblock` кидає
  /// помилку на тій самій умові, тож будь-яка мутація кладе її разом із половиною гейта. Саме
  /// тому різницю в написанні стереже окрема перевірка нижче — за зразком розділення [5] і [7]
  /// у партії 1, де перевірка, що рахувала очікуване тією ж функцією, не могла впасти ніколи.
  it("зводить кожен готовий рядок рівно з одним записом пінованого корпусу", () => {
    const problems = ready.flatMap((row) => {
      const found = corpus.filter(
        (creature) =>
          creature.source === row.pinnedSource &&
          creature.edition === row.edition &&
          findLooseNameKey(creature.nameEng) === findLooseNameKey(row.nameEng)
      );
      return found.length === 1 ? [] : [`${row.nameEng}: ${found.length}`];
    });

    expect(problems).toEqual([]);
  });

  /// Незалежна від конвеєра половина: план пише назву так, як її подає маніфест aidedd, а
  /// каталог дістає назву з корпусу. Зазвичай вони збігаються буква в букву; де ні — різниця
  /// названа поіменно тут, а не поглинута нежорстким зведенням мовчки. Нова розбіжність, якої
  /// в переліку немає, валить гейт — і саме це не дає нежорсткості стати дірою.
  it("називає поіменно кожну розбіжність написання між планом і корпусом", () => {
    const differing = ready.flatMap((row) => {
      const source = findPinnedStatblock(row, corpus);
      return source.nameEng === row.nameEng ? [] : [`${row.nameEng} → ${source.nameEng}`];
    });

    expect(differing).toEqual(KNOWN_SPELLING_DIFFERENCES);
  });

  it("звіряє числа кожного поля статблока з pinned-оригіналом", () => {
    expect(findFieldProblems()).toEqual([]);
  });

  it("бере книгу, показник небезпеки, досвід і бонус майстерності з джерела, а не з перекладу", () => {
    const problems = ready.flatMap((row) => {
      const source = findPinnedStatblock(row, corpus);
      const record = findRecord(row);
      const wrong: string[] = [];

      if (record.source !== findSourceKeyByBookCode(row.pinnedSource)) wrong.push("source");

      /// Статблок, прикликаний заклинанням, показника небезпеки не має взагалі. Рішення
      /// власника 2026-08-19 уже назвало показ: риска замість показника, порожній досвід.
      /// Партія 18 привела перші два такі записи з 5etools (`Animated Object`, `Giant Insect`),
      /// і доти таблиця досвіду кликалася беззастережно — на порожньому ПС вона падала
      /// помилкою замість того, щоб назвати запис. Бонус майстерності тут свідомо не
      /// звіряється: із показника він не виводиться, а конвертер ставить типове «+2» —
      /// те саме, що вже стоїть у 41 записі обох каталогів.
      if (source.challenge === "") {
        if (record.challenge !== "—") wrong.push("challenge");
        if (record.xp !== "") wrong.push("xp");
        return wrong.map((field) => `${row.nameEng}: ${field}`);
      }

      if (record.challenge !== source.challenge) wrong.push("challenge");
      if (record.xp !== `${findExperienceByChallenge(source.challenge)} XP`) wrong.push("xp");
      if (record.proficiencyBonus !== findProficiencyBonusByChallenge(source.challenge)) {
        wrong.push("proficiencyBonus");
      }

      return wrong.map((field) => `${row.nameEng}: ${field}`);
    });

    expect(problems).toEqual([]);
  });

  /// Таблиця досвіду виведена не з памʼяті: корпус 5etools очок досвіду не подає взагалі, тож
  /// вона звіряється з тим, що вже стоїть у двох каталогах — 1 201 запис, обидві редакції.
  it("тримає таблицю досвіду, що збігається з наявними каталогами", () => {
    const problems = readCatalogue().flatMap((creature) => {
      if (KNOWN_EXPERIENCE_DEFECTS.includes(creature.nameEng)) return [];
      const digits = creature.xp.replace(/[^\d]/g, "");
      if (digits === "" || creature.challenge === "0") return [];
      const expected = findExperienceByChallenge(creature.challenge, creature.nameEng);
      return Number(digits) === expected ? [] : [`${creature.nameEng}: ${creature.xp} ≠ ${expected}`];
    });

    expect(problems).toEqual([]);
  });

  it("тримає таблицю бонусу майстерності, що збігається з наявними каталогами", () => {
    const problems = readCatalogue().flatMap((creature) => {
      if (KNOWN_PROFICIENCY_DEFECTS.includes(creature.nameEng)) return [];
      if (creature.challenge === "" || creature.challenge === "—" || creature.challenge === "-") return [];
      const expected = findProficiencyBonusByChallenge(creature.challenge, creature.nameEng);
      return creature.proficiencyBonus === expected
        ? []
        : [`${creature.nameEng}: ${creature.proficiencyBonus} ≠ ${expected}`];
    });

    expect(problems).toEqual([]);
  });

  it("не пускає англійський текст у перекладені поля", () => {
    expect(findLatinLeaks()).toEqual([]);
  });

  it("не заносить у новий переклад зняті терміни", () => {
    const offenders = readBuilt()
      .filter((record) => WITHDRAWN_TERMS.test(collectTranslatedText(record)))
      .map((record) => record.nameEng);

    expect(offenders).toEqual([]);
  });

  it("не тримає знятих форм Статури в жодному записі обох каталогів", () => {
    const offenders = readCatalogue()
      .filter((record) => WITHDRAWN_CONSTITUTION.test(collectTranslatedText(record)))
      .map((record) => record.nameEng || record.name);

    expect(offenders).toEqual([]);
  });
  it("вживає ратифіковану назву риси там, де вона є в реєстрі", () => {
    expect(findFeatureNameProblems()).toEqual([]);
  });

  /// Партія 9 знайшла в тексті партій 7 і 8 вісім уживань назв станів **поза** словником, і
  /// перевірка [9] їх не бачила: це не зняті терміни, а другі імена ратифікованих. Найгірше —
  /// «Оглушений» у значенні `stunned`: читач прочитає його як `deafened`, тобто слово перестало
  /// розрізняти правила, а це рівно те, проти чого написано [Р18].
  ///
  /// Пара пінить **знятий варіант і ключ словника**, а не готове слово, — тож перелік не може
  /// тихо застаріти: якщо словник перейменує стан, впаде перша половина перевірки.
  it("не вживає других імен ратифікованих станів", () => {
    for (const [, key] of CONDITION_ALIASES) {
      expect(RATIFIED_CONDITIONS[key], `стан «${key}» зник зі словника`).toBeTruthy();
    }

    const offenders = readBuilt().flatMap((record) => {
      const text = collectTranslatedText(record);
      return CONDITION_ALIASES.filter(([alias]) => new RegExp(alias, "u").test(text)).map(
        ([alias, key]) => `${record.nameEng}: «${alias}» замість «${RATIFIED_CONDITIONS[key]}»`
      );
    });

    expect(offenders).toEqual([]);
  });

  /// Р12: дедуплікація за назвою робиться в межах редакції. ID однієї редакції не заходять у
  /// діапазон іншої, інакше два записи однієї істоти злилися б в один. Межа — 20000: каталог
  /// 2014 має id 1…1138, каталог 2024 — 20001…20531.
  it("тримає ID кожного рядка в діапазоні своєї редакції і не дублює назв усередині редакції", () => {
    const strays = ready.flatMap((row) => {
      const record = findRecord(row);
      const inRange2024 = record.creatureId >= 20000;
      const wants2024 = row.edition === "RULES_2024";
      return inRange2024 === wants2024 ? [] : [`${row.nameEng}: id ${record.creatureId} поза діапазоном ${row.edition}`];
    });

    expect(strays).toEqual([]);

    const clashes = (["RULES_2014", "RULES_2024"] as const).flatMap((edition) => {
      const fresh = readBuilt().filter((record) => record.ruleset === edition);
      const catalogue = (edition === "RULES_2014" ? creatures2014 : creatures2024) as GeneratedCreature[];
      const inherited = catalogue
        .filter((record) => !fresh.some((entry) => entry.creatureId === record.creatureId))
        .map((record) => record.nameEng);
      return fresh.filter((record) => inherited.includes(record.nameEng)).map((record) => record.nameEng);
    });

    expect(clashes).toEqual([]);
  });

  it("дає кожному готовому рядку переклад із тією ж кількістю секцій, що в джерелі", () => {
    expect(readBuilt()).toHaveLength(ready.length);
    expect(findSectionProblems()).toEqual([]);
  });

  /// Правило зняте з рендерера 5etools (`_renderSpellcasting_getRenderableList`): заклинання,
  /// позначене `hidden`, у статблоці не друкується — воно вже показане деінде (Sage має
  /// `shocking grasp` окремою дією, Dzaan — у своїх замовляннях). Без цієї перевірки
  /// прихований запис міг би тихо повернутися в текст: чисел він не додає, тож перевірка [4]
  /// його не ловить.
  /// Лігво живе не в статблоці, а в `bestiary/legendarygroups.json`, тому девʼять партій
  /// проводили істот із `legendaryGroup` і не помічали, що половина правил лишилася в джерелі.
  /// Перевірка дивиться в корпус, а не в перелік імен: щойно партія приведе істоту з групою,
  /// запис без лігва впаде сам.
  it("везе лігво кожному запису, у якого воно є в корпусі", () => {
    expect(findMissingLairs()).toEqual([]);
  });

  it("везе міфічні дії кожному запису, у якого вони є в корпусі", () => {
    expect(findMissingMythicActions()).toEqual([]);
  });

  it("не друкує заклинань, позначених у корпусі як приховані", () => {
    expect(findHiddenSpellLeaks()).toEqual([]);
  });

  /// Партія 6 стала на `Star Spawn Mangler`: корпус подає `initiative` не числом, а обʼєктом
  /// `{advantageMode}`, і читач падав. Правило зняте з `Renderer.monster.getInitiativeBonusNumber`
  /// у `js/render.js` пінованої ревізії. Перевірка не дзеркалить формулу — вона пінить значення,
  /// звірені з **надрукованими** статблоками: перевага на ініціативу в бонус не входить (вона
  /// зсуває лише пасивне значення), а `proficiency` множиться на бонус майстерності.
  it("рахує ініціативу за правилом рендерера для кожної форми корпусу", () => {
    const readInitiativeOf = (nameEng: string, source: string): string => {
      const found = corpus.find((creature) => creature.nameEng === nameEng && creature.source === source);
      if (!found) throw new Error(`${nameEng} (${source}): немає в корпусі`);
      return readSourceStatblock(found, "x").initiative;
    };

    expect(readInitiativeOf("Star Spawn Mangler", "MPMM")).toBe("+4 (19)");
    expect(readInitiativeOf("Storm Giant Tempest Caller", "BGG")).toBe("+2 (17)");
    expect(readInitiativeOf("Aboleth", "XMM")).toBe("+7 (17)");
    expect(readInitiativeOf("Adult Black Dragon", "XMM")).toBe("+12 (22)");
    expect(readInitiativeOf("Ogre Battering Ram", "MPMM")).toBe("");
  });

  /// Партія 7 стала на `Bheur Hag`: корпус подає `cr` обʼєктом `{cr, coven}`, а читач знав лише
  /// `{cr, lair}` і **мовчки** відкидав решту ключів — той самий клас, що `initiative` у партії 6,
  /// тільки без падіння. Правило зняте з `Renderer.monster._getChallengeRatingPart_classic`
  /// пінованої ревізії: базовий показник у `cr`, `xp` **перекриває** таблицю досвіду, а `lair` і
  /// `coven` — окремі речення надрукованого рядка.
  ///
  /// Перевірка пінить значення, звірені з **надрукованими** статблоками, а не дзеркалить формулу.
  /// `coven` свідомо не доїжджає в каталог: у записі немає такого поля, і чотири відьми, що вже
  /// лежать у каталозі, теж несуть лише базову пару. `Frog` пінить саме перекриття — таблиця дала
  /// б 10 XP, книга друкує 0.
  it("рахує показник небезпеки й досвід за правилом рендерера для кожної форми поля cr", () => {
    const readChallengeOf = (nameEng: string, source: string) => {
      const found = corpus.find((creature) => creature.nameEng === nameEng && creature.source === source);
      if (!found) throw new Error(`${nameEng} (${source}): немає в корпусі`);
      const parsed = readSourceStatblock(found, "x");
      return { challenge: parsed.challenge, xp: parsed.xp, xpInLair: parsed.xpInLair };
    };

    expect(readChallengeOf("Cinder Hulk", "BGG")).toEqual({ challenge: "7", xp: "2900", xpInLair: "" });
    expect(readChallengeOf("Bheur Hag", "MPMM")).toEqual({ challenge: "7", xp: "2900", xpInLair: "" });
    expect(readChallengeOf("Beholder", "MM")).toEqual({ challenge: "13", xp: "10000", xpInLair: "11500" });
    expect(readChallengeOf("Frog", "MM")).toEqual({ challenge: "0", xp: "0", xpInLair: "" });

    const withUnknownKey = {
      ...(corpus.find((creature) => creature.nameEng === "Bheur Hag" && creature.source === "MPMM") as object),
      raw: { ...(corpus.find((c) => c.nameEng === "Bheur Hag" && c.source === "MPMM")!.raw as object), cr: { cr: "7", suffix: "9" } },
    };
    expect(() => readSourceStatblock(withUnknownKey as never, "x")).toThrow(/невідомі ключі показника небезпеки: suffix/);
  });
});

function readCatalogue(): GeneratedCreature[] {
  return [...creatures2014, ...creatures2024] as GeneratedCreature[];
}

function findRecord(row: BatchRow): GeneratedCreature {
  const record = readBuilt().find((entry) => entry.creatureId === row.creatureId);
  if (!record) throw new Error(`${row.nameEng}: запис не побудовано`);
  return record;
}

/// Кожне число англійського поля має лишитися в перекладеному. Це і ловить вигадану дальність
/// чи загублений кубик — саме той клас помилки, що дав 32 розбіжності на 82 статблоках,
/// написаних із памʼяті.
function findFieldProblems(): string[] {
  const fields: Array<[keyof ParsedCreature, keyof GeneratedCreature]> = [
    ["ac", "ac"],
    ["hp", "hp"],
    ["speed", "speed"],
    ["skills", "skills"],
    ["savingThrows", "savingThrows"],
    ["senses", "senses"],
    ["languages", "languages"],
    ["damageResistance", "damageResistance"],
    ["damageImmunity", "damageImmunity"],
    ["conditionImmunity", "conditionImmunity"],
  ];

  return ready.flatMap((row) => {
    const source = findPinnedStatblock(row, corpus);
    const record = findRecord(row);

    const wrong = fields
      .filter(([from, to]) => !haveSameNumbers(String(source[from]), String(record[to] ?? "")))
      .map(([from]) => `${row.nameEng}: ${String(from)}`);

    return [...wrong, ...findSectionNumberProblems(row, source, record)];
  });
}

function findSectionNumberProblems(
  row: BatchRow,
  source: ParsedCreature,
  record: GeneratedCreature
): string[] {
  /// Лігво додано партією 15: до неї [4] звіряла числа рис, дій, бонусних дій, реакцій і
  /// легендарних дій — і **не дивилася** на `lairInfo`, `lairActions` та `regionEffects`,
  /// хоча вони їдуть партіями з KR16.7. Тобто вигадана СК чи загублений кубик у дії лігва
  /// проходили повз гейт від партії 10. Доведено контрольною мутацією: «100 футів» → «101 фут»
  /// у дії лігва Бафомета лишало гейт зеленим.
  const sections: Array<[keyof ParsedCreature, string]> = [
    ["traits", record.specialAbilities],
    ["actions", record.actions],
    ["bonusActions", record.bonusActions ?? ""],
    ["reactions", record.reactions],
    ["legendaryActions", record.legendaryActions],
    ["lairActions", record.lairActions ?? ""],
    ["regionEffects", record.regionEffects ?? ""],
    ["mythicActions", record.mythicActions ?? ""],
  ];

  const prose: Array<[keyof ParsedCreature, string]> = [
    ["lairInfo", record.lairInfo ?? ""],
    ["mythicInfo", record.mythicInfo ?? ""],
  ];

  /// Маркер оригіналу `назва{{English}}` — не переклад, а оригінал поруч, і цифри з нього
  /// («{{1-2: Blazing Red}}», «{{Legendary Resistance (1/Day)}}») подвоїли б лічбу. Знімається
  /// тим самим кодом, що й у [11], перш ніж рахувати.
  return [
    ...prose
      .filter(([key, html]) => !haveSameNumbers(String(source[key] ?? ""), stripGlossaryMarkers(html)))
      .map(([key]) => `${row.nameEng}: ${String(key)}`),
    ...sections
      .filter(([key, html]) => {
        const entries = source[key] as Array<{ name: string; text: string }>;
        const english = entries.map((entry) => `${entry.name} ${entry.text}`).join(" ");
        return !haveSameNumbers(english, stripGlossaryMarkers(html));
      })
      .map(([key]) => `${row.nameEng}: ${String(key)}`),
  ];
}

function haveSameNumbers(english: string, ukrainian: string): boolean {
  const read = (text: string) => (text.match(/\d+/g) ?? []).map(Number).sort((a, b) => a - b);
  return JSON.stringify(read(english)) === JSON.stringify(read(ukrainian));
}

/// Латиниця в перекладеному полі — це англійський залишок, який конвертер пропустив
/// (`translateDistance` мовчки лишає «(blind beyond this radius)»). Винятків два, і обидва —
/// ратифіковані формати, а не послаблення: англійська назва заклинання у квадратних дужках і
/// маркер оригіналу «термін{{English}}» ([Р20](../../docs/DECISIONS.md#р20)). Маркер знімається
/// **тим самим** кодом, яким його розгортає рендерер, — інакше гейт і сторінка розійшлися б.
function findLatinLeaks(): string[] {
  return readBuilt().flatMap((record) => {
    const text = stripGlossaryMarkers(collectTranslatedText(record))
      .replace(/<[^>]+>/g, " ")
      .replace(/\[[^\]]*\]/g, "");
    return /[A-Za-z]/.test(text) ? [`${record.nameEng}: ${/[A-Za-z][A-Za-z ]*/.exec(text)?.[0]}`] : [];
  });
}

/// `gear` тут з партії 2024: у книгах 2014-ї доби поля немає взагалі, тож три партії поспіль
/// журнал називав його дірою гейта, якої ніщо не оживляло. Корпус пише спорядження посиланням
/// `chain shirt|xphb`, і латиниця з нього доїхала б у каталог непоміченою.
function collectTranslatedText(record: GeneratedCreature): string {
  return [
    record.name,
    record.size,
    record.type,
    record.alignment,
    record.ac,
    record.hp,
    record.speed,
    record.skills,
    record.senses,
    record.languages,
    record.gear ?? "",
    record.damageResistance,
    record.damageImmunity,
    record.damageVulnerability ?? "",
    record.conditionImmunity,
    record.savingThrows,
    record.specialAbilities,
    record.actions,
    record.bonusActions ?? "",
    record.reactions,
    record.legendaryActions,
    record.lairInfo ?? "",
    record.lairActions ?? "",
    record.regionEffects ?? "",
    record.mythicInfo ?? "",
    record.mythicActions ?? "",
    record.description,
  ].join(" ");
}

/// Ратифікована назва риси пишеться **рівно** так: ратифікована форма, за нею `{{English}}`,
/// а вже потім дужковий хвіст — «Легендарний опір{{Legendary Resistance}} (3/день)». За Р20 в
/// редакції 2026-09-02 маркер несе кожна назва риси й дії, ратифікована чи ні, тож гола
/// ратифікована форма падає так само, як і чужа. До зачистки KR30.2 тут маркер знімався перед
/// порівнянням; форму маркованого написання задає той самий код, що й зачистка.
function buildExpectedFeatureName(ratified: string, ukrainian: string | undefined, english: string): string {
  return buildMarkedName(`${ratified}${splitNameTail(ukrainian ?? "").tail}`, english);
}

function findFeatureNameProblems(): string[] {
  return ready.flatMap((row) => {
    const source = findPinnedStatblock(row, corpus);
    const translations = readBatchTranslations(findBatchOf(row), row.edition);
    const translation = translations.find((entry) => entry.slug === row.slug);
    if (!translation) return [`${row.nameEng}: немає перекладу`];

    const pairs: Array<[Array<{ name: string }>, Array<{ name: string }>]> = [
      [source.traits, translation.traits ?? []],
      [source.actions, translation.actions ?? []],
      [source.bonusActions, translation.bonusActions ?? []],
      [source.reactions, translation.reactions ?? []],
      [source.legendaryActions, translation.legendaryActions ?? []],
      [source.mythicActions, translation.mythicActions ?? []],
    ];

    return pairs.flatMap(([english, ukrainian]) =>
      english.flatMap((entry, index) => {
        const ratified = RATIFIED_FEATURES[entry.name];
        if (!ratified) return [];
        const expected = buildExpectedFeatureName(ratified, ukrainian[index]?.name, entry.name);
        if (ukrainian[index]?.name === expected) return [];
        return [`${row.nameEng}: «${entry.name}» → «${ukrainian[index]?.name}» замість «${expected}»`];
      })
    );
  });
}

function findMissingLairs(): string[] {
  return ready.flatMap((row) => {
    const source = findPinnedStatblock(row, corpus);
    const record = findRecord(row);
    const missing = [
      source.lairInfo !== "" && (record.lairInfo ?? "") === "" ? "lairInfo" : "",
      source.lairActions.length > 0 && (record.lairActions ?? "") === "" ? "lairActions" : "",
      source.regionEffects.length > 0 && (record.regionEffects ?? "") === "" ? "regionEffects" : "",
    ].filter((field) => field !== "");

    return missing.map((field) => `${row.nameEng}: ${field}`);
  });
}

/// Міфічні дії лежать у статблоці окремими ключами `mythicHeader` і `mythic`, і читач не бачив
/// їх пʼятнадцять партій поспіль. У черзі KR16.3 такий запис один — `Ancient Dragon Turtle`, —
/// і його риса «Благословення моря» посилається на секцію, якої без цього на сторінці немає.
/// Перевірка дивиться в корпус, а не в перелік імен: наступний такий запис впаде сам.
function findMissingMythicActions(): string[] {
  return ready.flatMap((row) => {
    const source = findPinnedStatblock(row, corpus);
    const record = findRecord(row);
    const missing = [
      source.mythicInfo !== "" && (record.mythicInfo ?? "") === "" ? "mythicInfo" : "",
      source.mythicActions.length > 0 && (record.mythicActions ?? "") === "" ? "mythicActions" : "",
    ].filter((field) => field !== "");

    return missing.map((field) => `${row.nameEng}: ${field}`);
  });
}

function findSectionProblems(): string[] {
  return ready.flatMap((row) => {
    const source = findPinnedStatblock(row, corpus);
    const record = findRecord(row);
    const counts: Array<[keyof ParsedCreature, string]> = [
      ["traits", record.specialAbilities],
      ["actions", record.actions],
      ["bonusActions", record.bonusActions ?? ""],
      ["reactions", record.reactions],
      ["legendaryActions", record.legendaryActions],
      ["lairActions", record.lairActions ?? ""],
      ["regionEffects", record.regionEffects ?? ""],
      ["mythicActions", record.mythicActions ?? ""],
    ];

    return counts
      .filter(([key, html]) => (source[key] as unknown[]).length !== (html.match(/<p>/g) ?? []).length)
      .map(([key]) => `${row.nameEng}: ${String(key)}`);
  });
}

/// Приховані заклинання шукаються в самому корпусі, а не в переліку з памʼяті: інакше
/// перевірка старіла б мовчки, щойно партія привела б нову істоту з таким записом.
function findHiddenSpellLeaks(): string[] {
  return ready.flatMap((row) => {
    const source = findPinnedStatblock(row, corpus);
    const raw = corpus.find(
      (creature) => creature.source === row.pinnedSource && creature.nameEng === row.nameEng
    );
    const text = [...source.traits, ...source.actions, ...source.bonusActions, ...source.reactions]
      .map((entry) => entry.text)
      .join(" ");

    return collectHiddenSpellNames(raw?.raw)
      .filter((spell) => text.includes(spell))
      .map((spell) => `${row.nameEng}: «${spell}»`);
  });
}

function collectHiddenSpellNames(raw: unknown): string[] {
  const blocks = (raw as { spellcasting?: unknown[] } | undefined)?.spellcasting ?? [];
  const found: string[] = [];

  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value === null || typeof value !== "object") return;
    const node = value as { entry?: unknown; hidden?: unknown };
    if (node.hidden === true && typeof node.entry === "string") {
      found.push(node.entry.replace(/^\{@spell\s+|\}$/g, "").split("|")[0]);
      return;
    }
    Object.values(node).forEach(walk);
  };

  blocks.forEach(walk);
  return found;
}

function findBatchOf(row: BatchRow): number {
  const found = plan.batches.find((batch) => batch.creatures.some((entry) => entry.slug === row.slug));
  if (!found) throw new Error(`${row.nameEng}: рядок поза планом`);
  return found.batch;
}

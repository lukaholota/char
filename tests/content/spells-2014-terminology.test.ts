import { describe, expect, it } from "vitest";
import {
  ARMOR_CLASS_RETIRED,
  CAST_SPELL_PHRASE,
  CHALLENGE_RATING_RETIRED,
  DAMAGE_NOUN,
  SPELL_WORD,
  STAT_BLOCK_RETIRED,
} from "./ratified-term-forms";
import catalog2014 from "@/lib/generated/spells.json";
import {
  applySpellTerminologyDescription,
  readSpellTerminology2014,
} from "../../prisma/seed/spellTerminology2014";

/// KR17.4 + KR17.5: партії по 30 записів, відібраних за кількістю знятих форм.
/// Каталог 2014 живе в базі, тому тест застосовує вхід сіду в памʼяті: він доводить дані
/// до прогону на spells_test, не редагуючи generated JSON.
const BATCH_01 = [
  "Color Spray",
  "Wall of Ice",
  "Aid",
  "Blindness/Deafness",
  "Branding Smite",
  "Conjure Animals",
  "Conjure Celestial",
  "Conjure Elemental",
  "Conjure Fey",
  "Conjure Minor Elementals",
  "Conjure Woodland Beings",
  "Cure Wounds",
  "Disintegrate",
  "Divine Word",
  "Enhance Ability",
  "False Life",
  "Flame Strike",
  "Guiding Bolt",
  "Heal",
  "Healing Word",
  "Heroism",
  "Hunter's Mark",
  "Imprisonment",
  "Infernal Calling",
  "Mass Cure Wounds",
  "Mass Heal",
  "Mass Healing Word",
  "Melf's Acid Arrow",
  "Moonbeam",
  "Prayer of Healing",
] as const;

/// Партія 2 — damage: «ушкодження» → «шкода».
const BATCH_02 = [
  "Prismatic Wall",
  "Prismatic Spray",
  "Sleep",
  "Glyph of Warding",
  "Delayed Blast Fireball",
  "Wall of Fire",
  "Heat Metal",
  "Spirit Guardians",
  "Polymorph",
  "Create Homunculus",
  "Wall of Thorns",
  "True Polymorph",
  "Shapechange",
  "Hellish Rebuke",
  "Shatter",
  "Flaming Sphere",
  "Vampiric Touch",
  "Bestow Curse",
  "Call Lightning",
  "Ice Storm",
  "Blight",
  "Harm",
  "Mass Polymorph",
  "Storm of Vengeance",
  "Thunderwave",
  "Burning Hands",
  "Spiritual Weapon",
  "Fireball",
  "Lightning Bolt",
  "Cloudkill",
] as const;

/// Партія 3 — spell slot: «комірка» → «слот заклинань», плюс статблок.
const BATCH_03 = [
  "Animate Objects",
  "Armor of Agathys",
  "Bigby's Hand",
  "Charm Monster",
  "Bones of the Earth",
  "Summon Greater Demon",
  "Tiny Servant",
  "Ashardalon's Stride",
  "Enervation",
  "Healing Spirit",
  "Life Transference",
  "Mordenkainen's Private Sanctum",
  "Spirit Shroud",
  "Summon Lesser Demons",
  "Summon Aberration",
  "Summon Beast",
  "Summon Celestial",
  "Summon Construct",
  "Summon Draconic Spirit",
  "Summon Elemental",
  "Summon Fey",
  "Summon Fiend",
  "Summon Shadowspawn",
  "Summon Undead",
  "Absorb Elements",
  "Aganazzar's Scorcher",
  "Arms of Hadar",
  "Catapult",
  "Catnap",
  "Chromatic Orb",
  "Phantom Steed",
] as const;

/// Партія 4 — закриває radiant: третя форма типу шкоди, «випромінювання».
const BATCH_04 = [
  "Crusader's Mantle",
  "Blinding Smite",
  "Sickening Radiance",
  "Shadow of Moil",
  "Destructive Wave",
  "Dawn",
  "Holy Weapon",
  "Wall of Light",
  "Tasha's Otherworldly Guise",
  "Crown of Stars",
] as const;

/// Партія 5 — весь кластер «комірка» закритий до нуля (36 записів, 71 входження).
const BATCH_05 = [
  "Witch Bolt",
  "Hail of Thorns",
  "Dissonant Whispers",
  "Magnify Gravity",
  "Ice Knife",
  "Ensnaring Strike",
  "Searing Smite",
  "Ray of Sickness",
  "Earth Tremor",
  "Cordon of Arrows",
  "Immovable Object",
  "Dust Devil",
  "Fortune's Favor",
  "Mind Spike",
  "Tasha's Mind Whip",
  "Rime's Binding Ice",
  "Cloud of Daggers",
  "Snilloc's Snowball Swarm",
  "Lightning Arrow",
  "Erupting Earth",
  "Thunder Step",
  "Pulse Wave",
  "Melf's Minute Meteors",
  "Flame Arrows",
  "Elemental Weapon",
  "Intellect Fortress",
  "Gravity Sinkhole",
  "Vitriolic Sphere",
  "Elemental Bane",
  "Raulothim's Psychic Lance",
  "Storm Sphere",
  "Danse Macabre",
  "Temporal Shunt",
  "Gravity Fissure",
  "Otiluke's Freezing Sphere",
  "Time Ravage",
] as const;

/// Партія 6 — «клас небезпеки» → «показник небезпеки» (доповнення в batch01/02) і «КЗ» → «КБ».
const BATCH_06 = [
  "Animal Shapes",
  "Unseen Servant",
  "Mage Armor",
  "Shield",
  "Shield of Faith",
  "Barkskin",
  "Warding Bond",
  "Haste",
  "Slow",
  "Wall of Stone",
] as const;

/// Партія 7 — весь кластер лінії Б (не «чари») для ХП, шкоди, станів і рятівного кидка.
const BATCH_07 = [
  "Toll the Dead",
  "Find Familiar",
  "Aura of Vitality",
  "Wall of Water",
  "Aura of Life",
  "Guardian of Nature",
  "Find Greater Steed",
  "Greater Restoration",
  "Banishing Smite",
  "Transmute Rock",
  "Negative Energy Flood",
  "Heroes' Feast",
  "Soul Cage",
  "Tenser's Transformation",
  "Power Word Pain",
  "Temple of the Gods",
  "Mighty Fortress",
  "Dark Star",
  "Ravenous Void",
  "Power Word Heal",
  "Infestation",
  "Hex",
  "Flame Blade",
  "Lightning Lure",
  "Primal Savagery",
  "Mind Sliver",
  "Sword Burst",
  "Tasha's Caustic Brew",
  "Chaos Bolt",
  "Dragon's Breath",
  "Lesser Restoration",
  "Warding Wind",
  "Magic Stone",
  "Beast Bond",
  "Crown of Madness",
  "Nathair's Mischief",
  "Word of Radiance",
  "Cause Fear",
  "Snare",
  "Ceremony",
] as const;

/// KR17.7 партія 1 — лінія А: «чари» → «заклинання» (разом із «чарункою» в тих самих реченнях).
const BATCH_08 = [
  "Jump",
  "Darkvision",
  "Divine Favor",
  "Greater Invisibility",
  "See Invisibility",
  "Water Breathing",
  "Glibness",
  "Tongues",
  "True Strike",
  "True Seeing",
  "Remove Curse",
  "Guidance",
  "Resistance",
  "Spider Climb",
  "Longstrider",
  "Nondetection",
  "Blur",
  "Detect Poison and Disease",
  "Gentle Repose",
  "Pass without Trace",
  "Expeditious Retreat",
  "Comprehend Languages",
  "Fly",
  "Foresight",
  "Invisibility",
  "Speak with Animals",
  "Fog Cloud",
  "Transport Via Plants",
  "Bless",
  "Mending",
] as const;

/// KR17.7 партія 2 — лінія А: «чари» → «заклинання», разом із «чарункою» в тих самих реченнях.
const BATCH_09 = [
  "Grease",
  "Detect Evil and Good",
  "Detect Magic",
  "Freedom of Movement",
  "Time Stop",
  "Protection From Evil and Good",
  "Sanctuary",
  "Antilife Shell",
  "Message",
  "Bane",
  "Sending",
  "Dispel Magic",
  "Light",
  "Hold Person",
  "Maze",
  "Entangle",
  "Arcane Eye",
  "Identify",
  "Passwall",
  "Hold Monster",
  "Animal Friendship",
  "Counterspell",
  "Fear",
  "Word of Recall",
  "Zone of Truth",
  "Locate Object",
  "Daylight",
  "Sleet Storm",
  "Create or Destroy Water",
  "Stinking Cloud",
] as const;

/// KR17.7 партія 3 — лінія А: «чари» → «заклинання», разом із «чарункою» в тих самих реченнях.
const BATCH_10 = [
  "Divination",
  "Alarm",
  "Globe of Invulnerability",
  "Mage Hand",
  "Arcane Lock",
  "Find Traps",
  "Darkness",
  "Charm Person",
  "Knock",
  "Locate Creature",
  "Illusory Script",
  "Faerie Fire",
  "Find the Path",
  "Clairvoyance",
  "Gust of Wind",
  "Plant Growth",
  "Clone",
  "Reverse Gravity",
  "Speak with Dead",
  "Demiplane",
  "Rope Trick",
  "Enthrall",
  "Commune",
  "Commune with Nature",
  "Thaumaturgy",
  "Compulsion",
  "Calm Emotions",
  "Tree Stride",
  "Hallucinatory Terrain",
  "Legend Lore",
] as const;

/// KR17.7 партія 4 — лінія А: «чари» → «заклинання», разом із «чарункою» і дієсловом «створювати» в значенні cast.
const BATCH_11 = [
  "Awaken",
  "Silent Image",
  "Prestidigitation",
  "Augury",
  "Banishment",
  "Blink",
  "Minor Illusion",
  "Dispel Evil and Good",
  "Disguise Self",
  "Magic Circle",
  "Mirage Arcane",
  "Speak with Plants",
  "Animal Messenger",
  "Fabricate",
  "Plane Shift",
  "Creation",
  "Move Earth",
  "Gate",
  "Teleportation Circle",
  "Seeming",
  "Contingency",
  "Magic Mouth",
  "Programmed Illusion",
  "Forcecage",
  "Command",
] as const;

/// KR17.7 партія 6 — нові записи лінії А.
const BATCH_12 = [
  "Planar Binding",
  "Confusion",
  "Reincarnate",
  "Animate Dead",
] as const;

/// KR17.7 партія 7 — нові записи лінії А: слово зводиться разом зі шкодою й ХП у тих самих реченнях.
const BATCH_13 = [
  "Spare the Dying",
  "Protection From Energy",
  "Stoneskin",
  "Power Word Kill",
  "Revivify",
  "Beacon of Hope",
  "Feather Fall",
  "Protection From Poison",
  "Inflict Wounds",
  "Poison Spray",
  "Magic Weapon",
  "Goodberry",
  "Acid Splash",
  "Sacred Flame",
  "Ray of Frost",
  "Fire Bolt",
  "Power Word Stun",
  "Ray of Enfeeblement",
  "Silence",
  "Mind Blank",
  "Death Ward",
  "Shillelagh",
  "Scorching Ray",
  "Circle of Death",
  "Shocking Grasp",
] as const;

/// KR17.7 партія 8 — нові записи лінії А: слово, шкода, ХП і стани в тих самих реченнях.
const BATCH_14 = [
  "Eldritch Blast",
  "Regenerate",
  "Finger of Death",
  "Magic Missile",
  "Vicious Mockery",
  "Cone of Cold",
  "Water Walk",
  "Hypnotic Pattern",
  "Spike Growth",
  "Holy Aura",
  "Meteor Swarm",
  "Chill Touch",
  "Fire Shield",
  "Guardian of Faith",
  "Tasha's Hideous Laughter",
  "Weird",
  "Phantasmal Killer",
  "Fire Storm",
  "Sunburst",
  "True Resurrection",
  "Mislead",
  "Produce Flame",
  "Chain Lightning",
  "Blade Barrier",
  "Sunbeam",
] as const;

/// KR17.7 партія 9 — нові записи лінії А: слово, шкода, ХП і стани в тих самих реченнях.
const BATCH_15 = [
  "Sequester",
  "Insect Plague",
  "Booming Blade",
  "Incendiary Cloud",
  "Feeblemind",
  "Giant Insect",
  "Wind Walk",
  "Dimension Door",
  "Gaseous Form",
  "Wind Wall",
  "Wall of Force",
  "Flesh to Stone",
  "Raise Dead",
  "Contact Other Plane",
  "Resurrection",
  "Web",
  "Project Image",
  "Mirror Image",
  "Suggestion",
  "Meld Into Stone",
] as const;

/// KR17.7 партія 10 — нові записи лінії А. `Prismatic Spray` іде доповненням у `BATCH_02`,
/// тому власного масиву не має — його покриває лише храповик слова.
const BATCH_16 = [
  "Geas",
  "Simulacrum",
  "Forbiddance",
  "Enlarge/Reduce",
  "Eyebite",
  "Alter Self",
  "Dominate Monster",
  "Dream",
  "Mass Suggestion",
  "Find Steed",
  "Major Image",
  "Dominate Beast",
  "Dominate Person",
] as const;

/// KR17.7 партія 11 — нові записи лінії А.
const BATCH_17 = [
  "Create Undead",
  "Contagion",
  "Telekinesis",
  "Control Weather",
  "Detect Thoughts",
  "Etherealness",
  "Modify Memory",
  "Earthquake",
  "Planar Ally",
] as const;

/// KR17.7 партія 12 — нові записи лінії А. `Shapechange` і `True Polymorph` ідуть
/// доповненням у `BATCH_02`, тому власного масиву не мають — їх покриває лише храповик слова.
const BATCH_18 = [
  "Astral Projection",
  "Antipathy/Sympathy",
  "Magic Jar",
  "Hallow",
  "Antimagic Field",
  "Guards and Wards",
] as const;

/// KR17.7 партія 13 — останні нові записи лінії А. `Imprisonment`, `Glyph of Warding` і
/// `Prismatic Wall` ідуть доповненням у `BATCH_01`/`BATCH_02`, тому власного масиву не мають.
const BATCH_19 = [
  "Wish",
  "Control Water",
  "Symbol",
  "Teleport",
] as const;


const RETIRED_TERMS: { label: string; pattern: RegExp }[] = [
  /// KR17.7 закрито 2026-09-01: лінія А зведена до нуля, тому форма переїхала сюди з
  /// храповика `SPELL_WORD_CONVERTED`. Межі слова й перелік закінчень навмисні —
  /// «чарівник», «чародій», «чаротворча», «Причарований» законні й не мають червонити.
  { label: "заклинання", pattern: SPELL_WORD },
  { label: "чарунка", pattern: /чарунк/iu },
  { label: "комірка", pattern: /комірк/iu },
  {
    label: "ХП",
    pattern:
      /пункт\S*\s+здоров|(?<![\p{L}])хіт(?:и|ів|ами|ам|ах|ом|у|а)?(?![\p{L}])|оч(?:ок|ки|ками)\s+здоров/iu,
  },
  {
    label: "шкода",
    pattern:
      /\d+к\d+\s+пошкодж|пошкоджень\s+(?:кислотою|вогнем|холодом|блискавкою|отрутою|громом)|(?:дробильних|колотих|різаних|колючих|некротичних|психічних|променистих)\s+пошкодж/iu,
  },
  { label: "Засліплений", pattern: /осліплен/iu },
  { label: "Оглухлий", pattern: /оглушен/iu },
  { label: "Причарований", pattern: /зачарован/iu },
  { label: "рятівний кидок", pattern: /спаскидок/iu },
  /// КБ, показник небезпеки, накладаєте заклинання, шкода(ушкоджен) і статблок — спільне
  /// визначення з 2024-гейтом ([`ratified-term-forms.ts`](./ratified-term-forms.ts)). До
  /// KR32.1 цей файл тримав власну вужчу копію показника небезпеки без форми «рівень» —
  /// саме через це латка `prod-drift-repair-2026-09-02.json` не побачила «рівнем небезпеки»,
  /// що лишилося в `Conjure Elemental` і `Conjure Fey` поза перепиcаним реченням.
  { label: "КБ", pattern: ARMOR_CLASS_RETIRED },
  { label: "показник небезпеки", pattern: CHALLENGE_RATING_RETIRED },
  { label: "накладаєте заклинання", pattern: CAST_SPELL_PHRASE },
  { label: "променева шкода", pattern: /променист/iu },
  { label: "променева шкода", pattern: /(?:шкод\S*|[Уу]шкодж\S*)\s+Світлом/u },
  /// Іменникові форми damage. «неушкодженими» і «ушкоджує» — не термін, тому відсічені
  /// межею слова й хвостом «-ь»/«-н»; «пошкодження» має власний рядок вище.
  { label: "шкода", pattern: DAMAGE_NOUN },
  /// stat block. Форми «блок параметрів» і «статистичний блок» зняті 2026-08-23; «блок
  /// характеристик», «блок показників», «блок статистики» і «блок стану» — той самий термін.
  { label: "статблок", pattern: STAT_BLOCK_RETIRED },
  /// radiant, третя форма. З якорем на слово шкоди: без нього «іскри яскравого випромінювання»
  /// й «полумʼя випромінювання опускається» — законна проза — читалися б як тип шкоди.
  {
    label: "променева шкода",
    pattern: /шкод\S*\s+випромінюванн|випромінюванн\S*\s+\d+к\d+|\d+к\d+\s+випромінюванн|випромінювання\s+та\s+некротичн/iu,
  },
  /// Апостроф. Рішення власника 2026-08-30: ʼ (U+02BC).
  { label: "апостроф ʼ", pattern: /['’‘`´]/u },
];

const correctionsByName = new Map(
  readSpellTerminology2014().map((correction) => [correction.engName, correction])
);

function applyDescriptionReplacements(engName: string, description: string): string {
  const correction = correctionsByName.get(engName);
  if (!correction) throw new Error(`${engName}: немає термінологічної правки`);
  return applySpellTerminologyDescription(
    engName,
    description,
    correction.replaceInDescription
  );
}

/// Наскрізна перевірка каталогу читає й описи без корекції, тому мовчки повертає їх
/// нормалізованими, а не кидає, як `applyDescriptionReplacements`.
function applyCorrectionIfAny(engName: string, description: string): string {
  const correction = correctionsByName.get(engName);
  if (!correction) return description;
  return applySpellTerminologyDescription(engName, description, correction.replaceInDescription);
}

function findRetiredForms(batch: readonly string[]): string[] {
  const byName = new Map(catalog2014.map((spell) => [spell.engName, spell]));
  return batch.flatMap((engName) => {
    const spell = byName.get(engName);
    if (!spell) return [`${engName}: немає в каталозі 2014`];

    const description = applyDescriptionReplacements(engName, spell.description);
    return RETIRED_TERMS.filter((term) => term.pattern.test(description)).map(
      (term) => `${engName}: ${term.label}`
    );
  });
}

/// KR32.1: жодна термінологічна партія 2014 ніколи не чіпала `components`/`castingTime` —
/// корекції `replaceInDescription` пишуться лише в опис. Ці поля не мали жодного гейта
/// взагалі, тому перелік нижче — виміряний обсяг на день підключення, а не доказ, що
/// восьмої форми чи сотого запису більше немає ([Р21](../../docs/DECISIONS.md#р21)).
function findRetiredFormsInField(field: "components" | "castingTime"): string[] {
  return catalog2014.flatMap((spell) => {
    const text = spell[field] ?? "";
    return RETIRED_TERMS.filter((term) => term.pattern.test(text)).map(
      (term) => `${spell.engName}: ${term.label}`
    );
  });
}

describe("каталог 2014 говорить ратифікованими термінами", () => {
  it("KR17.4 + KR17.5 партія 1: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_01)).toEqual([]);
  });

  it("KR17.4 + KR17.5 партія 2: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_02)).toEqual([]);
  });

  it("KR17.4 + KR17.5 партія 3: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_03)).toEqual([]);
  });

  it("KR17.4 + KR17.5 партія 4: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_04)).toEqual([]);
  });

  it("KR17.4 + KR17.5 партія 5: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_05)).toEqual([]);
  });

  it("KR17.4 + KR17.5 партія 6: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_06)).toEqual([]);
  });

  it("KR17.4 + KR17.5 партія 7: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_07)).toEqual([]);
  });

  it("KR17.7 партія 1: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_08)).toEqual([]);
  });

  it("KR17.7 партія 2: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_09)).toEqual([]);
  });

  it("KR17.7 партія 3: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_10)).toEqual([]);
  });

  it("KR17.7 партія 4: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_11)).toEqual([]);
  });

  it("KR17.7 партія 6: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_12)).toEqual([]);
  });

  it("KR17.7 партія 7: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_13)).toEqual([]);
  });

  it("KR17.7 партія 8: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_14)).toEqual([]);
  });

  it("KR17.7 партія 9: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_15)).toEqual([]);
  });

  it("KR17.7 партія 10: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_16)).toEqual([]);
  });

  it("KR17.7 партія 11: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_17)).toEqual([]);
  });

  it("KR17.7 партія 12: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_18)).toEqual([]);
  });

  it("KR17.7 партія 13: після сіду немає знятих форм", () => {
    expect(findRetiredForms(BATCH_19)).toEqual([]);
  });

  it("KR17.7: жоден опис каталогу 2014 не каже «чари» в жодній формі", () => {
    const left = catalog2014
      .filter((spell) => SPELL_WORD.test(applyCorrectionIfAny(spell.engName, spell.description)))
      .map((spell) => spell.engName);
    expect(left).toEqual([]);
  });

  it("KR32.1: тримає виміряний обсяг знятих форм у `components` — гейт їх раніше не читав", () => {
    expect(findRetiredFormsInField("components")).toHaveLength(34);
  });

  it("KR32.1: тримає виміряний обсяг знятих форм у `castingTime` — гейт їх раніше не читав", () => {
    expect(findRetiredFormsInField("castingTime")).toHaveLength(2);
  });

  it("партії не перетинаються — той самий опис не їде в прод двічі", () => {
    const seen = new Set<string>();
    const repeated = [...BATCH_01, ...BATCH_02, ...BATCH_03, ...BATCH_04, ...BATCH_05, ...BATCH_06, ...BATCH_07, ...BATCH_08, ...BATCH_09, ...BATCH_10, ...BATCH_11, ...BATCH_12, ...BATCH_13, ...BATCH_14, ...BATCH_15, ...BATCH_16, ...BATCH_17, ...BATCH_18, ...BATCH_19].filter((engName) => {
      if (seen.has(engName)) return true;
      seen.add(engName);
      return false;
    });
    expect(repeated).toEqual([]);
  });
});

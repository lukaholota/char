import { Ability, Skills } from "@prisma/client";

import { COIN_KEYS, type CoinKey } from "../characterSheetText";

/// Кожна сторінка бланка — одна растрова картинка 1080 px завширшки. Координати полів зняті
/// з її пікселів; `imageTop` — де картинка стоїть на сторінці (pt від верхнього краю).
export const SHEET_2024_TEMPLATE_FILE = "CharacterSheet2024.pdf";
export const SHEET_2024_IMAGE_LEFT = 11;
export const SHEET_2024_PIXEL_SIZE = 573.2755737304688 / 1080;
export const SHEET_2024_PAGE_HEIGHT = 841.8897705078125;

export type PixelRect = { left: number; top: number; right: number; bottom: number };
export type CheckShape = "circle" | "diamond" | "square";

export type TextFieldSpec = {
  kind: "text";
  name: string;
  rect: PixelRect;
  maxFontSize: number;
  multiline?: boolean;
  align?: "left" | "center";
};

export type CheckFieldSpec = { kind: "check"; name: string; rect: PixelRect; shape: CheckShape };

export type SheetFieldSpec = TextFieldSpec | CheckFieldSpec;

export type LabelCorrection = { erase: PixelRect; text: string; left: number; baseline: number; capHeight: number; width: number; bold: boolean };

export type SheetPageSpec = {
  templatePageIndex: number;
  imageTop: number;
  fields: SheetFieldSpec[];
  labelCorrections: LabelCorrection[];
};

export const SPELL_ROWS_PER_PAGE = 38;
export const WEAPON_ROWS = 4;
export const SPELL_SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const EXHAUSTION_BOXES = 6;
export const ABILITIES: Ability[] = [Ability.STR, Ability.DEX, Ability.CON, Ability.INT, Ability.WIS, Ability.CHA];
export const NOTES_BOXES = 6;

export const fieldNames = {
  abilityModifier: (ability: Ability) => `${ability}_modifier`,
  abilityScore: (ability: Ability) => `${ability}_score`,
  save: (ability: Ability) => `${ability}_save`,
  saveProficient: (ability: Ability) => `${ability}_saveProficient`,
  skill: (skill: Skills) => `skill_${skill}`,
  skillProficient: (skill: Skills) => `skill_${skill}_proficient`,
  deathSuccess: (index: number) => `deathSuccess${index}`,
  deathFailure: (index: number) => `deathFailure${index}`,
  exhaustion: (index: number) => `exhaustion${index}`,
  weapon: (row: number, column: "name" | "bonus" | "damage" | "notes") => `weapon${row}_${column}`,
  spellSlots: (level: number) => `spellSlots${level}`,
  spell: (row: number, column: SpellColumn) => `spell${row}_${column}`,
  coin: (coin: CoinKey) => `coin_${coin}`,
  notes: (index: number) => `notes${index}`,
};

export type SpellColumn = "level" | "name" | "castingTime" | "range" | "concentration" | "ritual" | "material" | "notes";

const rect = (left: number, top: number, right: number, bottom: number): PixelRect => ({ left, top, right, bottom });

const text = (name: string, area: PixelRect, maxFontSize: number, options: Pick<TextFieldSpec, "multiline" | "align"> = {}): TextFieldSpec => ({
  kind: "text",
  name,
  rect: area,
  maxFontSize,
  ...options,
});

const centered = (name: string, area: PixelRect, maxFontSize: number) => text(name, area, maxFontSize, { align: "center" });
const block = (name: string, area: PixelRect, maxFontSize = 8) => text(name, area, maxFontSize, { multiline: true });

const check = (name: string, area: PixelRect, shape: CheckShape): CheckFieldSpec => ({ kind: "check", name, rect: area, shape });
const checkAround = (name: string, centerX: number, centerY: number, radius: number, shape: CheckShape) =>
  check(name, rect(centerX - radius, centerY - radius, centerX + radius, centerY + radius), shape);

/// Верхній лівий кут пари «коло модифікатора + рамка значення» на першій сторінці.
const ABILITY_WIDGET_CORNERS: Record<Ability, { left: number; top: number }> = {
  STR: { left: 88, top: 347 },
  DEX: { left: 88, top: 538 },
  CON: { left: 88, top: 778 },
  INT: { left: 277, top: 257 },
  WIS: { left: 277, top: 547 },
  CHA: { left: 277, top: 838 },
};

type ProficiencyRow = { circleTop: number; lineY: number };
type ProficiencyColumn = { circleLeft: number; lineLeft: number; lineRight: number };

const LEFT_COLUMN: ProficiencyColumn = { circleLeft: 66, lineLeft: 84, lineRight: 105 };
const MIDDLE_COLUMN: ProficiencyColumn = { circleLeft: 253, lineLeft: 273, lineRight: 294 };

const SAVE_ROWS: Record<Ability, ProficiencyRow & { column: ProficiencyColumn }> = {
  STR: { column: LEFT_COLUMN, circleTop: 439, lineY: 453 },
  DEX: { column: LEFT_COLUMN, circleTop: 628, lineY: 643 },
  CON: { column: LEFT_COLUMN, circleTop: 868, lineY: 883 },
  INT: { column: MIDDLE_COLUMN, circleTop: 347, lineY: 361 },
  WIS: { column: MIDDLE_COLUMN, circleTop: 637, lineY: 653 },
  CHA: { column: MIDDLE_COLUMN, circleTop: 929, lineY: 943 },
};

const SKILL_ROWS: Record<Skills, ProficiencyRow & { column: ProficiencyColumn }> = {
  ATHLETICS: { column: LEFT_COLUMN, circleTop: 467, lineY: 483 },
  ACROBATICS: { column: LEFT_COLUMN, circleTop: 657, lineY: 673 },
  STEALTH: { column: LEFT_COLUMN, circleTop: 683, lineY: 697 },
  SLEIGHT_OF_HAND: { column: LEFT_COLUMN, circleTop: 708, lineY: 723 },
  HISTORY: { column: MIDDLE_COLUMN, circleTop: 375, lineY: 391 },
  ARCANA: { column: MIDDLE_COLUMN, circleTop: 401, lineY: 416 },
  NATURE: { column: MIDDLE_COLUMN, circleTop: 427, lineY: 441 },
  RELIGION: { column: MIDDLE_COLUMN, circleTop: 451, lineY: 467 },
  INVESTIGATION: { column: MIDDLE_COLUMN, circleTop: 477, lineY: 492 },
  SURVIVAL: { column: MIDDLE_COLUMN, circleTop: 667, lineY: 681 },
  MEDICINE: { column: MIDDLE_COLUMN, circleTop: 691, lineY: 707 },
  ANIMAL_HANDLING: { column: MIDDLE_COLUMN, circleTop: 717, lineY: 733 },
  INSIGHT: { column: MIDDLE_COLUMN, circleTop: 743, lineY: 757 },
  PERCEPTION: { column: MIDDLE_COLUMN, circleTop: 767, lineY: 783 },
  PERFORMANCE: { column: MIDDLE_COLUMN, circleTop: 958, lineY: 973 },
  INTIMIDATION: { column: MIDDLE_COLUMN, circleTop: 983, lineY: 997 },
  DECEPTION: { column: MIDDLE_COLUMN, circleTop: 1009, lineY: 1023 },
  PERSUASION: { column: MIDDLE_COLUMN, circleTop: 1034, lineY: 1049 },
};

const WEAPON_ROW_TOPS = [372, 401, 431, 461];
const WEAPON_COLUMNS = { name: [443, 616], bonus: [624, 686], damage: [694, 829], notes: [837, 1012] } as const;

/// Нижні лінії рядків таблиці заклинань; рядок займає смугу між сусідніми лініями.
const SPELL_ROW_BASELINES = [
  326, 356, 386, 416, 446, 475, 505, 535, 565, 595, 625, 655, 685, 714, 744, 774, 804, 834, 864, 894, 923, 953, 983,
  1013, 1043, 1073, 1101, 1131, 1161, 1191, 1221, 1251, 1281, 1310, 1340, 1370, 1400, 1430,
];
const SPELL_TABLE_TOP = 299;
const SPELL_DIAMOND_CENTERS: Record<"concentration" | "ritual" | "material", number> = { concentration: 419.5, ritual: 462.5, material: 504.5 };

const SLOT_COLUMNS = [
  [293, 403],
  [436, 545],
  [579, 690],
] as const;
const SLOT_ROWS = [
  [152, 171],
  [173, 192],
  [193, 213],
] as const;

const COIN_BOXES: Record<CoinKey, [number, number]> = {
  cp: [725, 779],
  sp: [783, 837],
  ep: [843, 897],
  gp: [901, 955],
  pp: [961, 1016],
};

export const PORTRAIT_AREA = rect(62, 58, 405, 488);

export const MAIN_PAGE: SheetPageSpec = {
  templatePageIndex: 0,
  imageTop: 28.41033935546875,
  fields: [
    ...buildIdentityFields(),
    ...buildVitalsFields(),
    ...buildAbilityFields(),
    ...buildWeaponFields(),
    ...buildTrainingFields(),
    block("classFeaturesLeft", rect(438, 548, 720, 982)),
    block("classFeaturesRight", rect(729, 548, 1017, 982)),
    block("attacksAndSpellcasting", rect(439, 1036, 713, 1452)),
    block("feats", rect(742, 1036, 1017, 1452)),
  ],
  labelCorrections: [
    { erase: rect(67, 78, 168, 90), text: "ІМʼЯ ПЕРСОНАЖА", left: 69, baseline: 88, capHeight: 8, width: 96, bold: false },
    { erase: rect(930, 50, 999, 65), text: "РЯТКИДКИ", left: 931, baseline: 61, capHeight: 9, width: 65, bold: true },
  ],
};

export const MAGIC_PAGE: SheetPageSpec = {
  templatePageIndex: 1,
  imageTop: 33.71844482421875,
  fields: [
    ...buildSpellcastingHeaderFields(),
    ...buildSpellRowFields(),
    ...buildCharacterDetailFields(),
  ],
  labelCorrections: [
    { erase: rect(61, 62, 193, 76), text: "ЧАРОТВОРЧА ЗДІБНІСТЬ", left: 63, baseline: 72, capHeight: 8, width: 128, bold: false },
    { erase: rect(918, 1384, 939, 1396), text: "ЕМ", left: 921, baseline: 1394, capHeight: 8, width: 16, bold: false },
  ],
};

export const DETAILS_PAGE: SheetPageSpec = {
  templatePageIndex: 2,
  imageTop: 31.32977294921875,
  fields: [
    block("alliesAndOrganizations", rect(438, 63, 1016, 488)),
    block("goals", rect(62, 543, 405, 1440)),
    block("additionalFeatures", rect(438, 543, 1016, 964)),
    block("treasure", rect(438, 1018, 1016, 1440)),
  ],
  labelCorrections: [],
};

export const NOTES_PAGE: SheetPageSpec = {
  templatePageIndex: 3,
  imageTop: 34.51470947265625,
  fields: [
    block(fieldNames.notes(1), rect(62, 53, 640, 475)),
    block(fieldNames.notes(2), rect(673, 53, 1016, 475)),
    block(fieldNames.notes(3), rect(62, 529, 640, 951)),
    block(fieldNames.notes(4), rect(673, 529, 1016, 951)),
    block(fieldNames.notes(5), rect(62, 1006, 640, 1428)),
    block(fieldNames.notes(6), rect(673, 1006, 1016, 1428)),
  ],
  labelCorrections: [],
};

function buildIdentityFields(): SheetFieldSpec[] {
  return [
    text("characterName", rect(70, 50, 440, 75), 14),
    text("background", rect(68, 95, 258, 117), 10),
    text("className", rect(268, 95, 436, 117), 10),
    text("species", rect(68, 137, 258, 159), 10),
    text("subclass", rect(268, 137, 452, 159), 10),
    centered("level", rect(460, 72, 525, 102), 16),
    centered("xp", rect(466, 122, 517, 147), 9),
  ];
}

function buildVitalsFields(): SheetFieldSpec[] {
  return [
    centered("armorClass", rect(566, 80, 646, 128), 22),
    check("shield", rect(598, 153, 614, 169), "diamond"),
    centered("hpCurrent", rect(676, 108, 746, 158), 18),
    centered("hpTemp", rect(757, 92, 827, 118), 11),
    centered("hpMax", rect(757, 135, 827, 159), 11),
    centered("hitDiceCurrent", rect(845, 97, 874, 118), 9),
    centered("hitDiceMax", rect(888, 97, 918, 118), 9),
    centered("hitDieType", rect(846, 135, 916, 159), 9),
    ...[944.5, 966.5, 988.5].map((centerX, index) => checkAround(fieldNames.deathSuccess(index + 1), centerX, 109, 7, "diamond")),
    ...[944.5, 966.5, 988.5].map((centerX, index) => checkAround(fieldNames.deathFailure(index + 1), centerX, 148.5, 7, "diamond")),
    centered("proficiencyBonus", rect(118, 256, 164, 294), 18),
    centered("initiative", rect(442, 254, 543, 296), 18),
    centered("speed", rect(574, 254, 677, 296), 12),
    centered("passivePerception", rect(708, 254, 810, 296), 18),
    block("conditions", rect(843, 254, 1015, 296)),
    ...[78, 100, 122, 144, 165, 187].map((left, index) => check(fieldNames.exhaustion(index + 1), rect(left + 1, 941, left + 16, 956), "square")),
    check("heroicInspiration", rect(134, 1030, 149, 1045), "square"),
  ];
}

function buildAbilityFields(): SheetFieldSpec[] {
  return ABILITIES.flatMap((ability) => {
    const { left, top } = ABILITY_WIDGET_CORNERS[ability];
    return [
      centered(fieldNames.abilityModifier(ability), rect(left + 10, top + 18, left + 52, top + 44), 18),
      centered(fieldNames.abilityScore(ability), rect(left + 64, top + 12, left + 112, top + 45), 12),
      ...buildProficiencyRowFields(fieldNames.save(ability), fieldNames.saveProficient(ability), SAVE_ROWS[ability]),
    ];
  }).concat(
    (Object.keys(SKILL_ROWS) as Skills[]).flatMap((skill) =>
      buildProficiencyRowFields(fieldNames.skill(skill), fieldNames.skillProficient(skill), SKILL_ROWS[skill]),
    ),
  );
}

function buildProficiencyRowFields(valueName: string, checkName: string, row: ProficiencyRow & { column: ProficiencyColumn }): SheetFieldSpec[] {
  const { column, circleTop, lineY } = row;
  return [
    centered(valueName, rect(column.lineLeft - 1, lineY - 14, column.lineRight + 1, lineY - 1), 7.5),
    check(checkName, rect(column.circleLeft, circleTop, column.circleLeft + 15, circleTop + 15), "circle"),
  ];
}

function buildWeaponFields(): SheetFieldSpec[] {
  return WEAPON_ROW_TOPS.flatMap((top, index) => {
    const row = index + 1;
    const bottom = top + 27;
    const cell = (column: keyof typeof WEAPON_COLUMNS) => rect(WEAPON_COLUMNS[column][0], top, WEAPON_COLUMNS[column][1], bottom);
    return [
      text(fieldNames.weapon(row, "name"), cell("name"), 9),
      centered(fieldNames.weapon(row, "bonus"), cell("bonus"), 10),
      text(fieldNames.weapon(row, "damage"), cell("damage"), 9),
      text(fieldNames.weapon(row, "notes"), cell("notes"), 8),
    ];
  });
}

function buildTrainingFields(): SheetFieldSpec[] {
  return [
    checkAround("armorTraining_light", 152.5, 1114, 8, "diamond"),
    checkAround("armorTraining_medium", 209.5, 1114, 8, "diamond"),
    checkAround("armorTraining_heavy", 281.5, 1114, 8, "diamond"),
    checkAround("armorTraining_shield", 341.5, 1114, 8, "diamond"),
    checkAround("weaponTraining_simple", 120.5, 1133.5, 8, "diamond"),
    checkAround("weaponTraining_martial", 188.5, 1133.5, 8, "diamond"),
    checkAround("weaponTraining_other", 272.5, 1133.5, 8, "diamond"),
    block("toolsAndLanguages", rect(61, 1166, 409, 1452)),
  ];
}

function buildSpellcastingHeaderFields(): SheetFieldSpec[] {
  return [
    centered("spellcastingAbility", rect(64, 33, 232, 59), 10),
    centered("spellcastingModifier", rect(58, 88, 101, 127), 14),
    centered("spellSaveDc", rect(58, 133, 101, 172), 14),
    centered("spellAttackBonus", rect(58, 178, 101, 217), 14),
    centered("size", rect(262, 53, 355, 86), 9),
    centered("carryingCapacity", rect(375, 53, 468, 86), 9),
    centered("jumpHigh", rect(489, 53, 582, 86), 9),
    centered("jumpLong", rect(603, 53, 695, 86), 9),
    ...SPELL_SLOT_LEVELS.map((level) => {
      const [left, right] = SLOT_COLUMNS[Math.floor((level - 1) / 3)];
      const [top, bottom] = SLOT_ROWS[(level - 1) % 3];
      return text(fieldNames.spellSlots(level), rect(left, top, right, bottom), 9);
    }),
  ];
}

function buildSpellRowFields(): SheetFieldSpec[] {
  return SPELL_ROW_BASELINES.flatMap((baseline, index) => {
    const row = index + 1;
    const top = index === 0 ? SPELL_TABLE_TOP : SPELL_ROW_BASELINES[index - 1] + 2;
    const bottom = baseline - 1;
    const diamondY = baseline - 9.5;
    return [
      centered(fieldNames.spell(row, "level"), rect(59, top, 77, bottom), 8),
      text(fieldNames.spell(row, "name"), rect(84, top, 262, bottom), 8),
      text(fieldNames.spell(row, "castingTime"), rect(271, top, 341, bottom), 7.5),
      text(fieldNames.spell(row, "range"), rect(350, top, 401, bottom), 7.5),
      ...(Object.keys(SPELL_DIAMOND_CENTERS) as Array<keyof typeof SPELL_DIAMOND_CENTERS>).map((column) =>
        checkAround(fieldNames.spell(row, column), SPELL_DIAMOND_CENTERS[column], diamondY, 8, "diamond"),
      ),
      text(fieldNames.spell(row, "notes"), rect(541, top, 688, bottom), 7.5),
    ];
  });
}

function buildCharacterDetailFields(): SheetFieldSpec[] {
  return [
    block("appearance", rect(726, 60, 1016, 160)),
    block("backstory", rect(726, 217, 1016, 582)),
    text("alignment", rect(731, 603, 1012, 625), 9),
    block("equipment", rect(726, 684, 1016, 1290)),
    text("attunement", rect(752, 1305, 1012, 1324), 8),
    ...COIN_KEYS.map((coin) => {
      const [left, right] = COIN_BOXES[coin];
      return centered(fieldNames.coin(coin), rect(left + 4, 1400, right - 4, 1427), 10);
    }),
  ];
}

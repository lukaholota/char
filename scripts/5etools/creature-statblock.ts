import {
  AbilityScores,
  CreatureEdition,
  ParsedCreature,
  StatblockEntry,
} from "../aidedd/creature-schema";
import { findLairSections } from "./legendary-group";
import { stripMarkup } from "./markup";
import { SourceCreature } from "./schema";

/// Читач статблока з пінованого корпусу 5etools у ту саму `ParsedCreature`, якою вже живе
/// конвеєр aidedd. Далі запис перекладає `buildCreatureRecord` — словниковий шар не
/// дублюється. Усе, чого читач не бачив у корпусі, він **валить помилкою**, а не пропускає:
/// мовчазний пропуск — це зниклий шматок правил, і саме так KR16.1 втратив би 32 135 рядків
/// розмітки.
export function readSourceStatblock(creature: SourceCreature, slug: string): ParsedCreature {
  const raw = readObject(creature.raw, creature.nameEng);
  const where = `${creature.nameEng} (${creature.source})`;
  const challenge = readChallenge(raw, where);
  const lair = findLairSections(raw.legendaryGroup, where);

  return {
    slug,
    nameEng: creature.nameEng,
    ruleset: creature.edition,
    size: readSize(raw, where),
    type: readType(raw, where),
    alignment: readAlignment(raw, where),
    ac: readArmorClass(raw, where),
    initiative: readInitiative(raw, challenge.rating, where),
    hp: readHitPoints(raw, where),
    speed: readSpeed(raw, where),
    abilities: readAbilities(raw, where),
    savingThrows: readSavingThrows(raw, where),
    skills: readSkills(raw, where),
    damageVulnerability: readDamageList(raw.vulnerable, "vulnerable", where),
    damageResistance: readDamageList(raw.resist, "resist", where),
    damageImmunity: readDamageList(raw.immune, "immune", where),
    conditionImmunity: readDamageList(raw.conditionImmune, "conditionImmune", where),
    gear: readGear(raw, where),
    senses: readSenses(raw, where),
    languages: readLanguages(raw, where),
    challenge: challenge.rating,
    xp: findChallengeExperience(challenge, where),
    xpInLair: challenge.inLair === "" ? "" : String(findExperienceByChallenge(challenge.inLair, where)),
    proficiencyBonus: findProficiencyBonusByChallenge(challenge.rating, where),
    traits: readSections(raw, "trait", where),
    actions: readSections(raw, "action", where),
    bonusActions: readSections(raw, "bonus", where),
    reactions: readSections(raw, "reaction", where),
    legendaryActions: readSections(raw, "legendary", where),
    legendaryActionUses: "",
    lairInfo: lair?.lairInfo ?? "",
    lairActions: lair?.lairActions ?? [],
    regionEffects: lair?.regionEffects ?? [],
    mythicInfo: readMythicHeader(raw, where),
    mythicActions: readSections(raw, "mythic", where),
    habitat: "",
    treasure: "",
    description: "",
    source: findSourceKeyByBookCode(creature.source),
    imageUrl: "",
  };
}

/// Коди книг корпусу проти значень enum `Source`. Ключ enum не завжди дорівнює коду 5etools:
/// проєкт завів свої значення раніше, ніж прийшло це джерело. Невідомий код — помилка, бо
/// саме мовчазна підміна книги вже коштувала KR17.3 падіння сіду на `P2007`.
const SOURCE_KEYS: Record<string, string> = {
  MM: "MM",
  MPMM: "MPMM",
  FTD: "FTOD",
  BGG: "BPGOTG",
  BGDIA: "BGDIA",
  IDRotF: "IDROTF",
  DSotDQ: "DRAGONLANCE",
  CoA: "CHAINS_OF_ASMODEUS",
  ToA: "TOA",
  PotA: "POTA",
  CM: "CM",
  WDMM: "WDMM",
  WDH: "WDH",
  SKT: "SKT",
  CoS: "COS",
  QftIS: "QFTIS",
  WBtW: "WBTW",
  XMM: "MM_2024",
  XPHB: "PHB_2024",
  FRAiF: "FRAiF",
  RHW: "RHW",
};

export function findSourceKeyByBookCode(code: string): string {
  const key = SOURCE_KEYS[code];
  if (!key) throw new Error(`Книга «${code}» не має значення в enum Source`);
  return key;
}

const SIZE_NAMES: Record<string, string> = {
  T: "Tiny",
  S: "Small",
  M: "Medium",
  L: "Large",
  H: "Huge",
  G: "Gargantuan",
};

function readSize(raw: Record<string, unknown>, where: string): string {
  return readStringList(raw.size, `${where} › size`)
    .map((code) => {
      const name = SIZE_NAMES[code];
      if (!name) throw new Error(`${where}: невідомий код розміру «${code}»`);
      return name;
    })
    .join(" or ");
}

function readType(raw: Record<string, unknown>, where: string): string {
  if (typeof raw.type === "string") return raw.type;
  const node = readObject(raw.type, `${where} › type`);
  const base = readString(node, "type", `${where} › type`);
  const tags = readTypeTags(node.tags, `${where} › type.tags`);
  return tags.length === 0 ? base : `${base} (${tags.join(", ")})`;
}

/// `{"tag":"elf","prefix":"Drow","prefixHidden":true}` — 5etools ховає префікс у показі, тобто
/// в дужках лишається сам тег. Видимий префікс лишається частиною тега.
function readTypeTags(value: unknown, where: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${where}: очікували масив`);

  return value.map((tag, index) => {
    if (typeof tag === "string") return tag;
    const node = readObject(tag, `${where}[${index}]`);
    const name = readString(node, "tag", `${where}[${index}]`);
    return node.prefixHidden === true ? name : `${readString(node, "prefix", `${where}[${index}]`)} ${name}`;
  });
}

const ALIGNMENT_WORDS: Record<string, string> = {
  L: "Lawful",
  C: "Chaotic",
  N: "Neutral",
  G: "Good",
  E: "Evil",
  U: "Unaligned",
  A: "Any alignment",
};

function readAlignment(raw: Record<string, unknown>, where: string): string {
  if (raw.alignment === undefined) return "";

  const words = readStringList(raw.alignment, `${where} › alignment`).map((code) => {
    const word = ALIGNMENT_WORDS[code];
    if (!word) throw new Error(`${where}: невідомий код світогляду «${code}»`);
    return word;
  });

  const prefix = raw.alignmentPrefix === undefined ? "" : readStringValue(raw.alignmentPrefix, `${where} › alignmentPrefix`);
  return `${prefix}${words.join(" ")}`.trim();
}

function readArmorClass(raw: Record<string, unknown>, where: string): string {
  const entries = raw.ac;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`${where}: статблок без класу захисту`);
  }

  return entries.map((entry, index) => readArmorClassEntry(entry, `${where} › ac[${index}]`)).join(", ");
}

function readArmorClassEntry(entry: unknown, where: string): string {
  if (typeof entry === "number") return String(entry);

  const node = readObject(entry, where);
  if (typeof node.special === "string") return stripMarkup(node.special, where);

  const value = readNumber(node, "ac", where);
  const from = readStringList(node.from ?? [], `${where} › from`).map((item) => stripMarkup(item, where));
  const condition = node.condition === undefined ? "" : stripMarkup(readStringValue(node.condition, where), where);
  const descriptor = [...from, condition].filter((part) => part !== "").join(", ");

  return descriptor === "" ? String(value) : `${value} (${descriptor})`;
}

/// Ініціативу друкує лише статблок 2024, але саме поле трапляється й у книгах 2014: там воно
/// несе машинний дубль риси («Ambusher» у `Star Spawn Mangler` дає перевагу на ініціативу).
/// Правило зняте з `Renderer.monster.getInitiativeBonusNumber` у `js/render.js` пінованої
/// ревізії, а не вгадане: корпус подає чотири форми, і бонус рахується для кожної по-своєму.
/// `advantageMode` у бонус не входить — воно міняє лише пасивне значення (+5/−5);
/// `proficiency` множиться на бонус майстерності з показника небезпеки. Пасивне значення
/// статблок 2024 таки друкує другим числом, і партія 18 почала його показувати — див.
/// `formatInitiative`.
const INITIATIVE_KEYS = ["initiative", "proficiency", "advantageMode"];

function readInitiative(raw: Record<string, unknown>, challenge: string, where: string): string {
  if (raw.initiative === undefined) return "";
  const at = `${where} › initiative`;
  return formatInitiative(readInitiativeBonus(raw, challenge, at), readAdvantageShift(raw, at));
}

/// Статблок 2024 друкує ініціативу двома числами — «Initiative +7 (17)», — і саме так її
/// показують **491** запис каталогу 2024. Партія 18 привезла перші записи з 5etools, і доти
/// читач віддавав саму половину («+7»), тобто на сторінці поруч стояли б дві різні форми.
/// Правило пасивного значення звірене з живим каталогом, а не виведене: 182 записи, у яких
/// корпус і каталог описують ту саму істоту, дали `пасивна = 10 + бонус` без жодного розходу.
/// Зсув ±5 за перевагою чинний для двох записів 2014 з `advantageMode`; другим джерелом він
/// не звірений — у каталозі таких записів немає.
function formatInitiative(bonus: number, advantageShift: number): string {
  return `${formatSignedBonus(bonus)} (${10 + bonus + advantageShift})`;
}

function readAdvantageShift(raw: Record<string, unknown>, at: string): number {
  const node = typeof raw.initiative === "object" && raw.initiative !== null ? readObject(raw.initiative, at) : {};
  if (node.advantageMode === "adv") return 5;
  if (node.advantageMode === "dis") return -5;
  return 0;
}

function readInitiativeBonus(raw: Record<string, unknown>, challenge: string, at: string): number {
  if (typeof raw.initiative === "number") return raw.initiative;

  const node = readObject(raw.initiative, at);
  const unknown = Object.keys(node).filter((key) => !INITIATIVE_KEYS.includes(key));
  if (unknown.length > 0) throw new Error(`${at}: незнані ключі ${unknown.join(", ")}`);

  if (node.initiative !== undefined) return readNumber(node, "initiative", at);

  const dexterity = Math.floor((readNumber(raw, "dex", at) - 10) / 2);
  if (node.proficiency === undefined) return dexterity;

  const proficiency = readNumber(node, "proficiency", at);
  const bonus = Number(findProficiencyBonusByChallenge(challenge, at).slice(1));
  return dexterity + proficiency * bonus;
}

function formatSignedBonus(bonus: number): string {
  return bonus >= 0 ? `+${bonus}` : String(bonus);
}

function readHitPoints(raw: Record<string, unknown>, where: string): string {
  const node = readObject(raw.hp, `${where} › hp`);
  if (typeof node.special === "string") return stripMarkup(node.special, where);

  const average = readNumber(node, "average", `${where} › hp`);
  const formula = readString(node, "formula", `${where} › hp`);
  return `${average} (${formula})`;
}

const SPEED_MODES = ["walk", "burrow", "climb", "fly", "swim"] as const;

function readSpeed(raw: Record<string, unknown>, where: string): string {
  const node = readObject(raw.speed, `${where} › speed`);
  const unknown = Object.keys(node).filter(
    (key) => !SPEED_MODES.includes(key as (typeof SPEED_MODES)[number]) && key !== "canHover"
  );
  if (unknown.length > 0) throw new Error(`${where}: невідомі режими руху ${unknown.join(", ")}`);

  return SPEED_MODES.filter((mode) => node[mode] !== undefined)
    .map((mode) => readSpeedSegment(mode, node[mode], `${where} › speed.${mode}`))
    .join(", ");
}

function readSpeedSegment(mode: string, value: unknown, where: string): string {
  const label = mode === "walk" ? "" : `${mode} `;
  if (typeof value === "number") return `${label}${value} ft.`;

  const node = readObject(value, where);
  const distance = readNumber(node, "number", where);
  const condition = node.condition === undefined ? "" : ` ${readStringValue(node.condition, where)}`;
  return `${label}${distance} ft.${condition}`;
}

const ABILITY_CODES = ["str", "dex", "con", "int", "wis", "cha"] as const;

function readAbilities(raw: Record<string, unknown>, where: string): AbilityScores {
  const saves = readObject(raw.save ?? {}, `${where} › save`);

  const entries = ABILITY_CODES.map((code) => {
    const score = readNumber(raw, code, where);
    const modifier = Math.floor((score - 10) / 2);
    const save = saves[code] === undefined ? modifier : Number(readStringValue(saves[code], `${where} › save.${code}`));
    return [code, { score, modifier, save }] as const;
  });

  const by = Object.fromEntries(entries);
  return {
    strength: by.str,
    dexterity: by.dex,
    constitution: by.con,
    intelligence: by.int,
    wisdom: by.wis,
    charisma: by.cha,
  };
}

function readSavingThrows(raw: Record<string, unknown>, where: string): string {
  if (raw.save === undefined) return "";
  const node = readObject(raw.save, `${where} › save`);

  return ABILITY_CODES.filter((code) => node[code] !== undefined)
    .map((code) => `${code} ${readStringValue(node[code], `${where} › save.${code}`)}`)
    .join(", ");
}

function readSkills(raw: Record<string, unknown>, where: string): string {
  if (raw.skill === undefined) return "";
  const node = readObject(raw.skill, `${where} › skill`);

  return Object.entries(node)
    .filter(([name]) => name !== "other")
    .map(([name, bonus]) => `${name} ${readStringValue(bonus, `${where} › skill.${name}`)}`)
    .join(", ");
}

/// Прості списки («cold, fire») читаються самі. Умовні («…while in dim light») лишаються
/// англійським рядком: словникового терміна для них немає, тому переклад мусить прийти
/// полем-заміною в партії — і це видно в файлі, а не ховається в коді.
function readDamageList(value: unknown, field: string, where: string): string {
  if (value === undefined) return "";
  if (!Array.isArray(value)) throw new Error(`${where} › ${field}: очікували масив`);

  return value
    .map((entry, index) => {
      if (typeof entry === "string") return entry;
      const node = readObject(entry, `${where} › ${field}[${index}]`);
      const inner = node[field] ?? node.special;
      const list = Array.isArray(inner)
        ? readStringList(inner, `${where} › ${field}[${index}]`).join(", ")
        : readStringValue(inner, `${where} › ${field}[${index}]`);
      const note = node.note === undefined ? "" : ` ${readStringValue(node.note, `${where} › ${field}[${index}]`)}`;
      return `${list}${note}`;
    })
    .join(", ");
}

function readGear(raw: Record<string, unknown>, where: string): string {
  if (raw.gear === undefined) return "";

  return readGearList(raw.gear, `${where} › gear`)
    .map((item) => stripMarkup(item, where))
    .join(", ");
}

/// Ключі вузла спорядження — рівно ці три; невідомий валить читач, а не зникає мовчки. Той
/// самий припис, що для ключів показника небезпеки: саме мовчазний пропуск ключа коштував
/// партії 7 показника небезпеки `Bheur Hag`.
const GEAR_KEYS = new Set(["item", "quantity", "displayName"]);

function readGearList(value: unknown, where: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${where}: очікували масив`);

  return value.map((item, index) => {
    if (typeof item === "string") return findGearName(item);
    const node = readObject(item, `${where}[${index}]`);
    const unknown = Object.keys(node).filter((key) => !GEAR_KEYS.has(key));
    if (unknown.length > 0) throw new Error(`${where}[${index}]: невідомі ключі спорядження: ${unknown.join(", ")}`);

    const name =
      node.displayName === undefined
        ? findGearName(readString(node, "item", `${where}[${index}]`))
        : readString(node, "displayName", `${where}[${index}]`);
    const quantity = node.quantity === undefined ? "" : ` (${readNumber(node, "quantity", `${where}[${index}]`)})`;
    return `${name}${quantity}`;
  });
}

/// Корпус пише спорядження посиланням на предмет — `chain shirt|xphb`, — і книга в суфіксі не
/// є частиною назви. Правило те саме, яким гейт знімає книгу з `{@spell fireball|phb}`.
/// У 2014-х книгах поля `gear` немає взагалі, тож ця гілка вперше жива на партії 2024.
function findGearName(reference: string): string {
  return reference.split("|")[0];
}

function readSenses(raw: Record<string, unknown>, where: string): string {
  const senses = raw.senses === undefined ? [] : readStringList(raw.senses, `${where} › senses`);
  const passive = raw.passive === undefined ? "" : `Passive Perception ${readPassive(raw.passive, where)}`;
  return [...senses, passive].filter((part) => part !== "").join(", ");
}

function readPassive(value: unknown, where: string): string {
  if (typeof value === "number") return String(value);
  return stripMarkup(readStringValue(value, `${where} › passive`), where);
}

function readLanguages(raw: Record<string, unknown>, where: string): string {
  if (raw.languages === undefined) return "";
  return readStringList(raw.languages, `${where} › languages`)
    .map((language) => stripMarkup(language, where))
    .join(", ");
}

type Challenge = { rating: string; experience: string; inLair: string; inCoven: string };

/// Ключі обʼєкта `cr`, зняті з `Renderer.monster._getChallengeRatingPart_classic` пінованої
/// ревізії: базовий показник у `cr`, `xp` **перекриває** таблицю досвіду, а `lair` і `coven`
/// додають до надрукованого рядка окремі речення. Невідомий ключ — помилка, бо мовчазний
/// пропуск тут дає користувачеві неправильне число: партія 6 знайшла рівно це в `initiative`.
const CHALLENGE_KEYS = new Set(["cr", "xp", "lair", "xpLair", "coven", "xpCoven"]);

const EMPTY_CHALLENGE: Challenge = { rating: "", experience: "", inLair: "", inCoven: "" };

function readChallenge(raw: Record<string, unknown>, where: string): Challenge {
  const value = raw.cr;
  if (value === undefined) return EMPTY_CHALLENGE;
  if (typeof value === "string" || typeof value === "number") {
    return { ...EMPTY_CHALLENGE, rating: String(value) };
  }

  const node = readObject(value, `${where} › cr`);
  const unknown = Object.keys(node).filter((key) => !CHALLENGE_KEYS.has(key));
  if (unknown.length > 0) {
    throw new Error(`${where} › cr: невідомі ключі показника небезпеки: ${unknown.join(", ")}`);
  }

  return {
    rating: String(node.cr ?? ""),
    experience: node.xp === undefined ? "" : String(node.xp),
    inLair: node.lair === undefined ? "" : String(node.lair),
    inCoven: node.coven === undefined ? "" : String(node.coven),
  };
}

/// Базовий досвід: явне `cr.xp` перекриває таблицю, бо саме так робить їхній рендерер
/// (`xp ??= Parser.crToXpNumber(cr)`). У пінованому корпусі так подані 10 записів, і жодного
/// з них немає серед відкладених — тобто вимір поки порожній, але правило стоїть за джерелом.
function findChallengeExperience(challenge: Challenge, where: string): string {
  if (challenge.rating === "") return "";
  if (challenge.experience !== "") return challenge.experience;
  return String(findExperienceByChallenge(challenge.rating, where));
}

/// Корпус 5etools не подає очок досвіду взагалі — їх рахує його ж рендерер за показником
/// небезпеки. Таблиця звірена з 1 201 записом наших каталогів
/// (`tests/content/5etools-creatures.test.ts`), а не переписана з памʼяті.
const EXPERIENCE_BY_CHALLENGE: Record<string, number> = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000,
};

export function findExperienceByChallenge(challenge: string, where = ""): number {
  const experience = EXPERIENCE_BY_CHALLENGE[challenge];
  if (experience === undefined) throw new Error(`${where}: немає очок досвіду для ПС «${challenge}»`);
  return experience;
}

export function findProficiencyBonusByChallenge(challenge: string, where = ""): string {
  if (challenge === "") return "";
  const rating = readChallengeNumber(challenge, where);
  return `+${Math.max(2, 2 + Math.floor((rating - 1) / 4))}`;
}

function readChallengeNumber(challenge: string, where: string): number {
  const fraction = /^(\d+)\/(\d+)$/.exec(challenge);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const rating = Number(challenge);
  if (!Number.isFinite(rating)) throw new Error(`${where}: незрозумілий показник небезпеки «${challenge}»`);
  return rating;
}

const SECTION_OF_SPELLCASTING: Record<string, string> = {
  trait: "trait",
  action: "action",
  bonus: "bonus",
  reaction: "reaction",
};

/// `mythicHeader` — умова, за якої міфічні дії вмикаються («якщо риса спрацювала за останню
/// годину…»). Рендерер пінованої ревізії друкує її над секцією звичайним абзацом, тож вона
/// їде окремим рядком, а не приклеюється до першої дії.
function readMythicHeader(raw: Record<string, unknown>, where: string): string {
  const value = raw.mythicHeader;
  if (value === undefined) return "";
  if (!Array.isArray(value)) throw new Error(`${where} › mythicHeader: очікували масив`);
  return value.map((node, index) => readEntryText(node, `${where} › mythicHeader[${index}]`)).join("\n\n");
}

function readSections(raw: Record<string, unknown>, key: string, where: string): StatblockEntry[] {
  const own = readSectionEntries(raw[key], `${where} › ${key}`);
  const casting = readSpellcasting(raw, where).filter((entry) => entry.section === key);
  return [...own, ...casting.map(({ name, text }) => ({ name, text }))];
}

function readSectionEntries(value: unknown, where: string): StatblockEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${where}: очікували масив`);

  return value.map((entry, index) => {
    const node = readObject(entry, `${where}[${index}]`);
    return {
      name: stripMarkup(readString(node, "name", `${where}[${index}]`), where),
      text: readEntryText(node.entries, `${where}[${index}] › entries`),
    };
  });
}

/// Вкладені вузли тексту. Кожен невідомий `type` — помилка: 5etools ховає в них і списки
/// варіантів атаки, і таблиці, а тихо пропущений вузол — це зниклий абзац правил.
function readEntryText(value: unknown, where: string): string {
  if (value === undefined) return "";
  if (typeof value === "string") return stripMarkup(value, where);
  if (Array.isArray(value)) {
    return value
      .map((item, index) => readEntryText(item, `${where}[${index}]`))
      .filter((part) => part !== "")
      .join(" ");
  }

  const node = readObject(value, where);
  const type = node.type === undefined ? "entries" : readStringValue(node.type, where);

  if (type === "list") return readEntryText(node.items, `${where} › items`);
  if (type === "item" || type === "itemSub" || type === "entries") {
    const name = node.name === undefined ? "" : `${stripMarkup(readStringValue(node.name, where), where)}. `;
    const body = readEntryText(node.entries ?? node.entry, `${where} › entries`);
    return `${name}${body}`.trim();
  }

  throw new Error(`${where}: невідомий вузол тексту «${type}»`);
}

/// Заклинання статблока: 5etools тримає їх окремим блоком і сам вирішує, у якій секції
/// показати (`displayAs`). Списки, названі в `hidden`, їхній рендерер не друкує — ми теж,
/// інакше в тексті зʼявиться те, чого немає в книзі.
const SPELL_LIST_LABELS: Array<[string, (key: string) => string]> = [
  ["constant", () => "Constant"],
  ["will", () => "At will"],
  ["rest", (key) => `${key}/rest each`],
  ["daily", (key) => (key.endsWith("e") ? `${key.slice(0, -1)}/day each` : `${key}/day`)],
  ["weekly", (key) => `${key}/week each`],
  ["monthly", (key) => `${key}/month each`],
  ["yearly", (key) => `${key}/year each`],
];

type CastingEntry = { section: string; name: string; text: string };

function readSpellcasting(raw: Record<string, unknown>, where: string): CastingEntry[] {
  if (raw.spellcasting === undefined) return [];
  if (!Array.isArray(raw.spellcasting)) throw new Error(`${where} › spellcasting: очікували масив`);

  return raw.spellcasting.map((entry, index) => {
    const node = readObject(entry, `${where} › spellcasting[${index}]`);
    const spot = `${where} › spellcasting[${index}]`;
    const displayAs = node.displayAs === undefined ? "trait" : readStringValue(node.displayAs, spot);
    const section = SECTION_OF_SPELLCASTING[displayAs];
    if (!section) throw new Error(`${spot}: невідоме місце показу «${displayAs}»`);

    return {
      section,
      name: stripMarkup(readString(node, "name", spot), spot),
      text: readCastingText(node, spot),
    };
  });
}

function readCastingText(node: Record<string, unknown>, where: string): string {
  const hidden = node.hidden === undefined ? [] : readStringList(node.hidden, `${where} › hidden`);
  const header = readEntryText(node.headerEntries, `${where} › headerEntries`);
  const footer = readEntryText(node.footerEntries, `${where} › footerEntries`);

  const lists = SPELL_LIST_LABELS.filter(([key]) => node[key] !== undefined && !hidden.includes(key)).map(
    ([key, label]) => readCastingList(node[key], label, `${where} › ${key}`)
  );
  const levelled = node.spells === undefined || hidden.includes("spells") ? "" : readLevelledSpells(node.spells, `${where} › spells`);

  return [header, ...lists, levelled, footer].filter((part) => part !== "").join(" ");
}

function readCastingList(value: unknown, label: (key: string) => string, where: string): string {
  if (Array.isArray(value)) {
    return `${label("")}: ${readSpellNames(value, where)}`.replace(/^: /, "");
  }

  const node = readObject(value, where);
  return Object.entries(node)
    .map(([key, spells]) => `${label(key)}: ${readSpellNames(spells, `${where}.${key}`)}`)
    .join(" ");
}

function readLevelledSpells(value: unknown, where: string): string {
  const node = readObject(value, where);

  return Object.entries(node)
    .map(([level, body]) => {
      const record = readObject(body, `${where}.${level}`);
      const slots = record.slots === undefined ? "" : ` (${readNumber(record, "slots", `${where}.${level}`)} slots)`;
      return `${level === "0" ? "Cantrips" : `Level ${level}`}${slots}: ${readSpellNames(record.spells, `${where}.${level}`)}`;
    })
    .join(" ");
}

function readSpellNames(value: unknown, where: string): string {
  return readVisibleSpells(value, where)
    .map((spell) => stripMarkup(spell, where))
    .join(", ");
}

/// Окреме заклинання буває обʼєктом `{entry, hidden}`, а не рядком — 11 разів у корпусі, у
/// 7 істот. Правило зняте з їхнього рендерера (`_renderSpellcasting_getRenderableList`):
/// `spellList.filter(it => !it.hidden).map(it => it.entry || it)`. Це той самий припис, що
/// вже діє для списків цілком, лише на рівень глибше.
function readVisibleSpells(value: unknown, where: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${where}: очікували масив`);

  return value.flatMap((item, index) => {
    const spot = `${where}[${index}]`;
    if (typeof item === "string") return [item];
    const node = readObject(item, spot);
    return isHiddenSpell(node, spot) ? [] : [readString(node, "entry", spot)];
  });
}

function isHiddenSpell(node: Record<string, unknown>, where: string): boolean {
  if (node.hidden === undefined) return false;
  if (typeof node.hidden !== "boolean") throw new Error(`${where}: поле «hidden» має бути булевим`);
  return node.hidden;
}

function readObject(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${where}: очікували обʼєкт`);
  }
  return value as Record<string, unknown>;
}

function readString(node: Record<string, unknown>, field: string, where: string): string {
  const value = node[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${where}: поле «${field}» має бути непорожнім рядком`);
  }
  return value;
}

function readStringValue(value: unknown, where: string): string {
  if (typeof value !== "string") throw new Error(`${where}: очікували рядок`);
  return value;
}

function readNumber(node: Record<string, unknown>, field: string, where: string): number {
  const value = node[field];
  if (typeof value !== "number") throw new Error(`${where}: поле «${field}» має бути числом`);
  return value;
}

function readStringList(value: unknown, where: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${where}: очікували масив`);
  return value.map((item, index) => readStringValue(item, `${where}[${index}]`));
}

export type { CreatureEdition };

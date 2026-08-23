import { GeneratedCreature } from "../generate-creatures";
import { createCreature } from "../data/creature-builder";
import { ABILITY_KEYS, ParsedCreature, StatblockEntry } from "./creature-schema";
import { collapseSpaces } from "./statblock-fields";
import dictionaryFile from "../../src/lib/refs/dictionary.json";
import {
  LanguageTranslations,
  armorTranslations,
  toolTranslations,
  weaponTranslations,
} from "../../src/lib/refs/translation";

const DICTIONARY = dictionaryFile.DND_DICTIONARY;

/// Fields whose English value is prose, not a list of glossary terms. The translator fills them
/// in by hand; everything else is resolved from the dictionary and fails loudly when it cannot be.
export type TranslatedFields = {
  ac?: string;
  hp?: string;
  speed?: string;
  skills?: string;
  senses?: string;
  languages?: string;
  gear?: string;
  conditionImmunity?: string;
  damageResistance?: string;
  damageVulnerability?: string;
  damageImmunity?: string;
};

export type CreatureTranslation = {
  slug: string;
  name: string;
  description: string;
  traits?: StatblockEntry[];
  actions?: StatblockEntry[];
  bonusActions?: StatblockEntry[];
  reactions?: StatblockEntry[];
  legendaryActions?: StatblockEntry[];
  fields?: TranslatedFields;
};

const SECTION_KEYS = [
  "traits",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
] as const;

export function buildCreatureRecord(
  parsed: ParsedCreature,
  translation: CreatureTranslation,
  creatureId: number
): GeneratedCreature {
  assertSectionsAlign(parsed, translation);
  const fields = translation.fields ?? {};

  return createCreature(
    creatureId,
    translation.name,
    parsed.nameEng,
    translateSize(parsed.size),
    translateType(parsed.type),
    translateAlignment(parsed.alignment),
    findSourceKey(parsed),
    fields.ac ?? translateAc(parsed.ac),
    fields.hp ?? translateDiceNotation(parsed.hp),
    fields.speed ?? translateSpeed(parsed.speed),
    readAbilityScores(parsed),
    isUnstated(parsed.challenge) ? UNSTATED : parsed.challenge,
    formatExperience(parsed),
    {
      ruleset: parsed.ruleset,
      initiative: parsed.initiative,
      savingThrows: translateSavingThrows(parsed.savingThrows),
      skills: fields.skills ?? translateSkills(parsed.skills),
      damageVulnerability: fields.damageVulnerability ?? translateDamageTypes(parsed.damageVulnerability),
      damageResistance: fields.damageResistance ?? translateDamageTypes(parsed.damageResistance),
      damageImmunity: fields.damageImmunity ?? translateDamageTypes(parsed.damageImmunity),
      conditionImmunity: fields.conditionImmunity ?? translateConditions(parsed.conditionImmunity),
      gear: fields.gear ?? translateGear(parsed.gear),
      senses: fields.senses ?? translateSenses(parsed.senses),
      languages: fields.languages ?? translateLanguages(parsed.languages),
      proficiencyBonus: parsed.proficiencyBonus,
      specialAbilities: buildSectionHtml(translation.traits),
      actions: buildSectionHtml(translation.actions),
      bonusActions: buildSectionHtml(translation.bonusActions),
      reactions: buildSectionHtml(translation.reactions),
      legendaryActions: buildSectionHtml(translation.legendaryActions),
      description: buildDescriptionHtml(translation.description),
    }
  );
}

function assertSectionsAlign(parsed: ParsedCreature, translation: CreatureTranslation): void {
  if (translation.slug !== parsed.slug) {
    throw new Error(`Переклад «${translation.slug}» не збігається зі статблоком «${parsed.slug}»`);
  }

  for (const key of SECTION_KEYS) {
    const source = parsed[key];
    const translated = translation[key] ?? [];
    if (source.length !== translated.length) {
      throw new Error(
        `${parsed.slug}: у секції ${key} ${source.length} записів у джерелі і ${translated.length} у перекладі`
      );
    }
  }

  if (translation.name.trim() === "") {
    throw new Error(`${parsed.slug}: порожня українська назва`);
  }
}

/// 2014 pages fold the armour worn into the AC field itself ("16 (breastplate)"); 2024 never hits
/// this branch because its statblocks list gear separately and AC is always a bare number.
const ARMOR_NOUN_KEYS = new Set(["BREASTPLATE", "CHAIN_MAIL", "CHAIN_SHIRT", "HALF_PLATE", "PLATE", "SHIELD"]);

function translateAc(ac: string): string {
  const withMageArmor = /^(\d+)\s*\((\d+)\s+with\s+mage armor\)$/i.exec(ac.trim());
  if (withMageArmor) return `${withMageArmor[1]} (${withMageArmor[2]} із заклинанням «Обладунок мага»)`;

  const match = /^(\d+)\s*\(([^)]+)\)$/.exec(ac.trim());
  if (!match) return ac;
  return `${match[1]} (${translateAcDescriptor(match[2])})`;
}

function translateAcDescriptor(descriptor: string): string {
  return splitList(descriptor)
    .map((item) => translateArmorPiece(item))
    .join(", ");
}

function translateArmorPiece(item: string): string {
  if (/^natural armor$/i.test(item.trim())) return "природний обладунок";
  if (/^armor scraps$/i.test(item.trim())) return "обривки обладунку";

  const key = buildEquipmentKeys(item).find(
    (candidate) => (armorTranslations as Record<string, string>)[candidate]
  );
  if (!key) throw new Error(`Опис КЗ поза словником: «${item}»`);

  const term = (armorTranslations as Record<string, string>)[key];
  const lower = term.charAt(0).toLocaleLowerCase("uk") + term.slice(1);
  return ARMOR_NOUN_KEYS.has(key) ? lower : `${lower} обладунок`;
}

function translateSize(size: string): string {
  return size
    .split(/\s+or\s+/i)
    .map((word) => findTerm(DICTIONARY.creatureSizes, word, `розмір «${word}»`))
    .join(" або ");
}

function translateType(type: string): string {
  const match = /^([^(]+)(?:\(([^)]*)\))?$/.exec(collapseSpaces(type));
  if (!match) throw new Error(`Незрозумілий рядок типу: «${type}»`);

  const base = match[1]
    .split(/\s+or\s+/i)
    .map((word) => findTerm(DICTIONARY.creatureTypes, word, `тип істоти «${word}»`))
    .join(" або ");
  if (!match[2]) return base;

  const tags = splitList(match[2])
    .map((tag) => findTerm(DICTIONARY.creatureTypeTags, tag, `тег типу «${tag}»`))
    .join(", ");
  return `${base} (${tags})`;
}

/// 2014 statblocks often qualify the base alignment ("typically Neutral Evil"). The qualifier is
/// a plain adverb, not game vocabulary — it doesn't need its own dictionary entry.
function translateAlignment(alignment: string): string {
  if (isUnstated(alignment)) return UNSTATED;

  const qualified = /^(?:typically|usually)\s+(.+)$/i.exec(alignment);
  if (qualified) return `зазвичай ${findTerm(DICTIONARY.alignments, qualified[1], `світогляд «${qualified[1]}»`).toLocaleLowerCase("uk")}`;
  if (/\bor\b/i.test(alignment)) return translateWeightedAlignment(alignment);
  return findTerm(DICTIONARY.alignments, alignment, `світогляд «${alignment}»`);
}

/// Cloud giants and empyreans split their alignment by probability ("neutral good (50 %) or
/// neutral evil (50 %)"). The share is a number, not vocabulary, so only the alignments around it
/// go through the dictionary.
function translateWeightedAlignment(alignment: string): string {
  return alignment
    .split(/\s+or\s+/i)
    .map((part) => {
      const share = /^(.*?)\s*\((\d+\s*%)\)$/.exec(part.trim());
      const name = findTerm(
        DICTIONARY.alignments,
        share ? share[1] : part.trim(),
        `світогляд «${part.trim()}»`
      );
      return share ? `${name} (${share[2]})` : name;
    })
    .map((part, index) => (index === 0 ? part : part.charAt(0).toLocaleLowerCase("uk") + part.slice(1)))
    .join(" або ");
}

/// Summon and scaling-NPC statblocks (Tasha's spirits, Essentials Kit warrior/spellcaster) print
/// a dash where a monster prints an alignment and a challenge rating, and give no XP at all.
/// Owner decision 2026-08-19: import them, render the dash, leave the experience empty.
const UNSTATED = "—";

function isUnstated(value: string): boolean {
  const trimmed = collapseSpaces(value);
  return trimmed === "" || trimmed === "-" || trimmed === UNSTATED;
}

function translateSpeed(speed: string): string {
  return splitList(speed).map(translateSpeedSegment).join(", ");
}

function translateSpeedSegment(segment: string): string {
  const hovering = /^(.*?)\s*\(hover\)$/i.exec(segment.trim());
  if (hovering) {
    const term = DICTIONARY.rules2024.movementModes.hover.toLocaleLowerCase("uk");
    return `${translateSpeedSegment(hovering[1])} (${term})`;
  }

  const mode = /^([A-Za-z]+)\s+(.+)$/.exec(segment.trim());
  if (!mode) return translateDistance(segment);
  const term = findTerm(DICTIONARY.rules2024.movementModes, mode[1], `режим руху «${mode[1]}»`);
  return `${term.toLocaleLowerCase("uk")} ${translateDistance(mode[2])}`;
}

function translateSenses(senses: string): string {
  return splitList(senses)
    .map((segment) => {
      const passive = /^Passive Perception\s+(\d+)$/i.exec(segment.trim());
      if (passive) return `${DICTIONARY.rules2024.sensesTerms.passivePerception} ${passive[1]}`;

      const sense = /^([A-Za-z]+)\s+(.+)$/.exec(segment.trim());
      if (!sense) throw new Error(`Незрозуміле чуття: «${segment}»`);
      const term = findTerm(DICTIONARY.environments, sense[1], `чуття «${sense[1]}»`);
      return `${term} ${translateDistance(sense[2])}`;
    })
    .join(", ");
}

function translateSkills(skills: string): string {
  return splitList(skills)
    .map((segment) => {
      const skill = /^(.+?)\s*([+-]\d+)$/.exec(segment.trim());
      if (!skill) throw new Error(`Незрозуміла навичка: «${segment}»`);
      return `${findTerm(DICTIONARY.skills, skill[1], `навичка «${skill[1]}»`)} ${skill[2]}`;
    })
    .join(", ");
}

function translateDamageTypes(line: string): string {
  return splitList(line)
    .map((word) => findTerm(DICTIONARY.damageTypes, word, `тип ушкоджень «${word}»`))
    .map(readPrimaryVariant)
    .join(", ");
}

function translateConditions(line: string): string {
  return splitList(line)
    .map((word) => findTerm(DICTIONARY.conditions, word, `стан «${word}»`))
    .join(", ");
}

function translateGear(gear: string): string {
  return splitList(gear)
    .map((item) => {
      const count = /\((\d+)\)$/.exec(item);
      const name = findEquipmentTerm(item.replace(/\s*\(\d+\)$/, ""));
      return count ? `${name} (${count[1]})` : name;
    })
    .join(", ");
}

function translateLanguages(languages: string): string {
  const line = collapseSpaces(languages);
  if (line === "" || line === "None" || line === "—") return "—";

  return splitList(line)
    .map((segment) => {
      const telepathy = /^Telepathy\s+(.+)$/i.exec(segment.trim());
      if (telepathy) {
        return `${DICTIONARY.rules2024.languageFormats.telepathy} ${translateDistance(telepathy[1])}`;
      }
      if (/^Common plus one other language$/i.test(segment.trim())) {
        return DICTIONARY.rules2024.languageFormats.commonPlusOneOther;
      }
      if (/^Common plus two other languages$/i.test(segment.trim())) {
        return DICTIONARY.rules2024.languageFormats.commonPlusTwoOther;
      }
      if (/^All$/i.test(segment.trim())) {
        return DICTIONARY.rules2024.languageFormats.all;
      }
      return findTerm(LanguageTranslations, segment, `мова «${segment}»`);
    })
    .join(", ");
}

function translateSavingThrows(savingThrows: string): string {
  const shortNames: Record<string, string> = {
    str: "Сил",
    dex: "Спр",
    con: "Ста",
    int: "Інт",
    wis: "Муд",
    cha: "Хар",
  };

  return splitList(savingThrows)
    .map((segment) => {
      const save = /^([A-Za-z]+)\s*([+-]\d+)(\s+plus PB)?$/i.exec(segment.trim());
      if (!save) throw new Error(`Незрозумілий рятівний кидок: «${segment}»`);
      const name = shortNames[save[1].toLowerCase()];
      if (!name) throw new Error(`Невідома характеристика: «${save[1]}»`);
      return save[3] ? `${name} ${save[2]} плюс БМ` : `${name} ${save[2]}`;
    })
    .join(", ");
}

/// The page prints both score and modifier; a mismatch means the source row is shifted, which is
/// exactly how the Will-o'-Wisp defect got into the SRD parse (KR12.1).
function readAbilityScores(
  parsed: ParsedCreature
): [number, number, number, number, number, number] {
  const scores = ABILITY_KEYS.map((key) => {
    const { score, modifier } = parsed.abilities[key];
    if (Math.floor((score - 10) / 2) !== modifier) {
      throw new Error(`${parsed.slug}: ${key} ${score} не дає модифікатор ${modifier}`);
    }
    return score;
  });

  return scores as [number, number, number, number, number, number];
}

function formatExperience(parsed: ParsedCreature): string {
  if (parsed.xp !== "") return `${parsed.xp} XP`;
  if (parsed.challenge === "0") return "0 XP";
  if (isUnstated(parsed.challenge)) return "";
  throw new Error(`${parsed.slug}: джерело не подає очок досвіду для ПС ${parsed.challenge}`);
}

function buildSectionHtml(entries: StatblockEntry[] | undefined): string {
  return (entries ?? [])
    .map((entry) => `<p><b>${entry.name}.</b> ${entry.text}</p>`)
    .join("");
}

function buildDescriptionHtml(description: string): string {
  const text = description.trim();
  if (text === "") return "";
  return text
    .split(/\n\n+/)
    .map((paragraph) => `<p>${paragraph.trim()}</p>`)
    .join("");
}

function translateDistance(value: string): string {
  return collapseSpaces(value).replace(/\bfeet\b|\bft\.?/gi, "фт.");
}

function translateDiceNotation(value: string): string {
  return value.replace(/(\d)d(\d)/g, "$1к$2");
}

/// dictionary.json spells some terms with an alternative form ("Вогняна або Вогнем"); a statblock
/// list needs the first, nominative one.
function readPrimaryVariant(term: string): string {
  return term.split(" або ")[0].replace(/\s*\(.*\)$/, "").trim();
}

/// The Source enum (prisma/schema.prisma) is the canonical set of book keys for the whole app;
/// creatures.json's legacy "VGM"/"FTD"/"MMotM" strings never matched it (KR12.3 fixes this too —
/// aidedd itself cites everything Volo's/Mordenkainen's as the 2022 reprint, "Monsters of the
/// Multiverse", so both legacy sources collapse into one canonical MPMM key).
function findSourceKey(parsed: ParsedCreature): string {
  return parsed.ruleset === "RULES_2024" ? findSourceKey2024(parsed.source) : findSourceKey2014(parsed.source);
}

function findSourceKey2024(source: string): string {
  if (/monster manual/i.test(source)) return "MM_2024";
  if (/player's handbook/i.test(source)) return "PHB_2024";
  if (/dungeon master's guide/i.test(source)) return "DMG_2024";
  throw new Error(`Невідоме джерело: «${source}»`);
}

/// aidedd writes possessives with an acute accent ("Tasha´s"), so every pattern keys off the
/// distinctive word rather than the apostrophe. Order matters only where one title contains
/// another — "Dragon Heist" / "Dragon Mag" / "Tyranny of Dragons" are all matched by full phrase.
const SOURCE_PATTERNS_2014: Array<[RegExp, string]> = [
  [/monsters of the multiverse/i, "MPMM"],
  [/monster manual/i, "MM"],
  [/fizban.{0,2}s treasury of dragons/i, "FTOD"],
  [/tasha.{0,2}s cauldron/i, "TCOE"],
  [/xanathar/i, "XGTE"],
  [/volo.{0,2}s guide/i, "VGTM"],
  [/dungeon master.{0,2}s guide/i, "DMG"],
  [/glory of the giants/i, "BPGOTG"],
  [/wild beyond the witchlight/i, "WBTW"],
  [/rime of the frostmaiden/i, "IDROTF"],
  [/descent into avernus/i, "BGDIA"],
  [/curse of strahd/i, "COS"],
  [/shadow of the dragon queen/i, "DRAGONLANCE"],
  [/essentials kit/i, "ESSENTIALS_KIT"],
  [/dragon heist/i, "WDH"],
  [/tyranny of dragons/i, "TOD"],
  [/vecna/i, "VEOR"],
  [/d&d beyond/i, "DDB"],
  [/adventurers league/i, "AL"],
  [/dragon mag/i, "DRAGON_MAG"],
  [/tomb of annihilation/i, "TOA"],
  [/storm king.{0,2}s thunder/i, "SKT"],
  [/candlekeep mysteries/i, "CM"],
  [/dungeon of the mad mage/i, "WDMM"],
  [/quests from the infinite staircase/i, "QFTIS"],
  [/princes of the apocalypse/i, "POTA"],
  [/chains of asmodeus/i, "CHAINS_OF_ASMODEUS"],
  [/aidedd/i, "HOMEBREW"],
];

export function findSourceKey2014(source: string): string {
  const matched = SOURCE_PATTERNS_2014.find(([pattern]) => pattern.test(source));
  if (matched) return matched[1];
  throw new Error(`Невідоме джерело 2014: «${source}»`);
}

function findEquipmentTerm(name: string): string {
  const maps = [weaponTranslations, armorTranslations, toolTranslations] as Array<
    Record<string, string>
  >;

  for (const key of buildEquipmentKeys(name)) {
    const found = maps.find((map) => map[key]);
    if (found) return found[key];
  }

  throw new Error(`Спорядження поза словником: «${name}»`);
}

function buildEquipmentKeys(name: string): string[] {
  const plain = collapseSpaces(name);
  const variants = [plain, plain.replace(/\s+Armor$/i, ""), plain.replace(/s$/i, "")];
  return variants.map((variant) => variant.toUpperCase().replace(/[^A-Z0-9]+/g, "_"));
}

function findTerm(map: Record<string, string>, english: string, what: string): string {
  const wanted = normalizeTermKey(english);
  const entry = Object.entries(map).find(([key]) => normalizeTermKey(key) === wanted);
  if (!entry) throw new Error(`${what} — поза затвердженим реєстром термінів`);
  return entry[1];
}

function normalizeTermKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function splitList(value: string): string[] {
  return collapseSpaces(value)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

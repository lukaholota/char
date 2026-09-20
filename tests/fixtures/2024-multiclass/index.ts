import type { CreationSpellPicks } from "../../helpers/creation-spells";
import fs from "node:fs";
import path from "node:path";

export type AbilityCode = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

export type BackgroundAsiPick =
  | { mode: "+2/+1"; plusTwo: AbilityCode; plusOne: AbilityCode }
  | { mode: "+1/+1/+1"; abilities: AbilityCode[] };

export type NamedPick = { choice: string; option: string };

/**
 * Крок підвищення рівня мультикласового персонажа. Десятка O18 підвищувала лише початковий
 * клас, тому їй вистачало номера рівня; тут кожен крок мусить сказати, **який** клас росте і
 * чи це вхід у новий клас — саме ці два поля вибирають гілку `levelUpPath` серверної дії.
 */
export type MulticlassLevelUpPick = {
  /** Рівень ПЕРСОНАЖА після цього кроку. Рівень класу харнес рахує сам із порядку кроків. */
  characterLevel: number;
  class: string;
  isNewClass: boolean;
  subclass?: string;
  asi?: Array<{ ability: AbilityCode; value: number }>;
  feat?: string;
  featAbility?: AbilityCode;
  featChoices?: NamedPick[];
  /** Заклинання, яке риса дає обрати гравцеві: Доторк феї — одне 1-го рівня з Ворожіння або Причарування. */
  featSpells?: string[];
  classChoices?: NamedPick[];
  subclassChoices?: NamedPick[];
  expertise?: string[];
  /** Навички, які дає обрана риса цього рівня: Первісне знання варвара. */
  skillChoices?: Array<{ feature: string; skills: string[] }>;
  /** Повний набір майстерності після цього рівня — комірка переобирається, а не доливається. */
  weaponMastery?: string[];
};

export type LevelGatedGrant = {
  name: string;
  kind: "feature" | "spell";
  characterLevel: number;
};

export type ClassSpellSource = { source: string; ability: AbilityCode };

export type PactSlots = { slots: number; level: number };

export type Multiclass2024Fixture = {
  id: string;
  title: string;
  reference: string;
  why: string;
  input: {
    species: string;
    /** Клас, з яким персонаж створюється. Порядок узяття класів — окремий стан (М6). */
    startingClass: string;
    background: string;
    baseAbilityScores: Record<AbilityCode, number>;
    backgroundAsi: BackgroundAsiPick;
    originFeat: string;
    originFeatChoices?: NamedPick[];
    classChoices?: NamedPick[];
    speciesChoices: NamedPick[];
    /** Вибори риси, яку дав вибір виду (Універсальність Людини): три навички другого Skilled, список другого Magic Initiate. */
    speciesFeatChoices?: NamedPick[];
    expertise?: string[];
    /** Навички класу, які гравець обирає на створенні: книга дає Пройдисвіту чотири. */
    classSkills?: string[];
    weaponMastery?: string[];
    /** Заклинання кроку «Заклинання» конструктора; чого не названо, те харнес добирає за абеткою. */
    creationSpells?: CreationSpellPicks;
    levelUps: MulticlassLevelUpPick[];
  };
  expected: {
    characterLevel: number;
    startingClass: string;
    classLevels: Record<string, number>;
    subclassByClass: Record<string, string | null>;
    finalAbilityScores: Record<AbilityCode, number>;
    /** Мультимножина: повторювана риса стоїть у списку двічі (М8). */
    feats: string[];
    requiredFeatures?: string[];
    absentFeatures?: string[];
    characterLevelGatedGrants?: LevelGatedGrant[];
    proficiencyBonus: number;
    /** Кубик → скільки їх: `{"d6":1,"d10":5,"d8":1}` — №25 з референсу. */
    hitDiceByType: Record<string, number>;
    casterLevel: number;
    pactLevel: number;
    maxSpellSlotLevel: number;
    pactSlots: PactSlots | null;
    /** Лише джерела виду CLASS — вид і риси міряють інші критерії. */
    classSpellSources?: ClassSpellSource[];
    /** Найвищий рівень заклинання, який кожен клас дозволяє **підготувати** (М14, М15). */
    maxPreparableSpellLevelByClass?: Record<string, number>;
    /** Класи, які мусять мати власний рядок підготовки заклинань (М15). */
    preparedSpellLineClasses?: string[];
    /** Клас, чия книга заклинань — окремий шар над підготовленим набором (М18). */
    spellbookClass?: string;
    extraAttackCount?: number;
    /** Скільки альтернативних формул базового КЗ персонаж має, і скільки з них діють (М20). */
    baseArmorClassFormulas?: { offered: number; active: number };
    weaponMastery?: { capacity: number; weapons?: string[] };
    bastionFacilityLimit: number;
    /** Приміщення бастіону, відповідність яких читається зі здатностей персонажа (М26). */
    bastionFacilityMatches?: Record<string, "met" | "unmet" | "campaign">;
    /** Рівні класу, на яких сервер зобовʼязаний запропонувати підвищення характеристик (М7). */
    asiClassLevelsOffered?: Record<string, number[]>;
    /** Списки заклинань, з якими взято «Посвячений у магію» — по одному на взяття (М9). */
    magicInitiateLists?: string[];
    /** Риса, взята двічі: скільки разів і скільки виборів володіння вона має дати разом (М8). */
    repeatedFeat?: { name: string; times: number; grantedProficiencies: number };
    /** Володіння, які персонаж мусить мати від класу — повний пакет чи скорочений (М5). */
    weaponProficiencyTypes?: string[];
    armorProficiencies?: string[];
  };
};

const FIXTURE_DIR = __dirname;

export const multiclass2024Fixtures: Multiclass2024Fixture[] = fs
  .readdirSync(FIXTURE_DIR)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), "utf-8")) as Multiclass2024Fixture);

export function findMulticlassFixture(id: string): Multiclass2024Fixture {
  const fixture = multiclass2024Fixtures.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`Фікстура "${id}" не знайдена в ${FIXTURE_DIR}`);
  return fixture;
}

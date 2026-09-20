import type { CreationSpellPicks } from "../../helpers/creation-spells";
import fs from "node:fs";
import path from "node:path";

export type AbilityCode = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

export type BackgroundAsiPick =
  | { mode: "+2/+1"; plusTwo: AbilityCode; plusOne: AbilityCode }
  | { mode: "+1/+1/+1"; abilities: AbilityCode[] };

export type NamedPick = { choice: string; option: string };

export type LevelUpPick = {
  level: number;
  subclass?: string;
  asi?: Array<{ ability: AbilityCode; value: number }>;
  feat?: string;
  featAbility?: AbilityCode;
  classChoices?: NamedPick[];
  subclassChoices?: NamedPick[];
  expertise?: string[];
  /** Навички, які дає обрана риса цього рівня: Первісне знання варвара. */
  skillChoices?: Array<{ feature: string; skills: string[] }>;
  /** Повний набір майстерності після цього рівня — нова комірка не доливається, а переобирається. */
  weaponMastery?: string[];
};

export type LevelGatedGrant = {
  name: string;
  kind: "feature" | "spell";
  characterLevel: number;
};

export type Acceptance2024Fixture = {
  id: string;
  title: string;
  reference: string;
  why: string;
  input: {
    species: string;
    class: string;
    background: string;
    subclass: string;
    baseAbilityScores: Record<AbilityCode, number>;
    backgroundAsi: BackgroundAsiPick;
    originFeat: string;
    originFeatChoices?: NamedPick[];
    classChoices?: NamedPick[];
    /** Експертиза, яку клас дає вже на створенні: Пройдисвіт 2024. */
    expertise?: string[];
    speciesFeat?: string;
    speciesChoices: NamedPick[];
    /** Англійські назви зброї, чию майстерність персонаж бере на створенні. */
    weaponMastery?: string[];
    /** Літера класового стартового спорядження 2024 («a» / «b» / «c»), як її показує книга. */
    classEquipment?: string;
    /** Заклинання кроку «Заклинання» конструктора; чого не названо, те харнес добирає за абеткою. */
    creationSpells?: CreationSpellPicks;
    levelUps: LevelUpPick[];
  };
  expected: {
    finalAbilityScores: Record<AbilityCode, number>;
    feats: string[];
    requiredFeatures: string[];
    characterLevelGatedGrants: LevelGatedGrant[];
    weaponMastery: { capacity: number; weapons?: string[] };
    expertiseSkills?: string[];
    maxHp?: number;
    maxHpBreakdown?: string;
    spellSources: Array<{ source: string; ability: AbilityCode }>;
    /** Заклинання, які правило дарує поіменно — гравець їх не обирає (референс §15.3, §15.4, §15.9). */
    grantedSpells: string[];
    bastionUnlocked?: boolean;
  };
};

const FIXTURE_DIR = __dirname;

export const acceptance2024Fixtures: Acceptance2024Fixture[] = fs
  .readdirSync(FIXTURE_DIR)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), "utf-8")) as Acceptance2024Fixture);

export function findFixture(id: string): Acceptance2024Fixture {
  const fixture = acceptance2024Fixtures.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`Фікстура "${id}" не знайдена в ${FIXTURE_DIR}`);
  return fixture;
}

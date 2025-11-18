import {Ability, Background, Class, Race, Skills, ToolCategory, WeaponCategory, WeaponType} from "@prisma/client";
import {Skill} from './enums'

export type SkillProficienciesArray = Skills[]
export type SkillProficienciesChoice = {
  options: Skill[],
  choiceCount: number,
  chooseAny?: boolean
};

export type SkillProficiencies = SkillProficienciesArray | SkillProficienciesChoice;


type Group = {
  groupName: string;
  value: number;
  choiceCount: number;
  unique: boolean;
}

type Flexible = {
  groups: Group[]
}

export type RaceASI = {
  basic?: {
    simple: Partial<Record<Ability, number>>,
    flexible?: Flexible,
  },
  tasha?: {
    flexible: Flexible
  },
}

export type WeaponProficiencies = {
  category?: WeaponCategory[];
  type?: WeaponType[];
}

export type ToolProficiencies = ToolCategory[]

export type MulticlassReqs = {
  required: Ability[];
  score: number;
};

export type WeaponProficienciesSpecial = {
  specific: WeaponCategory[];
};

export type AbilityKey = keyof typeof Ability;

export interface RaceI extends Omit<Race, 'skillProficiencies' | 'ASI' | 'toolProficiencies' | 'weaponProficiencies'> {
  skillProficiencies: SkillProficiencies | null;
  ASI: RaceASI;
  weaponProficiencies: WeaponProficiencies;
  toolProficiencies: ToolProficiencies;
}

export interface ClassI extends Omit<Class, 'skillProficiencies' | 'weaponProficiencies' | 'armorProficiencies' | 'multiclassReqs' | 'weaponProficienciesSpecial'> {
  skillProficiencies: SkillProficiencies;
  weaponProficiencies: WeaponProficiencies
}

export interface BackgroundI extends Omit<Background, 'skillProficiencies' | 'toolProficiencies'> {
  skillProficiencies: SkillProficiencies;
  toolProficiencies: ToolProficiencies;
}

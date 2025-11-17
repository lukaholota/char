import {Ability, Race, Skills, WeaponCategory, WeaponType} from "@prisma/client";

export type SkillProficienciesArray = Skills[]
export type SkillProficienciesChoice = {
  options: Skills[],
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

export interface enhancedRace extends Omit<Race, 'skillProficiencies' | 'ASI' " ">

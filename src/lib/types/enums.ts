export const SkillsEnum = [
  "ATHLETICS",
  "ACROBATICS",
  "SLEIGHT_OF_HAND",
  "STEALTH",
  "ARCANA",
  "HISTORY",
  "INVESTIGATION",
  "NATURE",
  "RELIGION",
  "ANIMAL_HANDLING",
  "INSIGHT",
  "MEDICINE",
  "PERCEPTION",
  "SURVIVAL",
  "DECEPTION",
  "INTIMIDATION",
  "PERFORMANCE",
  "PERSUASION",
] as const

export type Skill = typeof SkillsEnum[number]

export const WeaponKinds = [
  "meleeSimple",
  "meleeMartial",
  "rangedSimple",
  "rangedMartial",
  "firearmsAdditional"
] as const;

export type WeaponKindType = typeof WeaponKinds[number];
import {Ability, Classes} from "@prisma/client";

const classAbilityScores: Record<Classes, Array<{ability: Ability, value: number}>> = {
  [Classes.ARTIFICER_2014]: [
    { ability: Ability.INT, value: 15 },
    { ability: Ability.CON, value: 14 },
    { ability: Ability.DEX, value: 13 },
    { ability: Ability.WIS, value: 12 },
    { ability: Ability.CHA, value: 10 },
    { ability: Ability.STR, value: 8 }
  ],
  [Classes.BARBARIAN_2014]: [
    { ability: Ability.STR, value: 15 },
    { ability: Ability.CON, value: 14 },
    { ability: Ability.DEX, value: 13 },
    { ability: Ability.WIS, value: 12 },
    { ability: Ability.CHA, value: 10 },
    { ability: Ability.INT, value: 8 }
  ],
  [Classes.BARD_2014]: [
    { ability: Ability.CHA, value: 15 },
    { ability: Ability.DEX, value: 14 },
    { ability: Ability.CON, value: 13 },
    { ability: Ability.WIS, value: 12 },
    { ability: Ability.INT, value: 10 },
    { ability: Ability.STR, value: 8 }
  ],
  [Classes.CLERIC_2014]: [
    { ability: Ability.WIS, value: 15 },
    { ability: Ability.CON, value: 14 },
    { ability: Ability.STR, value: 13 },
    { ability: Ability.DEX, value: 12 },
    { ability: Ability.CHA, value: 10 },
    { ability: Ability.INT, value: 8 }
  ],
  [Classes.DRUID_2014]: [
    { ability: Ability.WIS, value: 15 },
    { ability: Ability.CON, value: 14 },
    { ability: Ability.DEX, value: 13 },
    { ability: Ability.INT, value: 12 },
    { ability: Ability.CHA, value: 10 },
    { ability: Ability.STR, value: 8 }
  ],
  [Classes.FIGHTER_2014]: [
    { ability: Ability.STR, value: 15 },
    { ability: Ability.CON, value: 14 },
    { ability: Ability.DEX, value: 13 },
    { ability: Ability.WIS, value: 12 },
    { ability: Ability.CHA, value: 10 },
    { ability: Ability.INT, value: 8 }
  ],
  [Classes.MONK_2014]: [
    { ability: Ability.DEX, value: 15 },
    { ability: Ability.WIS, value: 14 },
    { ability: Ability.CON, value: 13 },
    { ability: Ability.STR, value: 12 },
    { ability: Ability.CHA, value: 10 },
    { ability: Ability.INT, value: 8 }
  ],
  [Classes.PALADIN_2014]: [
    { ability: Ability.STR, value: 15 },
    { ability: Ability.CHA, value: 14 },
    { ability: Ability.CON, value: 13 },
    { ability: Ability.DEX, value: 12 },
    { ability: Ability.WIS, value: 10 },
    { ability: Ability.INT, value: 8 }
  ],
  [Classes.RANGER_2014]: [
    { ability: Ability.DEX, value: 15 },
    { ability: Ability.WIS, value: 14 },
    { ability: Ability.CON, value: 13 },
    { ability: Ability.STR, value: 12 },
    { ability: Ability.CHA, value: 10 },
    { ability: Ability.INT, value: 8 }
  ],
  [Classes.ROGUE_2014]: [
    { ability: Ability.DEX, value: 15 },
    { ability: Ability.CON, value: 14 },
    { ability: Ability.CHA, value: 13 },
    { ability: Ability.INT, value: 12 },
    { ability: Ability.WIS, value: 10 },
    { ability: Ability.STR, value: 8 }
  ],
  [Classes.SORCERER_2014]: [
    { ability: Ability.CHA, value: 15 },
    { ability: Ability.CON, value: 14 },
    { ability: Ability.DEX, value: 13 },
    { ability: Ability.INT, value: 12 },
    { ability: Ability.WIS, value: 10 },
    { ability: Ability.STR, value: 8 }
  ],
  [Classes.WARLOCK_2014]: [
    { ability: Ability.CHA, value: 15 },
    { ability: Ability.CON, value: 14 },
    { ability: Ability.DEX, value: 13 },
    { ability: Ability.INT, value: 12 },
    { ability: Ability.WIS, value: 10 },
    { ability: Ability.STR, value: 8 }
  ],
  [Classes.WIZARD_2014]: [
    { ability: Ability.INT, value: 15 },
    { ability: Ability.CON, value: 14 },
    { ability: Ability.DEX, value: 13 },
    { ability: Ability.WIS, value: 12 },
    { ability: Ability.CHA, value: 10 },
    { ability: Ability.STR, value: 8 }
  ]
};
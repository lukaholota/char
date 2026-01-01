// model-types.ts

// 1. Базові імпорти з Prisma
import {
  Ability,
  Armor,
  ArmorType,
  Background,
  BackgroundCategory,
  Class,
  ClassFeature,
  ClassStartingEquipmentOption,
  DamageType,
  EquipmentPack,
  EquipmentPackCategory,
  Feat,
  Feature,
  Infusion,
  InfusionTargetType,
  ItemRarity,
  Language,
  MagicItem,
  MagicItemType,
  Pers,
  PersArmor,
  PersFeat,
  PersInfusion,
  PersMagicItem,
  PersSkill,
  PersWeapon,
  Prisma,
  Race,
  RaceChoiceOption,
  RaceVariant,
  RaceTrait,
  RestType,
  Skills,
  Source,
  Spell,
  Subclass,
  SubclassFeature,
  ToolCategory,
  Weapon,
  WeaponCategory,
  WeaponProperty,
  WeaponType,
  SubclassChoiceOption,
  ChoiceOption,
  ChoiceOptionFeature,
} from '@prisma/client';

// Якщо в тебе є окремий фронтовий enum Skill — підтягуємо
// Якщо немає — можеш видалити цей імпорт і замінити Skill на Skills
import { Skill } from './enums';

// ============================================================================
// 2. JSON-типи, які ТИ ВЖЕ ВИКОРИСТОВУЄШ У СІДАХ
// ============================================================================

// 2.1. Skill proficiencies

export type SkillProficienciesArray = Skills[];

export type SkillProficienciesChoice = {
  options: Skill[]; // або Skills[], якщо хочеш напряму з Prisma
  choices?: Skill[]; // Alias for options found in some seeds
  choiceCount: number;
  chooseAny?: boolean;
};

export type SkillProficiencies = SkillProficienciesArray | SkillProficienciesChoice;

// 2.2. Race ASI

type AbilityScoreMap = Partial<Record<Ability, number>>;

type AbilityGroup = {
  groupName: string;
  value: number;
  choiceCount: number;
  unique: boolean;
};

type FlexibleASIGroup = {
  groups: AbilityGroup[];
};

export type RaceASI = {
  basic?: {
    simple: AbilityScoreMap;      // типу { STR: 2, CON: 1 }
    flexible?: FlexibleASIGroup;  // групи вибору
  };
  tasha?: {
    flexible: FlexibleASIGroup;
  };
};

// 2.3. Weapon / Tool proficiencies

export type WeaponProficiencies = {
  category?: WeaponCategory[];
  type?: WeaponType[];
};

export type WeaponProficienciesSpecial = {
  specific: WeaponCategory[];
};

export type ToolProficiencies = ToolCategory[];

// 2.4. Multiclass requirements

export type MulticlassReqs = {
  required: Ability[]; // які стати повинні мати мін. значення
  score: number;       // наприклад 13
};

// 2.5. AC модифікації (Feature.modifiesAC / prerequisites / Race.ac)

// Те, що в prerequisites для AC:
export type ACPrerequisiteTag = 'UNARMORED' | 'NO_SHIELD';

// Варіант 1:
// modifiesAC: {
//   base: 10,
//   bonus: { stats: ['DEX', 'WIS'] },
//   prerequisites: ['UNARMORED', 'NO_SHIELD']
// }
export type ACStatBonus = {
  stats: Ability[];
};

export type ACBaseFormula = {
  base: number;
  bonus?: ACStatBonus | null;
  prerequisites?: ACPrerequisiteTag[];
};

// Варіант 2:
// modifiesAC: {
//   naturalArmor: { baseAC: 17, addsDex: false }
// }
export type NaturalArmorAC = {
  naturalArmor: {
    baseAC: number;
    addsDex: boolean;
  };
  prerequisites?: ACPrerequisiteTag[];
};

export type ModifiesAC = ACBaseFormula | NaturalArmorAC;

// Race.ac приклади:
//
// ac: { base: 17, bonus: null }
// ac: { base: 13, bonus: Ability.DEX }
// ac: { consistentBonus: 1 }
export type RaceAC =
  | {
  base: number;
  bonus: Ability | null;
}
  | {
  consistentBonus: number;
};

// 2.6. Bonus to saving throws
//
// bonusToSavingThrows: {
//   abilities: ['STR', 'DEX', ...],
//   bonus: 1,
// }

export type BonusToSavingThrows = {
  abilities: Ability[];
  bonus: number;
};

// 2.7. SkillExpertises
//
// skillExpertises: {
//   chooseFromCurrentProficiencies: true,
//   count: 2
// }
//
// skillExpertises: {
//   chooseFromCurrentProficiencies: true
// }

export type SkillExpertises = {
  chooseFromCurrentProficiencies: boolean;
  count?: number;
};

// 2.8. usesCountSpecial – всі варіанти, які ти показував

// Варіант 1: масив по рівнях
//
// usesCountSpecial: [
//   { lvl: 2, uses: 1 },
//   { lvl: 17, uses: 2 },
// ]
export type UsesCountPerLevel = {
  lvl: number;
  uses: number;
};

export type UsesCountSpecialArray = UsesCountPerLevel[];

// Варіант 2: формула по стату
//
// usesCountSpecial: {
//   type: 'FORMULA',
//   group: 'STAT_BASED',
//   base: 1,
//   stat: 'CHA',
//   operation: 'ADD',
// }
export type UsesCountFormulaGroup = 'STAT_BASED' | 'LEVEL_BASED';
export type UsesCountFormulaOperation = 'ADD' | 'MULTIPLY';

export type UsesCountSpecialFormulaStatBased = {
  type: 'FORMULA';
  group: 'STAT_BASED';
  base: number;
  stat: Ability;
  operation: UsesCountFormulaOperation;
};

// Варіант 3: формула по рівню
//
// usesCountSpecial: {
//   type: 'FORMULA',
//   group: 'LEVEL_BASED',
//   multiplier: 5,
//   operation: 'MULTIPLY',
// }
export type UsesCountSpecialFormulaLevelBased = {
  type: 'FORMULA';
  group: 'LEVEL_BASED';
  multiplier: number;
  operation: UsesCountFormulaOperation;
};

// Варіант 4: STATIC_FROM_STAT
//
// usesCountSpecial: {
//   type: 'STATIC_FROM_STAT',
//   stat: 'CHA'
// }
export type UsesCountSpecialStaticFromStat = {
  type: 'STATIC_FROM_STAT';
  stat: Ability;
};

// Варіант 5: equalsToClassLevel
//
// usesCountSpecial: {
//   equalsToClassLevel: true,
// }
export type UsesCountSpecialEqualsToClassLevel = {
  equalsToClassLevel: true;
};

// Обʼєднаний тип:
export type UsesCountSpecial =
  | UsesCountSpecialArray
  | UsesCountSpecialFormulaStatBased
  | UsesCountSpecialFormulaLevelBased
  | UsesCountSpecialStaticFromStat
  | UsesCountSpecialEqualsToClassLevel;

// 2.9. miscSaveBonuses
//
// miscSaveBonuses: Record<Ability, number>
export type MiscSaveBonuses = Partial<Record<Ability, number>>;

// 2.10. prerequisites
//
// prerequisites: { level: 5, pact: 'Pact of the Chain' }
// prerequisites: { level: 5 }
// prerequisites: ['UNARMORED']
// prerequisites: ['UNARMORED', 'NO_SHIELD']
// prerequisites: { subclass: 'BATTLE_MASTER' }

export type PrerequisiteSimpleTag = ACPrerequisiteTag;

export type PrerequisiteObject = {
  level?: number;
  pact?: string;
  subclass?: string;
};

export type Prerequisites = PrerequisiteSimpleTag[] | PrerequisiteObject;

// ============================================================================
// 3. Prisma payload типи (повний explicit include там, де ти юзаєш findMany)
// ============================================================================

// 3.1. Race

export type RacePrisma = Prisma.RaceGetPayload<{
  include: {
    subraces: {
      include: {
        traits: {
          include: {
            feature: true;
          };
        };
      };
    };
    raceChoiceOptions: true;
    raceVariants: {
      include: {
        traits: {
          include: {
            feature: true;
          };
        };
      };
    };
    traits: {
      include: {
        feature: true;
      };
    };
  };
}>;

// 3.2. Class

export type ClassPrisma = Prisma.ClassGetPayload<{
  include: {
    subclasses: {
      include: {
        features: {
          include: {
            feature: true;
          };
        };
        expandedSpells: true;
        subclassChoiceOptions: {
          include: {
            choiceOption: {
              include: {
                features: {
                  include: {
                    feature: true;
                  };
                };
              };
            };
          };
        };
      };
    };
    startingEquipmentOption: {
      include: {
        weapon: true;
        armor: true;
        equipmentPack: true;
      };
    };
    classChoiceOptions: {
      include: {
        choiceOption: {
          include: {
            features: {
              include: {
                feature: true;
              };
            };
          };
        };
      };
    };
    classOptionalFeatures: {
      include: {
        feature: true;
        replacesFeatures: {
          include: {
            replacedFeature: true;
          };
        };
      };
    };
    features: {
      include: {
        feature: true;
      };
    };
  };
}>;

// 3.3. Background

export type BackgroundPrisma = Background;

// 3.4. Feature

export type FeaturePrisma = Prisma.FeatureGetPayload<{
  include: {
    classFeatures: {
      include: {
        class: true;
      };
    };
    subclassFeatures: {
      include: {
        subclass: true;
      };
    };
    raceTraits: {
      include: {
        race: true;
      };
    };
    subraceTraits: {
      include: {
        subrace: true;
      };
    };
    raceVariantTraits: {
      include: {
        raceVariant: true;
      };
    };
    raceChoiceOptionTraits: {
      include: {
        raceChoiceOption: true;
      };
    };
    choiceOptionFeatures: {
      include: {
        option: true;
      };
    };
    featFeatures: {
      include: {
        feat: true;
      };
    };
    infusions: true;
    givesSpells: true;
  };
}>;



// 3.6. MagicItem

export type MagicItemPrisma = Prisma.MagicItemGetPayload<{
  include: {
    persMagicItems: {
      include: {
        pers: true;
      };
    };
    givesSpells: true;
    replicatedByInfusions: true;
  };
}>;

// 3.7. Weapon / Armor / EquipmentPack

export type WeaponPrisma = Prisma.WeaponGetPayload<{
  include: {
    persWeapons: {
      include: {
        pers: true;
      };
    };
    classStartingEquipmentOption: true;
  };
}>;

export type ArmorPrisma = Prisma.ArmorGetPayload<{
  include: {
    persArmor: {
      include: {
        pers: true;
      };
    };
    classStartingEquipmentOption: true;
  };
}>;

export type EquipmentPackPrisma = Prisma.EquipmentPackGetPayload<{
  include: {
    classStartingEquipmentOptions: true;
  };
}>;

// 3.8. Pers (персонаж)

export type PersPrisma = Prisma.PersGetPayload<{
  include: {
    user: true;
    class: true;
    subclass: true;
    race: true;
    subrace: true;
    background: true;
    skills: true;
    multiclasses: {
      include: {
        class: true;
        subclass: true;
      };
    };
    features: {
      include: {
        feature: true;
      };
    };
    spells: true;
    feats: {
      include: {
        feat: true;
      };
    };
    armors: {
      include: {
        armor: true;
      };
    };
    weapons: {
      include: {
        weapon: true;
      };
    };
    magicItems: {
      include: {
        magicItem: true;
      };
    };
    raceVariants: true;
    raceChoiceOptions: true;
    choiceOptions: true;
    classOptionalFeatures: true;
    persInfusions: {
      include: {
        infusion: true;
        weapon: true;
        armor: true;
        magicItem: true;
      };
    };
  };
}>;

// 3.9. Spell

export type SpellPrisma = Prisma.SpellGetPayload<{
  include: {
    spellClasses: true;
    spellRaces: true;
    spellbookSpells: true;
    subclasses: true;
    perses: true;
    features: true;
    magicItems: true;
  };
}>;

// 3.10. Feat

export type FeatPrisma = Prisma.FeatGetPayload<{
  include: {
    grantsFeature: true;
    featChoiceOptions: {
      include: {
        choiceOption: {
          include: {
            features: {
              include: {
                feature: true;
              };
            };
          };
        };
      };
    };
  };
}>;

// ============================================================================
// 4. Інтерфейси I-* з приведеними JSON-полями
// ============================================================================

export type AbilityKey = keyof typeof Ability;

// 4.1. RaceI — Race + subraces + нормальні типи для JSON

export type RaceI = Omit<
  RacePrisma,
  'ASI' | 'skillProficiencies' | 'toolProficiencies' | 'weaponProficiencies' | 'ac'
> & {
  ASI: RaceASI;
  skillProficiencies: SkillProficiencies | null;
  toolProficiencies: ToolProficiencies | null;
  weaponProficiencies: WeaponProficiencies | null;
  ac: RaceAC | null;
};

// 4.2. ClassI — Class + фулл граф + нормальні JSON-типы

export type ClassI = Omit<
  ClassPrisma,
  'skillProficiencies' | 'weaponProficiencies' | 'weaponProficienciesSpecial' | 'multiclassReqs'
> & {
  skillProficiencies: SkillProficiencies;
  weaponProficiencies: WeaponProficiencies;
  weaponProficienciesSpecial: WeaponProficienciesSpecial | null;
  multiclassReqs: MulticlassReqs;
};

// 4.3. BackgroundI — Background з нормальними skill/tool JSON

export interface BackgroundI
  extends Omit<BackgroundPrisma, 'skillProficiencies' | 'toolProficiencies'> {
  skillProficiencies: SkillProficiencies;
  toolProficiencies: ToolProficiencies;
}

// 4.4. FeatureI — тільки ті JSON-поля, які ти реально використовуєш

export interface FeatureI
  extends Omit<
    FeaturePrisma,
    'modifiesAC' | 'bonusToSavingThrows' | 'skillProficiencies' | 'skillExpertises' | 'usesCountSpecial'
  > {
  modifiesAC?: ModifiesAC | null;
  bonusToSavingThrows?: BonusToSavingThrows | null;
  skillProficiencies?: SkillProficiencies | null;
  skillExpertises?: SkillExpertises | null;
  usesCountSpecial?: UsesCountSpecial | null;
}

// 4.5. PersI — для miscSaveBonuses

export interface PersI extends Omit<PersPrisma, 'miscSaveBonuses'> {
  miscSaveBonuses?: MiscSaveBonuses | null;
}

// 4.6. MagicItemI — нормальний тип для weaponProficiencies JSON

export interface MagicItemI
  extends Omit<MagicItemPrisma, 'weaponProficiencies' | 'weaponProficienciesSpecial'> {
  weaponProficiencies?: WeaponProficiencies | null;
  weaponProficienciesSpecial?: WeaponProficienciesSpecial | null;
}

// ============================================================================
// 5. Експорт корисних alias'ів (як захочеш використовувати далі)
// ============================================================================

export interface SubclassI extends Subclass {
  subclassChoiceOptions: (SubclassChoiceOption & {
    choiceOption: ChoiceOption & {
      features: (ChoiceOptionFeature & {
        feature: Feature
      })[]
    }
  })[];
}

export type {
  Ability,
  Armor,
  ArmorType,
  Background,
  BackgroundCategory,
  Class,
  ClassFeature,
  ClassStartingEquipmentOption,
  DamageType,
  EquipmentPack,
  EquipmentPackCategory,
  Feat,
  Feature,
  Infusion,
  InfusionTargetType,
  ItemRarity,
  Language,
  MagicItem,
  MagicItemType,
  Pers,
  PersArmor,
  PersFeat,
  PersInfusion,
  PersMagicItem,
  PersSkill,
  PersWeapon,
  Race,
  RaceChoiceOption,
  RaceVariant,
  RaceTrait,
  RestType,
  Skills,
  Source,
  Spell,
  Subclass,
  SubclassFeature,
  ToolCategory,
  Weapon,
  WeaponCategory,
  WeaponProperty,
  WeaponType,
  SubclassChoiceOption,
  ChoiceOption,
  ChoiceOptionFeature,
};

// ============================================================================
// 6. Bonus Types for Custom Modifications
// ============================================================================

export type StatBonuses = Partial<Record<Ability, number>>;
export type SkillBonuses = Partial<Record<Skills, number>>;

export interface SimpleBonusValue {
  value: number;
}

export type SimpleBonusField = 'hp' | 'ac' | 'speed' | 'proficiency' | 'initiative' | 'spellAttack' | 'spellDC';

// PersWithBonuses - adds strongly typed bonus fields (overriding Json? from Prisma)
export type PersWithBonuses = Omit<
  Pers,
  'statBonuses' | 'statModifierBonuses' | 'saveBonuses' | 'skillBonuses' |
  'hpBonuses' | 'acBonuses' | 'speedBonuses' | 'proficiencyBonuses' |
  'initiativeBonuses' | 'spellAttackBonuses' | 'spellDCBonuses'
> & {
  statBonuses: StatBonuses | null;
  statModifierBonuses: StatBonuses | null;
  saveBonuses: StatBonuses | null;
  skillBonuses: SkillBonuses | null;
  hpBonuses: SimpleBonusValue | null;
  acBonuses: SimpleBonusValue | null;
  speedBonuses: SimpleBonusValue | null;
  proficiencyBonuses: SimpleBonusValue | null;
  initiativeBonuses: SimpleBonusValue | null;
  spellAttackBonuses: SimpleBonusValue | null;
  spellDCBonuses: SimpleBonusValue | null;
};

export type BonusType = 'stat' | 'statModifier' | 'save' | 'skill' | SimpleBonusField;


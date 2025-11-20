// src/server/dndGraph.ts (або будь-де в src/)
// Головний MASTER_FULL_GRAPH для D&D

import {
  Prisma,
  PrismaClient,
  Ability,
  ArmorType,
  Background,
  BackgroundCategory,
  Class as ClassModel,
  Feature as FeatureModel,
  Feat as FeatModel,
  Infusion as InfusionModel,
  Language,
  MagicItem as MagicItemModel,
  MagicItemType,
  Races,
  Race as RaceModel,
  Skills,
  Source,
  Subrace as SubraceModel,
  ToolCategory,
  WeaponCategory,
  WeaponType,
} from '@prisma/client';

import { prisma } from '@/prisma';

// =========================
//  БАЗОВІ JSON-ТИПИ
// =========================

export type SkillProficienciesArray = Skills[];

export type Skill = Skills; // зручний аліас для фронту

export type SkillProficienciesChoice = {
  options: Skill[];
  choiceCount: number;
  chooseAny?: boolean;
};

export type SkillProficiencies = SkillProficienciesArray | SkillProficienciesChoice;

type AsiSimple = Partial<Record<Ability, number>>;

type AsiGroup = {
  groupName: string;
  value: number;
  choiceCount: number;
  unique: boolean; // не можна брати однакову абу
};

type AsiFlexible = {
  groups: AsiGroup[];
};

export type RaceASI = {
  basic?: {
    simple: AsiSimple;
    flexible?: AsiFlexible;
  };
  tasha?: {
    flexible: AsiFlexible;
  };
};

export type WeaponProficiencies = {
  category?: WeaponCategory[];
  type?: WeaponType[];
};

export type WeaponProficienciesSpecial = {
  specific: WeaponCategory[];
};

export type ToolProficiencies = ToolCategory[];

export type MulticlassReqs = {
  required: Ability[]; // які характеристики мають відповідати
  score: number;       // мінімальне значення (13 і т.д.)
};

export type BonusToSavingThrows = Partial<Record<Ability, number>>;

// =========================
//  FEATURE GRAPH
// =========================

type FeaturePrisma = Prisma.FeatureGetPayload<{
  include: {
    classFeatures: true;
    subclassFeatures: true;
    raceTraits: true;
    subraceTraits: true;
    raceVariantTraits: true;
    raceChoiceOptionTraits: true;
    choiceOptionFeatures: true;
    featFeatures: true;
    infusions: true;
    givesSpells: true;
  };
}>;

export type FeatureI = Omit<
  FeaturePrisma,
  'skillProficiencies' | 'skillExpertises' | 'bonusToSavingThrows'
> & {
  skillProficiencies: SkillProficiencies | null;
  skillExpertises: SkillProficienciesArray | null;
  bonusToSavingThrows: BonusToSavingThrows | null;
};

// =========================
//  RACE GRAPH
// =========================

type RaceTraitWithFeature = Prisma.RaceTraitGetPayload<{
  include: { feature: true };
}>;

type SubraceTraitWithFeature = Prisma.SubraceTraitGetPayload<{
  include: { feature: true };
}>;

type RaceVariantTraitWithFeature = Prisma.RaceVariantTraitGetPayload<{
  include: { feature: true };
}>;

type RaceChoiceOptionTraitWithFeature = Prisma.RaceChoiceOptionTraitGetPayload<{
  include: { feature: true };
}>;

type RaceChoiceOptionPrisma = Prisma.RaceChoiceOptionGetPayload<{
  include: {
    traits: { include: { feature: true } };
  };
}>;

export type RaceChoiceOptionI = Omit<RaceChoiceOptionPrisma, 'ASI' | 'skillProficiencies'> & {
  ASI: RaceASI | null;
  skillProficiencies: SkillProficiencies | null;
};

type SubracePrisma = Prisma.SubraceGetPayload<{
  include: {
    traits: { include: { feature: true } };
    raceChoiceOptions: {
      include: {
        traits: { include: { feature: true } };
      };
    };
  };
}>;

export type SubraceI = Omit<
  SubracePrisma,
  'additionalASI' | 'toolProficiencies' | 'skillProficiencies' | 'weaponProficiencies'
> & {
  additionalASI: RaceASI | null;
  toolProficiencies: ToolProficiencies | null;
  skillProficiencies: SkillProficiencies | null;
  weaponProficiencies: WeaponProficiencies | null;
};

type RaceVariantPrisma = Prisma.RaceVariantGetPayload<{
  include: {
    traits: { include: { feature: true } };
    replacesFeatures: true;
  };
}>;

export type RaceVariantI = Omit<RaceVariantPrisma, 'overridesRaceASI'> & {
  overridesRaceASI: RaceASI | null;
};

type RacePrisma = Prisma.RaceGetPayload<{
  include: {
    traits: { include: { feature: true } };
    subraces: {
      include: {
        traits: { include: { feature: true } };
        raceChoiceOptions: {
          include: {
            traits: { include: { feature: true } };
          };
        };
      };
    };
    raceChoiceOptions: {
      include: {
        traits: { include: { feature: true } };
      };
    };
    raceVariants: {
      include: {
        traits: { include: { feature: true } };
        replacesFeatures: true;
      };
    };
  };
}>;

export type RaceI = Omit<
  RacePrisma,
  'ASI' | 'toolProficiencies' | 'skillProficiencies' | 'weaponProficiencies'
> & {
  ASI: RaceASI;
  toolProficiencies: ToolProficiencies | null;
  skillProficiencies: SkillProficiencies | null;
  weaponProficiencies: WeaponProficiencies | null;
  traits: RaceTraitWithFeature[];
  subraces: SubraceI[];
  raceChoiceOptions: RaceChoiceOptionI[];
  raceVariants: RaceVariantI[];
};

// =========================
//  CLASS GRAPH
// =========================

type ClassFeatureWithFeature = Prisma.ClassFeatureGetPayload<{
  include: { feature: true };
}>;

type SubclassFeatureWithFeature = Prisma.SubclassFeatureGetPayload<{
  include: { feature: true };
}>;

type ClassStartingEquipmentOptionPrisma = Prisma.ClassStartingEquipmentOptionGetPayload<{
  include: {
    weapon: true;
    armor: true;
    equipmentPack: true;
  };
}>;

export type ClassStartingEquipmentOptionI = ClassStartingEquipmentOptionPrisma;

type ClassChoiceOptionPrisma = Prisma.ClassChoiceOptionGetPayload<{
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
}>;

export type ClassChoiceOptionI = ClassChoiceOptionPrisma;

type ClassOptionalFeaturePrisma = Prisma.ClassOptionalFeatureGetPayload<{
  include: {
    feature: {
      include: {
        classOptionalFeatures: true;
      };
    };
    replacesFeatures: {
      include: {
        replacedFeature: true;
      };
    };
    appearsOnlyIfChoicesTaken: true;
  };
}>;

export type ClassOptionalFeatureI = ClassOptionalFeaturePrisma;

type SubclassPrisma = Prisma.SubclassGetPayload<{
  include: {
    features: {
      include: { feature: true };
    };
    expandedSpells: true;
  };
}>;

export type SubclassI = Omit<
  SubclassPrisma,
  'toolProficiencies' | 'skillProficiencies' | 'weaponProficiencies'
> & {
  toolProficiencies: ToolProficiencies | null;
  skillProficiencies: SkillProficiencies | null;
  weaponProficiencies: WeaponProficiencies | null;
  features: SubclassFeatureWithFeature[];
};

type ClassPrisma = Prisma.ClassGetPayload<{
  include: {
    subclasses: {
      include: {
        features: { include: { feature: true } };
        expandedSpells: true;
      };
    };
    features: {
      include: { feature: true };
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
              include: { feature: true };
            };
          };
        };
      };
    };
    classOptionalFeatures: {
      include: {
        feature: {
          include: {
            classOptionalFeatures: true;
          };
        };
        replacesFeatures: {
          include: {
            replacedFeature: true;
          };
        };
        appearsOnlyIfChoicesTaken: true;
      };
    };
  };
}>;

// Твоє головне ClassI, з яким працюватиме фронт
export type ClassI = Omit<
  ClassPrisma,
  | 'multiclassReqs'
  | 'weaponProficiencies'
  | 'weaponProficienciesSpecial'
  | 'skillProficiencies'
  | 'startingEquipmentOption'
  | 'classChoiceOptions'
  | 'classOptionalFeatures'
> & {
  multiclassReqs: MulticlassReqs;
  weaponProficiencies: WeaponProficiencies | null;
  weaponProficienciesSpecial: WeaponProficienciesSpecial | null;
  skillProficiencies: SkillProficiencies | null;
  startingEquipmentOption: ClassStartingEquipmentOptionI[];
  classChoiceOptions: ClassChoiceOptionI[];
  classOptionalFeatures: ClassOptionalFeatureI[];
  features: ClassFeatureWithFeature[];
  subclasses: SubclassI[];
};

// =========================
//  BACKGROUND GRAPH
// =========================

type BackgroundPrisma = Prisma.BackgroundGetPayload<{
  include?: {};
}>;

export interface BackgroundI
  extends Omit<BackgroundPrisma, 'skillProficiencies' | 'toolProficiencies'> {
  skillProficiencies: SkillProficiencies;
  toolProficiencies: ToolProficiencies;
}

// =========================
//  FEAT / MAGIC ITEM / INFUSION GRAPH
// =========================

type FeatPrisma = Prisma.FeatGetPayload<{
  include: {
    featFeatures: {
      include: { feature: true };
    };
    featAbilityBoost: true;
  };
}>;

export type FeatI = FeatPrisma;

type MagicItemPrisma = Prisma.MagicItemGetPayload<{
  include: {
    givesSpells: true;
  };
}>;

export type MagicItemI = Omit<
  MagicItemPrisma,
  'weaponProficiencies' | 'weaponProficienciesSpecial'
> & {
  weaponProficiencies: WeaponProficiencies | null;
  weaponProficienciesSpecial: WeaponProficienciesSpecial | null;
};

type InfusionPrisma = Prisma.InfusionGetPayload<{
  include: {
    replicatedMagicItem: true;
    feature: true;
  };
}>;

export type InfusionI = InfusionPrisma;

// =========================
//  INCLUDE-КОНСТАНТИ ДЛЯ ПРИЗМИ
// =========================

export const RACE_FULL_INCLUDE = {
  traits: {
    include: {
      feature: true,
    },
  },
  subraces: {
    include: {
      traits: {
        include: {
          feature: true,
        },
      },
      raceChoiceOptions: {
        include: {
          traits: {
            include: {
              feature: true,
            },
          },
        },
      },
    },
  },
  raceChoiceOptions: {
    include: {
      traits: {
        include: {
          feature: true,
        },
      },
    },
  },
  raceVariants: {
    include: {
      traits: {
        include: {
          feature: true,
        },
      },
      replacesFeatures: true,
    },
  },
} satisfies Prisma.RaceInclude;

export const CLASS_FULL_INCLUDE = {
  subclasses: {
    include: {
      features: {
        include: { feature: true },
      },
      expandedSpells: true,
    },
  },
  features: {
    include: { feature: true },
  },
  startingEquipmentOption: {
    include: {
      weapon: true,
      armor: true,
      equipmentPack: true,
    },
  },
  classChoiceOptions: {
    include: {
      choiceOption: {
        include: {
          features: {
            include: { feature: true },
          },
        },
      },
    },
  },
  classOptionalFeatures: {
    include: {
      feature: {
        include: {
          classOptionalFeatures: true,
        },
      },
      replacesFeatures: {
        include: {
          replacedFeature: true,
        },
      },
      appearsOnlyIfChoicesTaken: true,
    },
  },
} satisfies Prisma.ClassInclude;

// =========================
//  ЗАПИТИ (MASTER_FULL_GRAPH)
// =========================

export const getRaces = () =>
  prisma.race.findMany({
    include: RACE_FULL_INCLUDE,
    orderBy: { raceId: 'asc' },
  }) as Promise<RaceI[]>;

export const getClasses = () =>
  prisma.class.findMany({
    include: CLASS_FULL_INCLUDE,
    orderBy: { classId: 'asc' },
  }) as Promise<ClassI[]>;

export const getBackgrounds = () =>
  prisma.background.findMany({
    orderBy: { backgroundId: 'asc' },
  }) as Promise<BackgroundI[]>;

export const getFeats = () =>
  prisma.feat.findMany({
    include: {
      featFeatures: { include: { feature: true } },
      featAbilityBoost: true,
    },
    orderBy: { featId: 'asc' },
  }) as Promise<FeatI[]>;

export const getMagicItems = () =>
  prisma.magicItem.findMany({
    include: {
      givesSpells: true,
    },
    orderBy: { magicItemId: 'asc' },
  }) as Promise<MagicItemI[]>;

export const getInfusions = () =>
  prisma.infusion.findMany({
    include: {
      replicatedMagicItem: true,
      feature: true,
    },
    orderBy: { infusionId: 'asc' },
  }) as Promise<InfusionI[]>;

// Один master-хелпер, якщо хочеш витягнути все за раз
export async function fetchDndFullGraph() {
  const [races, classes, backgrounds, feats, magicItems, infusions] =
    await prisma.$transaction([
      getRaces(),
      getClasses(),
      getBackgrounds(),
      getFeats(),
      getMagicItems(),
      getInfusions(),
    ]);

  return {
    races,
    classes,
    backgrounds,
    feats,
    magicItems,
    infusions,
  };
}

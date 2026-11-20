import type { Prisma } from "@prisma/client";

export const PERS_SHEET_INCLUDE = {
  race: {
    include: {
      traits: {
        include: {
          feature: true
        }
      }
    }
  },
  subrace: {
    include: {
      traits: {
        include: {
          feature: true
        }
      }
    }
  },
  class: {
    include: {
      features: {
        include: {
          feature: true
        }
      }
    }
  },
  subclass: {
    include: {
      features: {
        include: {
          feature: true
        }
      }
    }
  },
  multiclasses: {
    include: {
      class: {
        include: {
          features: {
            include: {
              feature: true,
            },
          },
        },
      },
      subclass: {
        include: {
          features: {
            include: {
              feature: true,
            },
          },
        },
      },
    },
  },
  background: true,
  skills: true,
  feats: { 
    include: { 
      feat: {
        include: {
          grantsFeature: true,
        },
      },
      choices: {
        include: {
          /// Фічі обраної опції несуть лічильник безкоштовного застосування заклинання риси (Р38):
          /// без них лист не знає, чим саме платити за «Посвячений у магію».
          choiceOption: { include: { features: { include: { feature: true } } } },
        }
      }
    } 
  },
  raceVariants: {
    include: {
      traits: {
        include: {
          feature: true,
        },
      },
    },
  },
  // Без orderBy Postgres віддає щойно оновлений рядок останнім, і картка стрибає під пальцем.
  magicItems: { include: { magicItem: true }, orderBy: { persMagicItemId: "asc" } },
  features: { include: { feature: true } },
  effects: {
    include: {
      spell: { select: { spellId: true, name: true, engName: true, hasConcentration: true } },
      homebrewEntry: { select: { homebrewEntryId: true, name: true } },
      magicItem: { select: { magicItemId: true, name: true, engName: true, ruleset: true, itemType: true } },
    },
  },
  classOptionalFeatures: { include: { feature: true } },
  choiceOptions: { include: { features: { include: { feature: true } } } },
  raceChoiceOptions: { include: { traits: { include: { feature: true } } } },
  spells: true,
  // Опис заклинання лист не читає — модалка бере його з каталогу, — а це до двох третин
  // ваги персонажа в сторінці (Next кладе пропси і в HTML, і в дані гідрації).
  persSpells: {
    include: {
      spell: { omit: { description: true } },
    },
    orderBy: [
      { spell: { level: "asc" } },
      { spell: { name: "asc" } },
    ],
  },
  homebrewSpells: { include: { entry: { select: { name: true, ruleset: true, spell: true } } } },
  weapons: { include: { weapon: true }, orderBy: { persWeaponId: "asc" } },
  pers_weapon_mastery: { include: { weapon: true } },
  armors: { include: { armor: true }, orderBy: { persArmorId: "asc" } },
  resourcePools: true,
  persCustomSkills: { orderBy: { name: "asc" } },
  persCustomFeatures: { orderBy: { id: "asc" } },
} satisfies Prisma.PersInclude;

/** Для друку: PDF виписує описи заклинань. */
export const PERS_PRINT_INCLUDE = {
  ...PERS_SHEET_INCLUDE,
  persSpells: { ...PERS_SHEET_INCLUDE.persSpells, include: { spell: true } },
} satisfies Prisma.PersInclude;

import {z} from "zod";
import { Ability } from "@prisma/client";
import {SkillsEnum} from "@/lib/types/enums";

export const raceSchema = z.object({
  raceId: z.number().min(1, "Оберіть, будь ласка, расу!"),
  raceSearch: z.string().default('')
})

export const subraceSchema = z.object({
  subraceId: z.number().optional(),
});

export const raceVariantSchema = z.object({
  raceVariantId: z.number().nullable().optional(),
});

export const raceChoiceOptionsSchema = z.object({
  raceChoiceSelections: z.record(z.string(), z.number().int()).default({}),
});

export const featSchema = z.object({
  featId: z.number().min(1, "Оберіть рису!"),
  featSearch: z.string().default('')
});

export const backgroundFeatSchema = z.object({
  backgroundFeatId: z.number().min(1, "Оберіть рису за походженням!"),
  backgroundFeatSearch: z.string().default('')
});

export const backgroundFeatChoiceOptionsSchema = z.object({
  backgroundFeatChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({})
});

export const classSchema = z.object({
  classId: z
    .number({ message: "Клас обовʼязковий для вибору" })
    .min(1, "Клас теж треба обрати, мандрівнику!"),
});

export const subclassSchema = z.object({
  subclassId: z.number().optional(),
  subclassChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({}),
});

export const classChoiceOptionsSchema = z.object({
  classChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({})
});

export const featChoiceOptionsSchema = z.object({
  featChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({})
});

/** Вибори риси, яку дав вибір виду (друга риса Людини 2024): три навички другого Skilled, список другого Magic Initiate. */
export const speciesFeatChoiceOptionsSchema = z.object({
  speciesFeatChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({})
});

export const classOptionalFeaturesSchema = z.object({
  classOptionalFeatureSelections: z.record(z.string(), z.boolean()).default({})
});

export const backgroundSchema = z.object({
  backgroundId: z.number().min(1, "Оберіть, будь ласка, передісторію!"),
  backgroundSearch: z.string().default('')
});

const choices = z.object({
  groupIndex: z.number(),
  choiceCount: z.number(),
  selectedAbilities: z.array(z.nativeEnum(Ability))
})

const backgroundAsiChoiceSchema = z.union([
  z.object({
    mode: z.literal("+2/+1"),
    plusTwo: z.nativeEnum(Ability),
    plusOne: z.nativeEnum(Ability),
  }),
  z.object({
    mode: z.literal("+1/+1/+1"),
    abilities: z.array(z.nativeEnum(Ability)).length(3),
  }),
])

export const asiSchema = z.object({
  isDefaultASI: z.boolean().default(true), // ТОБТО НЕ ТАША

  asiSystem: z.string().default('POINT_BUY'),
  points: z.number().default(0),
  simpleAsi: z.array(z.object({
    ability: z.string(),
    value: z.number(),
  })).default([]).optional(),
  asi: z.array(z.object({
    ability: z.string(),
    value: z.number(), // коерсимо
  })).default([]).optional(),
  customAsi: z.array(z.object({
    ability: z.string(),
    value: z.string().optional()
      // .min(0, 'замало! Має бути більше за 0').max(99, 'Забагато! має бути менше за 100'), // коерсимо
  })).default([]).optional(),

  racialBonusChoiceSchema: z.object({
    basicChoices: z.array(choices).default([]),
    tashaChoices: z.array(choices).default([])
  }).optional(),

  backgroundAsiChoice: backgroundAsiChoiceSchema.optional()
})
  .refine((data) => {
  if (data.asiSystem === 'POINT_BUY') {
    return data.asi && data.asi.length === 6 && data.points >= 0;
  }
  return true
}, {
  message: "Очків не має бути менше за 0",
  path: ['points']
}).refine((data) => {
    if (data.asiSystem === 'SIMPLE') {
      return data.simpleAsi && data.simpleAsi.length === 6;
    }
    return true;
  }, {
  message: "Помилка... Спробуйте перезавантажити сторінку 🙏",
    path: ['simpleAsi']
  }).refine((data) => {
    if (data.asiSystem === 'CUSTOM') {
      return data.customAsi
        && data.customAsi.length === 6
        && data.customAsi.every((entry) => {
          try {
            const num = Number(entry.value)
            return !isNaN(num) && entry.value != '';
          } catch {
            return false;
          }
        })
    }
    return true;
  }, {
    message: "Введіть саме числа, будь ласка!",
    path: ['customAsi', 'root']
  }).refine((data) => {
    if (data.racialBonusChoiceSchema) {
      const check = (groups: any[]) => {
        return groups.every(g => g.selectedAbilities.length === g.choiceCount)
      }
      if (data.isDefaultASI && data.racialBonusChoiceSchema.basicChoices) {
        return check(data.racialBonusChoiceSchema.basicChoices)
      }
      else if (!data.isDefaultASI && data.racialBonusChoiceSchema.tashaChoices) {
        return check(data.racialBonusChoiceSchema.tashaChoices)
      }
    }
    return true;
  }, {
    message: "Дооберіть, будь ласка",
    path: ['racialBonusChoiceSchema']
  })

const skills = z.enum(SkillsEnum)

export const skillsSchema  = z.object({
  isTasha: z.boolean().default(false),
  tashaChoices: z.array(skills).default([]),

  basicChoices: z.object({
    race: z.array(skills).default([]),
    selectedClass: z.array(skills).default([]),
    background: z.array(skills).default([]),
  }).default({
    race: [],
    selectedClass: [],
    background: [],
  }),

  choiceOptions: z.record(z.string(), z.array(skills)).default({}),
  
  // Metadata fields for validation (not stored in DB)
  _requiredCount: z.number().optional(),
  _raceCount: z.number().optional(),
  _classCount: z.number().optional(),
  _backgroundCount: z.number().optional(),
}).strict()
  .superRefine((data, ctx) => {
    // Skip validation if metadata not provided (for backward compatibility)
    if (data.isTasha && data._requiredCount !== undefined) {
      // In Tasha mode: validate total count (upper bound)
      const actualCount = data.tashaChoices.length;
      if (actualCount > data._requiredCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Оберіть не більше ${data._requiredCount} навичок`,
          path: ['tashaChoices'],
        });
      }
    } else if (!data.isTasha && data._raceCount !== undefined && data._classCount !== undefined) {
      // In basic mode: validate race and class counts separately (upper bounds)
      if (data.basicChoices.race.length > data._raceCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Оберіть не більше ${data._raceCount} навичок за расу`,
          path: ['basicChoices', 'race'],
        });
      }
      if (data.basicChoices.selectedClass.length > data._classCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Оберіть не більше ${data._classCount} навичок за клас`,
          path: ['basicChoices', 'selectedClass'],
        });
      }
      if (data._backgroundCount !== undefined && data.basicChoices.background.length > data._backgroundCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Оберіть не більше ${data._backgroundCount} навичок за передісторію`,
          path: ['basicChoices', 'background'],
        });
      }
    }
  })

export const expertiseSchema = z.object({
  expertises: z.array(skills).default([])
});

export const levelUpSkillProficienciesSchema = z.object({
  levelUpSkillSelections: z.record(z.string(), z.array(skills)).default({}),
});

export const languagesSchema = z.object({
  languages: z.array(z.string()).default([]),
});

export const backgroundEquipmentChoiceSchema = z.enum(["EQUIPMENT", "GOLD"]);

export const equipmentSchema = z.object({
    choiceGroupToId: z.record(
      z.string(), // js has no numeric keys
      z.array(z.number())
    ).default({}),
    anyWeaponSelection: z.record(z.string(), z.array(z.number())).default({}),
    backgroundEquipmentChoice: backgroundEquipmentChoiceSchema.optional()
})

export const weaponMasterySchema = z.object({
  weaponMasteryWeaponIds: z.array(z.number().int().positive()).default([]),
});

export const nameSchema = z.object({
  name: z.string()
    .max(100, "ти шо, sql інʼєкцію вирішив закинути?))) оце потужний))")
})

export const fullCharacterSchema = z.object({
  raceId: z.number(),
  raceSearch: z.string().default(''),
  subraceId: z.number().optional(),
  raceVariantId: z.number().nullable().optional(),
  raceChoiceSelections: z.record(z.string(), z.number().int()).default({}),
  featId: z.number().optional(),
  classId: z.number().min(1, "Клас обовʼязковий для вибору"),
  subclassId: z.number().optional(),
  subclassChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({}),
  classChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({}),
  featChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({}),
  backgroundFeatId: z.number().optional(),
  backgroundFeatChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({}),
  speciesFeatChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({}),
  classOptionalFeatureSelections: z.record(z.string(), z.boolean()).default({}),
  backgroundId: z.number(),
  backgroundSearch: z.string().default(''),
  isDefaultASI: z.boolean().default(true),
  asiSystem: z.string().default('POINT_BUY'),
  points: z.number().min(0).default(0),
  simpleAsi: z.array(z.object({ability: z.string(), value: z.number()})).default([]),
  customAsi: z.array(z.object({ ability: z.string(), value: z.string().transform((val) => (val === '' ? 10 : Number(val)))})).default([]).optional(),
  asi: z.array(z.object({ability: z.string(), value: z.number()})).default([]),
  skills: z.array(z.string()).default([]),
  equipment: z.array(z.number()).default([]),
  weaponMasteryWeaponIds: z.array(z.number().int().positive()).default([]),
  name: z.string().default(''),
  racialBonusChoiceSchema: z.object({
    basicChoices: z.array(choices).default([]),
    tashaChoices: z.array(choices).default([])
  }).optional(),
  skillsSchema: skillsSchema.optional(),
  expertiseSchema: expertiseSchema.optional(),
  languagesSchema: languagesSchema.optional(),
  equipmentSchema: equipmentSchema.optional(),
  /// Без `.default` навмисно: коли редакції в запиті немає, її дає обраний клас
  /// (`createCharacter`, `validData.ruleset ?? characterClass.ruleset`). Дефолт робив цей
  /// запасний шлях мертвим і перетворював кожного персонажа 2024 на 2014.
  ruleset: z.enum(["RULES_2014", "RULES_2024"]).optional(),
  backgroundAsiChoice: backgroundAsiChoiceSchema.optional(),
  nameSchema: nameSchema.optional()
  ,
  // -------------------------------------------------------------------------
  // Level-up (не використовується під час створення персонажа)
  // -------------------------------------------------------------------------
  levelUpPath: z.enum(["EXISTING", "MULTICLASS"]).optional(),
  levelUpAsiChoiceType: z.enum(["ASI", "FEAT"]).optional(),
  levelUpHpIncrease: z.number().int().min(0).optional(),
  levelUpHpMode: z.enum(["AVERAGE", "RANDOM", "MANUAL"]).optional(),
  levelUpHpManualInput: z.string().optional(),
  levelUpSkillSelections: z.record(z.string(), z.array(skills)).default({}).optional(),
  featSpellIds: z.array(z.number().int().positive()).optional(),
})

 .superRefine((data, ctx) => {
   if (data.subraceId != null && data.raceVariantId != null) {
     ctx.addIssue({
       code: z.ZodIssueCode.custom,
       message: "Оберіть або підрасу, або варіант раси",
       path: ["raceVariantId"],
     });
   }
 })


export type PersFormData = z.infer<typeof fullCharacterSchema>



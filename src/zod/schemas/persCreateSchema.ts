import {z} from "zod";
import { Ability, Skills } from "@prisma/client";
import {SkillsEnum} from "@/types/enums";

export const raceSchema = z.object({
  raceId: z.number().min(1, "Треба обрати расу 😈")
})

export const classSchema = z.object({
  classId: z.number().min(1, "Клас теж треба обрати, мандрівнику!"),
});

export const backgroundSchema = z.object({
  backgroundId: z.number().min(1, "Передісторію не обрано... ти хто взагалі?"),
});

const choices = z.object({
  groupIndex: z.number(),
  choiceCount: z.number(),
  selectedAbilities: z.array(z.enum(Ability))
})

export const asiSchema = z.object({
  isDefaultASI: z.boolean().default(false), // ТОБТО НЕ ТАША

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
  }).optional()
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
  isTasha: z.boolean().default(true),
  tashaChoices: z.array(skills).default([]),

  basicChoices: z.object({
    race: z.array(skills).default([]),
    selectedClass: z.array(skills).default([]),
  }).default({
    race: [],
    selectedClass: [],
  })
}).strict()

export const equipmentSchema = z.object({
    choiceGroupToId: z.record(
      z.string(), // js has no numeric keys
      z.array(z.number())
    ).default({})
})

export const nameSchema = z.object({
  name: z.string()
    .max(100, "ти шо, sql ін'єкцію вирішив закинути?))) оце потужний))")
})

export const fullCharacterSchema = z.object({
  raceId: z.number(),
  classId: z.number(),
  backgroundId: z.number(),
  isDefaultASI: z.boolean().default(false),
  asiSystem: z.string().default('POINT_BUY'),
  points: z.number().min(0).default(0),
  simpleAsi: z.array(z.object({ability: z.string(), value: z.number()})).default([]),
  customAsi: z.array(z.object({ ability: z.string(), value: z.string().transform((val) => (val === '' ? 10 : Number(val)))})).default([]).optional(),
  asi: z.array(z.object({ability: z.string(), value: z.number()})).default([]),
  skills: z.array(z.string()),
  equipment: z.array(z.number()),
  name: z.string(),
  racialBonusChoiceSchema: z.object({
    basicChoices: z.array(choices).default([]),
    tashaChoices: z.array(choices).default([])
  }).optional(),
  skillsSchema,
  equipmentSchema,
  nameSchema
})


export type PersFormData = z.infer<typeof fullCharacterSchema>

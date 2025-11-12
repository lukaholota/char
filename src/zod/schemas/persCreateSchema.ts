import {z} from "zod";
import {Ability} from "@prisma/client";

export const raceSchema = z.object({
  raceId: z.number().min(1, "Треба обрати расу 😈")
})

export const classSchema = z.object({
  classId: z.number().min(1, "Клас теж треба обрати, мандрівнику!"),
});

export const backgroundSchema = z.object({
  backgroundId: z.number().min(1, "Передісторію не обрано... ти хто взагалі?"),
});

export const asiSchema = z.object({
  isDefaultASI: z.boolean().default(false), // ТОБТО НЕ ТАША

  asiSystem: z.string().default('POINT_BUY'),
  points: z.coerce.number().default(0),
  simpleAsi: z.array(z.object({
    ability: z.string(),
    value: z.number(), // коерсимо
  })).optional(),
  asi: z.array(z.object({
    ability: z.string(),
    value: z.number(), // коерсимо
  })).optional()
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
  })
export const equipmentSchema = z.object({
  equipment: z.array(z.number()), // коерсимо
})

export const nameSchema = z.object({
  name: z.string()
    .max(100, "ти шо, sql ін'єкцію вирішив закинути?))) оце потужний))")
})

export const fullCharacterSchema = z.object({
  raceId: z.number(),
  classId: z.number(),
  backgroundId: z.number(),
  isDefaultASI: z.boolean(),
  asiSystem: z.string().default('POINT_BUY'),
  points: z.number().int().min(0).default(27),
  simpleAsi: z.array(z.object({ability: z.string(), value: z.number()})),
  asi: z.array(z.object({ability: z.string(), value: z.number()})),
  skills: z.array(z.string()),
  equipment: z.array(z.number()),
  name: z.string(),
})

export type PersFormData = z.infer<typeof fullCharacterSchema>

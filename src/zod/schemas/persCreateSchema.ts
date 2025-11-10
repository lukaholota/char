import {z} from "zod";

export const raceSchema = z.object({
    raceId: z.number().min(1, "Треба обрати расу 😈")
})

export const classSchema = z.object({
    classId: z.number().min(1, "Клас теж треба обрати, мандрівнику!")
})

export const backgroundSchema = z.object({
    backgroundId: z.number().min(1, "Передісторію не обрано... ти хто взагалі?")
})

export const asiSchema = z.object({
    isDefaultASI: z.boolean().default(false),

    isSimpleASI: z.boolean().default(false),
    isCustomASI: z.boolean().default(false),
    isPointBuyASI: z.boolean().default(true),
    asi: z.array(z.object({
        ability: z.string(),
        value: z.number()
    }))
})
export const equipmentSchema = z.object({
    equipment: z.array(z.number())
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
    isSimpleASI: z.boolean(),
    isCustomASI: z.boolean(),
    isPointBuyASI: z.boolean(),
    asi: z.array(z.object({ ability: z.string(), value: z.number() })),
    skills: z.array(z.string()),
    equipment: z.array(z.number()),
    name: z.string(),
})

export type PersFormData = z.infer<typeof fullCharacterSchema>

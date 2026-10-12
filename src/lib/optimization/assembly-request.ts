import { z } from "zod";
import { fullCharacterSchema } from "@/lib/zod/schemas/persCreateSchema";
import { idSchema } from "./schema";

const spellKeys = z.array(idSchema).max(20);
export const openSpellSelectionSchema = z.strictObject({
  characterLevel: z.number().int().min(2).max(20),
  cantripKeys: spellKeys.optional(),
  knownSpellKeys: spellKeys.optional(),
  spellbookKeys: spellKeys.optional(),
});

const abilitySchema = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
export const openAdvancementSchema = z.strictObject({
  characterLevel: z.number().int().min(2).max(20),
  featKey: idSchema.optional(),
  featOptions: z.array(z.strictObject({ optionNameEng: z.string().min(1).max(120) })).max(1).optional(),
  abilityScoreIncrease: z.array(z.strictObject({ ability: abilitySchema, amount: z.union([z.literal(1), z.literal(2)]) })).min(1).max(2).optional(),
}).refine((entry) => !!entry.featKey !== !!entry.abilityScoreIncrease, "Оберіть або рису, або підвищення характеристик")
  .refine((entry) => !entry.featOptions || !!entry.featKey, "Варіант потребує риси");

export const openClassOptionSchema = z.strictObject({
  characterLevel: z.number().int().min(2).max(20),
  classOptions: z.array(z.strictObject({ optionNameEng: z.string().min(1).max(120), groupName: z.string().min(1).max(120).optional() })).min(1).max(6),
});

export const buildAssemblyRequestSchema = z.strictObject({
  buildId: idSchema,
  revisionId: idSchema,
  targetLevel: z.number().int().min(1).max(20),
  requestId: z.uuid(),
  start: fullCharacterSchema,
  openSelections: z.array(openSpellSelectionSchema).max(19).default([]),
  openAdvancements: z.array(openAdvancementSchema).max(19).default([]),
  openClassOptions: z.array(openClassOptionSchema).max(19).default([]),
  preparedSpellKeys: z.array(idSchema).max(40).optional(),
});

export type BuildAssemblyRequest = z.infer<typeof buildAssemblyRequestSchema>;

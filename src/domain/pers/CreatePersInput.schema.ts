import { SkillsEnum } from "@/lib/types/enums";
import { Ability } from "@prisma/client";
import { z } from "zod";

export const AbilitySchema = z.enum(Ability)

export const createPersInputSchema = z.object({
  name: z.string().min(1),
  raceId: z.number().int().positive(),
  classId: z.number().int().positive(),
  subclassId: z.number().int().positive().optional(),
  backgroundId: z.number().int().positive(),

  abilityScores: z.record(AbilitySchema, z.number()),

  skills: z.array(z.enum(SkillsEnum)).optional(),
  equipmentIds: z.array(z.number()),

  classChoiceOptions: z.array(z.number()).optional(),
  classOptionalFeatures: z.array(z.number()).optional(),
  subclassChoiceOptions: z.array(z.number()).optional(),
  subclassOptionalFeatures: z.array(z.number()).optional(),
});

export type CreatePersInput =
  z.infer<typeof createPersInputSchema>;
export type AbilitySchema = z.infer<typeof AbilitySchema>;
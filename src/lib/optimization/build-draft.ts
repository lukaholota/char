import { z } from "zod";
import { buildDetailsSchema, idSchema } from "./schema";

export const buildDraftSchema = z.object({
  buildId: idSchema, revisionId: idSchema,
  raceId: z.number().int().positive().optional(),
  scores: buildDetailsSchema.shape.abilityScores,
  notes: z.string(), customized: z.boolean(), scoresCustomized: z.boolean().default(false),
});

export function countRemainingBuildPoints(scores: { value: number }[]): number {
  const costs: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  return 27 - scores.reduce((spent, score) => spent + (costs[score.value] ?? Infinity), 0);
}

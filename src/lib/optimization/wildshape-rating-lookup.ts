import type { Ruleset } from "@prisma/client";
import type { WildshapeEligibility } from "@/rules/wildshape";
import type { WildshapeStanding } from "@/server/db/wildshape";
import type { SpellRatingScore } from "./spell-rating-extraction";
import { isSpellRatingScore } from "./spell-rating-lookup";

export type WildshapeRatingCatalog = {
  titleUk: string;
  articleSlug: string;
  sourceUrl: string;
  movementNote: string;
  sections: Record<string, { title: string; notes: string[] }>;
  forms: Record<string, { score: number; moonScore?: number; sectionId: string; comment: string }>;
};

export type WildshapeFormRating = { score: SpellRatingScore; sectionId: string; comment: string };

export type WildshapeRatingNotes = { sectionTitle: string; sectionNotes: string[]; movementNote: string | null };

const MOVEMENT_LOCKS = new Set(["flySpeedLocked", "swimSpeedLocked"]);

/// Гайд RPGbot — про Дику форму 2014; друїд 2024 на будь-якому каталозі й 2014-й друїд у каталозі 2024 оцінок не бачать.
export function canRateWildshape(catalogRuleset: Ruleset, standing: Pick<WildshapeStanding, "ruleset" | "limits"> | null): boolean {
  return catalogRuleset === "RULES_2014" && standing?.ruleset === "RULES_2014" && standing.limits !== null;
}

export function findWildshapeFormRating(catalog: WildshapeRatingCatalog, creatureKey: string, isMoonCircle: boolean): WildshapeFormRating | null {
  const form = Object.hasOwn(catalog.forms, creatureKey) ? catalog.forms[creatureKey] : null;
  if (!form) return null;
  const score = isMoonCircle && form.moonScore !== undefined ? form.moonScore : form.score;
  return isSpellRatingScore(score) ? { score, sectionId: form.sectionId, comment: form.comment } : null;
}

export function findWildshapeRatingNotes(catalog: WildshapeRatingCatalog, rating: WildshapeFormRating, eligibility: WildshapeEligibility | null): WildshapeRatingNotes {
  const section = catalog.sections[rating.sectionId];
  const isMovementLocked = eligibility?.reasons.some((reason) => MOVEMENT_LOCKS.has(reason.kind)) ?? false;
  return {
    sectionTitle: section?.title ?? "",
    sectionNotes: section?.notes ?? [],
    movementNote: isMovementLocked ? catalog.movementNote : null,
  };
}

/// Піднімається вгору лише форма, яку друїд може прийняти вже зараз; решта лишається на місці зі своїм значком.
export function findRecommendationScore(rating: WildshapeFormRating | null, eligibility: WildshapeEligibility | null): number | null {
  return rating && eligibility?.eligible ? rating.score : null;
}

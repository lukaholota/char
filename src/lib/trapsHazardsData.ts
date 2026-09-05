import trapsHazards from "./generated/traps-hazards.json";
import { GeneratedTrapHazard } from "./trapHazardTypes";
import { Ruleset } from "@prisma/client";

const TRAPS_HAZARDS = trapsHazards as unknown as GeneratedTrapHazard[];

export function getTrapsHazards(ruleset: Ruleset): GeneratedTrapHazard[] {
  return TRAPS_HAZARDS.filter((article) => article.ruleset === ruleset).sort((a, b) => a.order - b.order);
}

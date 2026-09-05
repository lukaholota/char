import { Ruleset } from "@prisma/client";
import { RuleProvenance } from "./rulesProvenance";

export type TrapHazardRating = { tier?: number; threat?: string; level?: { min: number; max: number } };

/// KR23.3 бере пастки й небезпеки лише з дзеркала 5etools — походження завжди `beyond-srd`,
/// на відміну від `RuleArticle`, де воно буває рукописним чи SRD. Вужчий тип, а не повний
/// `RuleProvenance`, знімає потребу звужувати union у кожному місці, де читається `book`.
export type TrapHazardProvenance = Extract<RuleProvenance, { kind: "beyond-srd" }>;

export type GeneratedTrapHazard = {
  id: string;
  slug: string;
  kind: "trap" | "hazard";
  category: "gamemaster";
  title: string;
  engTitle: string;
  ruleset: Ruleset;
  order: number;
  tags: string[];
  trapHazType: string | null;
  rating: TrapHazardRating[];
  subsections: { id: string; title: string; engTitle: string; content: string }[];
  provenance: TrapHazardProvenance;
  isTranslated: boolean;
};

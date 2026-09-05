import { Ruleset } from "@prisma/client";
import { RuleProvenance } from "./rulesProvenance";

/// KR23.5 бере обʼєкти лише з дзеркала 5etools — походження завжди `beyond-srd`, той самий
/// прийом звуження типу, що `TrapHazardProvenance` для пасток і небезпек KR23.3.
export type ObjectProvenance = Extract<RuleProvenance, { kind: "beyond-srd" }>;

export type GeneratedObjectStatblock = {
  id: string;
  slug: string;
  category: "gamemaster";
  title: string;
  engTitle: string;
  ruleset: Ruleset;
  order: number;
  tags: string[];
  size: string;
  objectType: string;
  ac: number;
  hp: number;
  immune: string[];
  subsections: { id: string; title: string; engTitle: string; content: string }[];
  provenance: ObjectProvenance;
  isTranslated: boolean;
};

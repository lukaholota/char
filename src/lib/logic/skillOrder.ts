import { Skills } from "@prisma/client";

// Deterministic skill ordering (UA sheet expectation).
// Matches the order provided in the issue description.
export const SKILL_ORDER_UA_SHEET: Skills[] = [
  Skills.ACROBATICS,
  Skills.INSIGHT,
  Skills.PERFORMANCE,
  Skills.ATHLETICS,
  Skills.SURVIVAL,
  Skills.ANIMAL_HANDLING,
  Skills.INTIMIDATION,
  Skills.HISTORY,
  Skills.MEDICINE,
  Skills.ARCANA,
  Skills.DECEPTION,
  Skills.INVESTIGATION,
  Skills.PERSUASION,
  Skills.NATURE,
  Skills.RELIGION,
  Skills.STEALTH,
  Skills.SLEIGHT_OF_HAND,
  Skills.PERCEPTION,
];

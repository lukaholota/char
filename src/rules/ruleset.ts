import type { Ruleset } from "./types";

export function readRuleset(value: string | null | undefined): Ruleset {
  return value === "RULES_2024" ? "RULES_2024" : "RULES_2014";
}

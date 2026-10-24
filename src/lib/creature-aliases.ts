import { toEntitySlug } from "@/lib/slug-utils";
import type { Ruleset } from "@/rules/types";

const ALIASES_2024: Record<string, string> = {
  "beholder-2024": "beholder",
  "спостерігач (бехолдер 2024)": "beholder",
  "20022": "beholder",
};

export function resolveCreatureAlias(key: string, ruleset: Ruleset): string {
  const normalized = toEntitySlug(key);
  return ruleset === "RULES_2024" ? ALIASES_2024[key.trim().toLowerCase()] ?? ALIASES_2024[normalized] ?? normalized : normalized;
}

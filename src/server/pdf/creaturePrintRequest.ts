import type { Ruleset } from "@prisma/client";

const MAX_CREATURES_PER_PRINT = 50;

export type CreaturePrintRequest = {
  ruleset: Ruleset;
  keys: string[];
};

export class CreaturePrintRequestError extends Error {}

export function parseCreaturePrintRequest(searchParams: URLSearchParams): CreaturePrintRequest {
  const ruleset = parseRuleset(searchParams.get("ruleset"));
  const keys = parseCreatureKeys(searchParams.get("keys"));
  if (keys.length === 0) throw new CreaturePrintRequestError("Оберіть хоча б одну істоту");
  if (keys.length > MAX_CREATURES_PER_PRINT) {
    throw new CreaturePrintRequestError(`За один раз можна надрукувати до ${MAX_CREATURES_PER_PRINT} істот`);
  }
  return { ruleset, keys };
}

function parseRuleset(rawRuleset: string | null): Ruleset {
  if (rawRuleset === "RULES_2014" || rawRuleset === "RULES_2024") return rawRuleset;
  throw new CreaturePrintRequestError("Невідома редакція бестіарію");
}

function parseCreatureKeys(rawKeys: string | null): string[] {
  if (!rawKeys) return [];
  return Array.from(
    new Set(rawKeys.split(",").map((key) => key.trim()).filter(Boolean))
  );
}

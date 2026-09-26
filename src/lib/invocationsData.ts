/**
 * Static Eldritch Invocations data helpers for SSG pages and client catalogs.
 *
 * Reads from generated 2014 JSON file or normalized 2024 JSON.
 */

import { Ruleset } from "@/lib/prisma-enums";
import invocations2014Json from "./generated/invocations.json";
import invocations2024Json from "../../data/2024/normalized/invocations.json";
import { toEntitySlug } from "./slug-utils";

export type InvocationData = {
  id: number;
  name: string;
  nameUa: string;
  engName: string;
  minLevel: number | null;
  pactRequirement: string | null;
  prerequisite: string | null;
  description: string;
  shortDescription: string;
  ruleset: Ruleset;
  source: string;
};

const invocations2014: InvocationData[] = (invocations2014Json as Array<{
  id: number;
  name: string;
  nameUa: string;
  engName: string;
  minLevel: number | null;
  pactRequirement: string | null;
  prerequisite: string | null;
  description: string;
  shortDescription: string;
  source: string;
}>).map((inv) => ({
  id: inv.id,
  name: inv.name,
  nameUa: inv.nameUa,
  engName: inv.engName,
  minLevel: inv.minLevel,
  pactRequirement: inv.pactRequirement,
  prerequisite: inv.prerequisite,
  description: inv.description,
  shortDescription: inv.shortDescription,
  ruleset: "RULES_2014" as Ruleset,
  source: inv.source || "PHB_2014",
}));

const invocations2024: InvocationData[] = (invocations2024Json as Array<{
  id: number;
  name: string;
  nameUa: string;
  engName: string;
  minLevel: number | null;
  pactRequirement: string | null;
  prerequisite: string | null;
  description: string;
  shortDescription: string;
  source: string;
}>).map((inv) => ({
  id: inv.id,
  name: inv.name,
  nameUa: inv.nameUa,
  engName: inv.engName,
  minLevel: inv.minLevel,
  pactRequirement: inv.pactRequirement,
  prerequisite: inv.prerequisite,
  description: inv.description,
  shortDescription: inv.shortDescription,
  ruleset: "RULES_2024" as Ruleset,
  source: inv.source || "PHB_2024",
}));

/**
 * Get all Eldritch Invocations for a given ruleset (defaults to RULES_2014)
 */
export function getAllInvocations(ruleset: Ruleset = "RULES_2014"): InvocationData[] {
  return ruleset === "RULES_2024" ? invocations2024 : invocations2014;
}

/**
 * Get invocation by ID for a specific ruleset
 */
export function getInvocationById(id: number, ruleset: Ruleset = "RULES_2014"): InvocationData | undefined {
  const list = getAllInvocations(ruleset);
  return list.find((i) => i.id === id);
}

/**
 * Get invocation by ID, slug, English name or Ukrainian name
 */
export function getInvocationByIdOrSlug(idOrSlug: string, ruleset: Ruleset = "RULES_2014"): InvocationData | undefined {
  const trimmed = idOrSlug.trim();
  const asNumber = Number(trimmed);

  if (Number.isFinite(asNumber)) {
    return getInvocationById(Math.trunc(asNumber), ruleset);
  }

  const slug = toEntitySlug(trimmed);
  const list = getAllInvocations(ruleset);
  return list.find(
    (i) =>
      i.engName.toLowerCase() === trimmed.toLowerCase() ||
      toEntitySlug(i.engName) === slug ||
      i.nameUa.toLowerCase() === trimmed.toLowerCase() ||
      i.name.toLowerCase() === trimmed.toLowerCase()
  );
}

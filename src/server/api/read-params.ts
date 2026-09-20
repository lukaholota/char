import type { Ruleset } from "@prisma/client";
import { NextResponse } from "next/server";
import { HOMEBREW_KINDS, type HomebrewKind } from "@/lib/logic/homebrew-input";

const RULESETS: readonly Ruleset[] = ["RULES_2014", "RULES_2024"];

export function readRuleset(params: URLSearchParams): Ruleset | null {
  const value = params.get("ruleset");
  return RULESETS.find((ruleset) => ruleset === value) ?? null;
}

export function readHomebrewKind(params: URLSearchParams): HomebrewKind | null {
  const value = params.get("kind");
  return HOMEBREW_KINDS.find((kind) => kind === value) ?? null;
}

export function respondBadRequest(reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status: 400 });
}

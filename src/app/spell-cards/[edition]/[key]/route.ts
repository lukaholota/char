import { NextResponse } from "next/server";
import type { Ruleset } from "@prisma/client";
import { getSpellByIdOrSlug } from "@/lib/spellsData";

const RULESET_BY_EDITION: Record<string, Ruleset> = { "2014": "RULES_2014", "2024": "RULES_2024" };

export async function GET(_request: Request, { params }: { params: Promise<{ edition: string; key: string }> }) {
  const { edition, key } = await params;
  const ruleset = RULESET_BY_EDITION[edition];
  const spell = ruleset ? getSpellByIdOrSlug(decodeURIComponent(key), ruleset) : undefined;
  if (!spell) return NextResponse.json(null, { status: 404 });

  return NextResponse.json(spell, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=604800" },
  });
}

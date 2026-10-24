import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadSelectedSpellNames } from "@/server/db/selected-spells";

const querySchema = z.object({
  ruleset: z.enum(["RULES_2014", "RULES_2024"]),
  ids: z.array(z.coerce.number().int().positive()).min(1).max(300),
});

export async function GET(request: NextRequest) {
  const query = querySchema.safeParse({
    ruleset: request.nextUrl.searchParams.get("ruleset"),
    ids: request.nextUrl.searchParams.get("ids")?.split(","),
  });
  if (!query.success) return NextResponse.json({ error: "Некоректний запит заклинань" }, { status: 400 });
  const spells = await loadSelectedSpellNames(query.data.ruleset, [...new Set(query.data.ids)]);
  return NextResponse.json(spells, { headers: { "Cache-Control": "public, max-age=300" } });
}

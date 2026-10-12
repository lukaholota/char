import { NextResponse } from "next/server";
import { z } from "zod";
import { loadReadyPresetCatalog } from "@/lib/optimization/ready-preset.server";
import { findPresetSuggestions } from "@/lib/optimization/ready-preset-suggestion";
import { idSchema } from "@/lib/optimization/schema";

const querySchema = z.object({
  classKey: idSchema,
  subclassKey: idSchema.optional(),
  raceKey: idSchema.optional(),
});
const HEADERS = { "cache-control": "private, max-age=300", "x-robots-tag": "noindex, nofollow" };

export async function GET(request: Request) {
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return new NextResponse(null, { status: 400, headers: HEADERS });
  const suggestions = findPresetSuggestions(await loadReadyPresetCatalog(), {
    classKey: query.data.classKey,
    subclassKey: query.data.subclassKey ?? null,
    raceKey: query.data.raceKey ?? null,
  });
  return NextResponse.json({ total: suggestions.length, best: suggestions[0] ?? null }, { headers: HEADERS });
}

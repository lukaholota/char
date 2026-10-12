import { NextResponse } from "next/server";
import { findCardTargetInHref } from "@/lib/optimization/reference-card-target";
import { loadReferenceCard } from "@/lib/optimization/reference-cards.server";

export async function GET(request: Request) {
  const target = findCardTargetInHref(new URL(request.url).searchParams.get("href") ?? "");
  const card = target ? loadReferenceCard(target) : null;
  if (!card) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(card, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=604800" } });
}

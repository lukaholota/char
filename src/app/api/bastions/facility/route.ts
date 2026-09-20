import { NextResponse } from "next/server";
import { getBastionFacilityBySlug } from "@/lib/bastionsData";
import { respondBadRequest } from "@/server/api/read-params";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return respondBadRequest("Потрібен slug");

  return NextResponse.json(getBastionFacilityBySlug(slug) ?? null);
}

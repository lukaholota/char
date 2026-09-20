import { NextResponse } from "next/server";
import { loadDiscussion } from "@/server/db/content-discussion";
import { respondBadRequest } from "@/server/api/read-params";

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("target");
  if (!target) return respondBadRequest("Потрібен target");

  return NextResponse.json(await loadDiscussion(target), { headers: { "Cache-Control": "no-store" } });
}

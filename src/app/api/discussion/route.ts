import { NextResponse } from "next/server";
import { loadDiscussion } from "@/server/db/content-discussion";
import { respondBadRequest } from "@/server/api/read-params";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const target = params.get("target");
  if (!target) return respondBadRequest("Потрібен target");

  return NextResponse.json(await loadDiscussion(target, params.get("noAi") === "1"), { headers: { "Cache-Control": "no-store" } });
}

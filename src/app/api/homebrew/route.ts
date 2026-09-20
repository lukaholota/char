import { NextResponse } from "next/server";
import { listHomebrewEntries } from "@/server/db/homebrew";
import { readHomebrewKind, readRuleset, respondBadRequest } from "@/server/api/read-params";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = readHomebrewKind(params);
  const ruleset = readRuleset(params);
  if (!kind || !ruleset) return respondBadRequest("Потрібні kind і ruleset");

  const entries = await listHomebrewEntries({ kind, ruleset, sort: params.get("sort") === "NEW" ? "NEW" : "TOP" });
  return NextResponse.json(entries, { headers: { "Cache-Control": "no-store" } });
}

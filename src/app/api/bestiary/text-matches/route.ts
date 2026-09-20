import { NextResponse } from "next/server";
import { findCreatureKeysMatchingText } from "@/lib/actions/bestiary-actions";
import { readRuleset, respondBadRequest } from "@/server/api/read-params";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ruleset = readRuleset(params);
  if (!ruleset) return respondBadRequest("Потрібен ruleset");

  return NextResponse.json(await findCreatureKeysMatchingText(params.get("q") ?? "", ruleset));
}

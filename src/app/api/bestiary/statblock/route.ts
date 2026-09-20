import { NextResponse } from "next/server";
import { findCreatureByKey } from "@/lib/bestiaryData";
import { findCreatureLoreGroup } from "@/lib/bestiaryLore";
import { readRuleset, respondBadRequest } from "@/server/api/read-params";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ruleset = readRuleset(params);
  const key = params.get("key");
  if (!ruleset || !key) return respondBadRequest("Потрібні key і ruleset");

  const creature = findCreatureByKey(key, ruleset);
  return NextResponse.json({
    creature,
    loreGroup: creature ? findCreatureLoreGroup(creature.creatureId, ruleset) : null,
  });
}

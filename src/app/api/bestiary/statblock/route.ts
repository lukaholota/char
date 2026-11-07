import { NextResponse } from "next/server";
import { findCreatureLoreGroup } from "@/lib/bestiaryLore";
import { readRuleset, respondBadRequest } from "@/server/api/read-params";
import { findRoomCreature } from "@/server/db/room-creatures";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ruleset = readRuleset(params);
  const key = params.get("key");
  if (!ruleset || !key) return respondBadRequest("Потрібні key і ruleset");

  const creature = await findRoomCreature(key, ruleset);
  return NextResponse.json({
    creature,
    loreGroup: creature ? findCreatureLoreGroup(creature.creatureId, ruleset) : null,
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { parseTokenPosition } from "@/rules/game-map";
import { signalMapPing } from "@/server/db/game-sessions";
import { tryTakeMapPingSlot } from "@/server/game-sessions/game-session-limits";
import { findMemberRequest, NO_STORE_HEADERS, respondWithError } from "@/server/game-sessions/game-session-request";

export const dynamic = "force-dynamic";

/// Сцену бере сервер із того, що учасник зараз бачить: гравець не може вказати на сцену, якої йому не показали.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await findMemberRequest((await params).id);
  if (member instanceof NextResponse) return member;
  if (member.isArchived) return respondWithError(409, "archived");
  if (member.viewedSceneId === null) return respondWithError(409, "no_scene");
  const at = parseTokenPosition(await request.json().catch(() => null));
  if (!at) return respondWithError(422, "bad_position");
  if (!tryTakeMapPingSlot(member.userId)) return respondWithError(429, "too_many_pings");
  await signalMapPing(member.sessionId, member.userId, member.viewedSceneId, at);
  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}

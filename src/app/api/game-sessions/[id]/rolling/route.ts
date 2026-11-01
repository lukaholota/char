import { NextResponse, type NextRequest } from "next/server";
import { isGameRollVisibility } from "@/rules/game-roll";
import { signalGameRollStart } from "@/server/db/game-sessions";
import { tryTakeRollStartSlot } from "@/server/game-sessions/game-session-limits";
import { findMemberRequest, NO_STORE_HEADERS, respondWithError } from "@/server/game-sessions/game-session-request";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await findMemberRequest((await params).id);
  if (member instanceof NextResponse) return member;
  if (member.isArchived) return respondWithError(409, "archived");
  const visibility = ((await request.json().catch(() => null)) as { visibility?: unknown } | null)?.visibility;
  if (!isGameRollVisibility(visibility)) return respondWithError(422, "bad_visibility");
  if (visibility === "SELF") return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
  if (!tryTakeRollStartSlot(member.userId)) return respondWithError(429, "too_many_rolls");
  await signalGameRollStart(member.sessionId, member.userId, visibility);
  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}

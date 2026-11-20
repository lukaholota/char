import { NextResponse, type NextRequest } from "next/server";
import { isOwnSoundKey, isSceneSoundKey } from "@/rules/game-atmosphere";
import { signalSceneSound } from "@/server/db/game-sessions";
import { isOwnSound } from "@/server/db/user-sounds";
import { tryTakeSceneSoundSlot } from "@/server/game-sessions/game-session-limits";
import { findMemberRequest, NO_STORE_HEADERS, respondWithError } from "@/server/game-sessions/game-session-request";

export const dynamic = "force-dynamic";

/// Звук чують ті, хто дивиться ту саму сцену, що й майстер; сам майстер грає його в себе без потоку.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await findMemberRequest((await params).id);
  if (member instanceof NextResponse) return member;
  if (!member.isGm) return respondWithError(403, "forbidden");
  if (member.isArchived) return respondWithError(409, "archived");
  if (member.viewedSceneId === null) return respondWithError(409, "no_scene");
  const body = (await request.json().catch(() => null)) as { key?: unknown } | null;
  const key = body?.key;
  if (!isSceneSoundKey(key)) return respondWithError(422, "bad_sound");
  if (!tryTakeSceneSoundSlot(member.userId)) return respondWithError(429, "too_many_sounds");
  if (isOwnSoundKey(key) && !(await isOwnSound(member.userId, key))) return respondWithError(404, "sound_gone");
  await signalSceneSound(member.sessionId, member.userId, member.viewedSceneId, key);
  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}

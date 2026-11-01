import { NextResponse, type NextRequest } from "next/server";
import { openGameSessionStream } from "@/server/game-sessions/game-session-stream";
import { tryOpenStreamSlot } from "@/server/game-sessions/game-session-limits";
import { findMemberRequest, parseSeq, respondWithError } from "@/server/game-sessions/game-session-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await findMemberRequest((await params).id);
  if (member instanceof NextResponse) return member;
  const releaseSlot = tryOpenStreamSlot(member.userId);
  if (!releaseSlot) return respondWithError(429, "too_many_streams");
  request.signal.addEventListener("abort", releaseSlot);

  const afterSeq = parseSeq(request.nextUrl.searchParams.get("after") ?? request.headers.get("last-event-id"));
  const stream = openGameSessionStream({ sessionId: member.sessionId, userId: member.userId, afterSeq, abortSignal: request.signal });
  const released = stream.pipeThrough(new TransformStream({ flush: releaseSlot }));
  return new Response(released, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform, private",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

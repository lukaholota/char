import { NextResponse, type NextRequest } from "next/server";
import { captureServerPostHogEvent } from "@/lib/monitoring/posthog-server";
import { insertGameRollEvent, listEventsBefore } from "@/server/db/game-roll-events";
import { tryTakeRollSlot } from "@/server/game-sessions/game-session-limits";
import { findMemberRequest, NO_STORE_HEADERS, parseSeq, respondWithError } from "@/server/game-sessions/game-session-request";
import { MAX_ROLL_BODY_BYTES, parseGameRollDraft } from "@/server/game-sessions/parse-game-roll-draft";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const FAILURE_STATUS = { not_found: 404, forbidden: 403, archived: 409, bad_pers: 422, bad_target: 422 } as Record<string, number>;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await findMemberRequest((await params).id);
  if (member instanceof NextResponse) return member;
  const beforeSeq = parseSeq(request.nextUrl.searchParams.get("before"));
  const page = await listEventsBefore(member.sessionId, { userId: member.userId, isGm: member.isGm }, beforeSeq, PAGE_SIZE);
  return NextResponse.json(page, { headers: NO_STORE_HEADERS });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await findMemberRequest((await params).id);
  if (member instanceof NextResponse) return member;
  if (member.isArchived) return respondWithError(409, "archived");

  const body = await readLimitedJson(request);
  if (body === undefined) return respondWithError(413, "too_large");
  const parsed = parseGameRollDraft(body);
  if ("problem" in parsed) return respondWithError(422, parsed.problem);
  if (!tryTakeRollSlot(member.userId)) return respondWithError(429, "too_many_rolls");

  const result = await insertGameRollEvent(member.sessionId, member.userId, parsed.draft);
  if (!result.ok) return respondWithError(FAILURE_STATUS[result.error] ?? 400, result.error);
  captureServerPostHogEvent("game_roll_published", { source: parsed.draft.source, visibility: parsed.draft.visibility, is_d20: parsed.draft.roll.d20Mode !== null });
  return NextResponse.json({ event: result.value }, { headers: NO_STORE_HEADERS });
}

async function readLimitedJson(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_ROLL_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

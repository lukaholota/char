import { NextResponse } from "next/server";
import { findCurrentUserId } from "@/server/db/current-user";
import { findMembership } from "@/server/db/game-sessions";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" } as const;

type MemberRequest = { userId: number; sessionId: number; isGm: boolean; isArchived: boolean };

export function respondWithError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

export async function findMemberRequest(rawSessionId: string): Promise<MemberRequest | NextResponse> {
  const sessionId = Number(rawSessionId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) return respondWithError(400, "bad_session");
  const userId = await findCurrentUserId();
  if (userId === null) return respondWithError(401, "unauthorized");
  const membership = await findMembership(sessionId, userId);
  if (!membership) return respondWithError(403, "not_member");
  return { userId, sessionId, isGm: membership.role === "GM", isArchived: membership.gameSession.archivedAt !== null };
}

export function parseSeq(value: string | null): number | null {
  if (value === null || value === "") return null;
  const seq = Number(value);
  return Number.isSafeInteger(seq) && seq >= 0 ? seq : null;
}

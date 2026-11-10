import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GameJoinCard } from "@/components/games/GameJoinCard";
import { GameRoomPage } from "@/components/games/GameRoomPage";
import { GameRoomsContent } from "@/components/games/GameRoomsLanding";
import { GameSignInPrompt } from "@/components/games/GameSignInPrompt";
import { HomebrewPageShell } from "@/components/homebrew/HomebrewPageShell";
import { redirectKeepingNoAiMode } from "@/lib/no-ai/no-ai-server";
import { findShownHeroPersId, listSheetPersIds } from "@/rules/game-room-heroes";
import { getTargetEditionPath, type Edition } from "@/rules/route-helpers";
import { findCurrentUserId } from "@/server/db/current-user";
import { findGameSessionView, findInvite, listBindablePers, listGameSessionsForUser } from "@/server/db/game-sessions";
import { RoomHeroSheet, RoomHeroSheetSkeleton } from "./room-hero-sheet";

export const GAME_SESSIONS_METADATA: Metadata = { title: "Ігрові кімнати — ДнД українською", robots: { index: false } };
export const GAME_ROOM_METADATA: Metadata = { title: "Ігрова кімната — ДнД українською", robots: { index: false } };
export const GAME_JOIN_METADATA: Metadata = { title: "Запрошення в кімнату — ДнД українською", robots: { index: false, follow: false } };

export async function buildGameSessionsPage(edition: Edition) {
  const userId = await findCurrentUserId();
  const sessions = userId === null ? null : await listGameSessionsForUser(userId);
  return (
    <HomebrewPageShell title="Ігрові кімнати" backHref={getTargetEditionPath("/", edition)} backLabel="Головна" isWide>
      <GameRoomsContent sessions={sessions} edition={edition} />
    </HomebrewPageShell>
  );
}

export async function buildGameRoomPage(params: Promise<{ id: string }>, searchParams: Promise<{ hero?: string | string[] }>, edition: Edition) {
  const [{ id }, { hero }, userId] = await Promise.all([params, searchParams, findCurrentUserId()]);
  if (userId === null) {
    return (
      <HomebrewPageShell title="Ігрова кімната" backHref={getTargetEditionPath("/games", edition)} backLabel="Кімнати">
        <GameSignInPrompt text="Увійдіть, щоб відкрити кімнату." />
      </HomebrewPageShell>
    );
  }
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) notFound();
  const bindablePers = listBindablePers(userId).catch((error: unknown) => {
    console.warn("game room pers list failed", error instanceof Error ? error.name : "unknown");
    return [];
  });
  const view = await findGameSessionView(sessionId, userId);
  if (!view) notFound();
  const shownHeroPersId = findShownHeroPersId(typeof hero === "string" ? hero : null, listSheetPersIds(view));
  const heroSheet = shownHeroPersId === null ? null : (
    <Suspense key={shownHeroPersId} fallback={<RoomHeroSheetSkeleton />}>
      <RoomHeroSheet persId={shownHeroPersId} />
    </Suspense>
  );
  return <GameRoomPage initialView={view} bindablePers={bindablePers} heroSheet={heroSheet} shownHeroPersId={shownHeroPersId} />;
}

export async function buildGameJoinPage(params: Promise<{ token: string }>, edition: Edition) {
  const [{ token }, userId] = await Promise.all([params, findCurrentUserId()]);
  const invite = await findInvite(token, userId);
  if (invite?.isMember) await redirectKeepingNoAiMode(getTargetEditionPath(`/games/${invite.sessionId}`, edition));
  return (
    <HomebrewPageShell title="Запрошення в кімнату" backHref={getTargetEditionPath("/games", edition)} backLabel="Кімнати">
      {!invite ? (
        <p className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-300">
          Посилання не діє: майстер міг його оновити. Попросіть нове запрошення.
        </p>
      ) : userId === null ? (
        <GameSignInPrompt text={`Вас запрошено в кімнату «${invite.name}». Увійдіть, щоб приєднатися.`} />
      ) : (
        <GameJoinCard token={token} name={invite.name} isArchived={invite.isArchived} isFull={invite.isFull} />
      )}
    </HomebrewPageShell>
  );
}

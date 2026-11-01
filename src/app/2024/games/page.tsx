import { buildGameSessionsPage, GAME_SESSIONS_METADATA } from "@/app/games/game-route-pages";

export const metadata = GAME_SESSIONS_METADATA;
export const dynamic = "force-dynamic";

export default function GameSessionsRoute() {
  return buildGameSessionsPage("2024");
}

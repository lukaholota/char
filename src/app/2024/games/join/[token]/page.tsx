import { buildGameJoinPage, GAME_JOIN_METADATA } from "@/app/games/game-route-pages";

export const metadata = GAME_JOIN_METADATA;
export const dynamic = "force-dynamic";

export default function GameJoinRoute({ params }: { params: Promise<{ token: string }> }) {
  return buildGameJoinPage(params, "2024");
}

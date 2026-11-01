import { buildGameRoomPage, GAME_ROOM_METADATA } from "@/app/games/game-route-pages";

export const metadata = GAME_ROOM_METADATA;
export const dynamic = "force-dynamic";

export default function GameRoomRoute({ params }: { params: Promise<{ id: string }> }) {
  return buildGameRoomPage(params, "2014");
}

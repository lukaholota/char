import { buildGameRoomPage, GAME_ROOM_METADATA } from "@/app/games/game-route-pages";

export const metadata = GAME_ROOM_METADATA;
export const dynamic = "force-dynamic";

export default function GameRoomRoute({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ hero?: string | string[] }> }) {
  return buildGameRoomPage(params, searchParams, "2024");
}

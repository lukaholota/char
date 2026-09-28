import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerPersGallery } from "@/components/admin/PlayerPersGallery";
import { arrangePlayers, readPlayerGalleryView } from "@/lib/logic/admin-players";
import { listPlayersWithPerses } from "@/server/db/admin-players";
import { isCurrentUserSiteOwner } from "@/server/db/current-user";

export const metadata: Metadata = { title: "Гравці та персонажі", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ sort?: string | string[]; all?: string | string[] }> };

export default async function AdminPlayersPage({ searchParams }: Props) {
  if (!(await isCurrentUserSiteOwner())) notFound();
  const view = readPlayerGalleryView(await searchParams);
  const allPlayers = await listPlayersWithPerses();
  return <PlayerPersGallery players={arrangePlayers(allPlayers, view)} totalPlayerCount={allPlayers.length} view={view} />;
}

import type { Metadata } from "next";
import { HomebrewCatalogPage } from "@/components/homebrew/HomebrewCatalogPage";

export const metadata: Metadata = { title: "Хоумбрю спільноти D&D 2024 — ДнД українською", description: "Заклинання й істоти для редакції 2024, створені гравцями, з голосами й обговоренням." };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Homebrew2024Page({ searchParams }: PageProps) {
  return <HomebrewCatalogPage searchParams={await searchParams} is2024 />;
}

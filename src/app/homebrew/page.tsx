import type { Metadata } from "next";
import { HomebrewCatalogPage } from "@/components/homebrew/HomebrewCatalogPage";

export const metadata: Metadata = { title: "Хоумбрю спільноти — ДнД українською", description: "Заклинання й істоти, створені гравцями, з голосами й обговоренням." };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HomebrewPage({ searchParams }: PageProps) {
  return <HomebrewCatalogPage searchParams={await searchParams} is2024={false} />;
}

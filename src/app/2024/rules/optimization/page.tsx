import type { Metadata } from "next";
import { ArticleIndex } from "@/components/optimization/ArticleIndex";
import { loadIndexPageData } from "@/lib/optimization/owner-pages.server";

export const metadata: Metadata = { title: "Аналітика RPGbot — Довідник правил D&D 2024", robots: { index: false, follow: false } };

export default async function OptimizationIndexPage() {
  return <ArticleIndex {...await loadIndexPageData("RULES_2024")} />;
}

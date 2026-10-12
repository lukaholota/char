import type { Metadata } from "next";
import { ArticleReader } from "@/components/optimization/ArticleReader";
import { loadArticlePageData } from "@/lib/optimization/owner-pages.server";

type Props = { params: Promise<{ slug: string }> };

// Prerendering all articles would add ~600 MB of HTML to the image; each page is stored on its first visit instead.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { article } = await loadArticlePageData("RULES_2014", (await params).slug);
  return { title: `${article.titleUk} — Аналітика RPGbot`, robots: { index: false, follow: false } };
}

export default async function OptimizationArticlePage({ params }: Props) {
  return <ArticleReader {...await loadArticlePageData("RULES_2014", (await params).slug)} />;
}

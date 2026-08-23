import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllRuleCategories,
  getRuleCategory,
  getRuleArticlesByCategory,
  getAllConditions,
  RuleCategoryKey,
} from "@/lib/rulesData";
import { RulesCategoryClient } from "@/components/rules/RulesCategoryClient";

export async function generateStaticParams() {
  const categories = getAllRuleCategories();
  return categories.map((c) => ({
    category: c.key,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: catKey } = await params;
  const category = getRuleCategory(catKey);

  if (!category) {
    return { title: "Розділ правил не знайдено" };
  }

  return {
    title: `${category.title} — Довідник правил D&D 5e`,
    description: category.description,
  };
}

export default async function RulesCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: catKey } = await params;
  const category = getRuleCategory(catKey);

  if (!category) {
    notFound();
  }

  const allCategories = getAllRuleCategories();
  const articles = getRuleArticlesByCategory(catKey as RuleCategoryKey, "RULES_2014");
  const conditions = catKey === "conditions" ? getAllConditions("RULES_2014") : [];

  return (
    <RulesCategoryClient
      category={category}
      allCategories={allCategories}
      articles={articles}
      conditions={conditions}
      ruleset="RULES_2014"
    />
  );
}

import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllRuleCategories,
  getRuleCategory,
  getAllConditions,
  RuleCategoryKey,
} from "@/lib/rulesData";
import { getConditions2024, getRuleArticles2024ByCategory, SRD_2024_ATTRIBUTION } from "@/lib/rules2024Data";
import { buildRulesTocIndex } from "@/lib/rulesToc";
import { getTrapsHazards } from "@/lib/trapsHazardsData";
import { getObjects } from "@/lib/objectsData";
import { RulesCategoryClient } from "@/components/rules/RulesCategoryClient";
import { SrdAttribution } from "@/components/rules/SrdAttribution";

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
    title: `${category.title} 2024 — Довідник правил D&D 2024`,
    description: category.description,
  };
}

export default async function Rules2024CategoryPage({
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
  const articles = getRuleArticles2024ByCategory(catKey as RuleCategoryKey);
  const tocIndex = buildRulesTocIndex(allCategories, getRuleArticles2024ByCategory);
  const conditions = catKey === "conditions" ? getConditions2024() : [];
  const trapsHazards = catKey === "gamemaster" ? getTrapsHazards("RULES_2024") : [];
  const objects = catKey === "gamemaster" ? getObjects("RULES_2024") : [];

  return (
    <>
      <RulesCategoryClient
        category={category}
        allCategories={allCategories}
        tocIndex={tocIndex}
        articles={articles}
        conditions={conditions}
        trapsHazards={trapsHazards}
        objects={objects}
        ruleset="RULES_2024"
      />
      <SrdAttribution attribution={SRD_2024_ATTRIBUTION} />
    </>
  );
}

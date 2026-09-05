import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllRuleCategories,
  getRuleCategory,
  getAllConditions,
  RuleCategoryKey,
} from "@/lib/rulesData";
import { getRuleArticles2014ByCategory, SRD_5_1_ATTRIBUTION } from "@/lib/rules2014Data";
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
  const articles = getRuleArticles2014ByCategory(catKey as RuleCategoryKey);
  const tocIndex = buildRulesTocIndex(allCategories, getRuleArticles2014ByCategory);
  const conditions = catKey === "conditions" ? getAllConditions("RULES_2014") : [];
  const trapsHazards = catKey === "gamemaster" ? getTrapsHazards("RULES_2014") : [];
  const objects = catKey === "gamemaster" ? getObjects("RULES_2014") : [];

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
        ruleset="RULES_2014"
      />
      <SrdAttribution attribution={SRD_5_1_ATTRIBUTION} />
    </>
  );
}

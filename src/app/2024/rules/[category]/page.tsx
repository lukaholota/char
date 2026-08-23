import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllRuleCategories,
  getRuleCategory,
  getAllConditions,
  RuleCategoryKey,
} from "@/lib/rulesData";
import { getRuleArticles2024ByCategory, SRD_2024_ATTRIBUTION } from "@/lib/rules2024Data";
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
  const conditions = catKey === "conditions" ? getAllConditions("RULES_2024") : [];

  return (
    <>
      <RulesCategoryClient
        category={category}
        allCategories={allCategories}
        articles={articles}
        conditions={conditions}
        ruleset="RULES_2024"
      />
      <p className="mx-auto max-w-7xl px-4 pb-10 text-center text-xs text-slate-500">
        {SRD_2024_ATTRIBUTION.text}{" "}
        <a
          href={SRD_2024_ATTRIBUTION.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-300"
        >
          {SRD_2024_ATTRIBUTION.sourceName}
        </a>
        {" · "}
        <a
          href={SRD_2024_ATTRIBUTION.licenseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-300"
        >
          {SRD_2024_ATTRIBUTION.licenseName}
        </a>
      </p>
    </>
  );
}

import { Metadata } from "next";
import { getAllRuleCategories, getAllConditions } from "@/lib/rulesData";
import { getConditions2024, getRuleArticleSummaries2024, SRD_2024_ATTRIBUTION } from "@/lib/rules2024Data";
import { RulesHub } from "@/components/rules/RulesHub";
import { SrdAttribution } from "@/components/rules/SrdAttribution";

export const metadata: Metadata = {
  title: "Довідник правил D&D 2024 (PHB 2024 Wiki) — ДнД українською",
  description: "Повний оновлений довідник правил Dungeons & Dragons PHB 2024 українською мовою: оновлений бій, магічні дії, перевірки D20 та стани.",
};

export default function Rules2024Page() {
  const categories = getAllRuleCategories();
  const conditions = getConditions2024();
  const featuredArticles = getRuleArticleSummaries2024();

  return (
    <>
      <RulesHub
        categories={categories}
        conditions={conditions}
        featuredArticles={featuredArticles}
        ruleset="RULES_2024"
      />
      <SrdAttribution attribution={SRD_2024_ATTRIBUTION} />
    </>
  );
}

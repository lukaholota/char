import { Metadata } from "next";
import { getAllRuleCategories, getAllConditions } from "@/lib/rulesData";
import { getRuleArticleSummaries2014, SRD_5_1_ATTRIBUTION } from "@/lib/rules2014Data";
import { RulesHub } from "@/components/rules/RulesHub";
import { SrdAttribution } from "@/components/rules/SrdAttribution";

export const metadata: Metadata = {
  title: "Довідник правил D&D 5e (Wiki / SRD) — ДнД українською",
  description: "Повний офіційний довідник правил Dungeons & Dragons 5e (2014) українською мовою: бій, чарування, характеристики, стани та пригоди.",
};

export default function RulesPage() {
  const categories = getAllRuleCategories();
  const conditions = getAllConditions("RULES_2014");
  const featuredArticles = getRuleArticleSummaries2014();

  return (
    <>
      <RulesHub
        categories={categories}
        conditions={conditions}
        featuredArticles={featuredArticles}
        ruleset="RULES_2014"
      />
      <SrdAttribution attribution={SRD_5_1_ATTRIBUTION} />
    </>
  );
}

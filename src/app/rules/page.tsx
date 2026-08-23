import { Metadata } from "next";
import { getAllRuleCategories, getAllConditions, getAllRuleArticles } from "@/lib/rulesData";
import { RulesHub } from "@/components/rules/RulesHub";

export const metadata: Metadata = {
  title: "Довідник правил D&D 5e (Wiki / SRD) — ДнД українською",
  description: "Повний офіційний довідник правил Dungeons & Dragons 5e (2014) українською мовою: бій, чарування, характеристики, стани та пригоди.",
};

export default function RulesPage() {
  const categories = getAllRuleCategories();
  const conditions = getAllConditions("RULES_2014");
  const featuredArticles = getAllRuleArticles("RULES_2014");

  return (
    <RulesHub
      categories={categories}
      conditions={conditions}
      featuredArticles={featuredArticles}
      ruleset="RULES_2014"
    />
  );
}

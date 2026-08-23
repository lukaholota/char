import { Metadata } from "next";
import { getAllRuleCategories, getAllConditions } from "@/lib/rulesData";
import { getRuleArticleSummaries2024, SRD_2024_ATTRIBUTION } from "@/lib/rules2024Data";
import { RulesHub } from "@/components/rules/RulesHub";

export const metadata: Metadata = {
  title: "Довідник правил D&D 2024 (PHB 2024 Wiki) — ДнД українською",
  description: "Повний оновлений довідник правил Dungeons & Dragons PHB 2024 українською мовою: оновлений бій, магічні дії, перевірки D20 та стани.",
};

export default function Rules2024Page() {
  const categories = getAllRuleCategories();
  const conditions = getAllConditions("RULES_2024");
  const featuredArticles = getRuleArticleSummaries2024();

  return (
    <>
      <RulesHub
        categories={categories}
        conditions={conditions}
        featuredArticles={featuredArticles}
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

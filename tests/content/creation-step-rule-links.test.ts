import { describe, expect, it } from "vitest";

import {
  findCreationStepRuleLink,
  listLinkedCreationStepIds,
  STEPS_WITHOUT_RULE_ARTICLE,
} from "@/lib/components/characterCreator/creation-step-rule-links";
import { resolveCreationSteps } from "@/lib/components/characterCreator/creation-step-resolver";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024 } from "@/lib/rules2024Data";
import type { RuleArticle } from "@/lib/rulesData";

const ARTICLES: Record<"RULES_2014" | "RULES_2024", RuleArticle[]> = {
  RULES_2014: getAllRuleArticles2014(),
  RULES_2024: getAllRuleArticles2024(),
};

/// Той самий набір якорів, що й у сторінки категорії: слаг статті або id підрозділу.
function findArticleByAnchor(articles: RuleArticle[], anchor: string): RuleArticle | undefined {
  return articles.find(
    (article) => article.slug === anchor || article.subsections.some((subsection) => subsection.id === anchor)
  );
}

const everyStepId = resolveCreationSteps({
  hasSubraces: true,
  hasRaceVariants: true,
  hasRaceChoiceOptions: true,
  hasSubclasses: true,
  hasLevelOneSubclassChoices: true,
  hasLevelOneChoices: true,
  hasLevelOneOptionalFeatures: true,
  hasWeaponMastery: true,
  hasFeatChoice: true,
  hasFeatChoices: true,
  hasBackgroundFeatChoice: true,
  hasBackgroundFeatChoices: true,
  hasExpertiseChoice: true,
  hasLanguageChoice: true,
}).map((step) => step.id);

describe("KR29.3 — з кроку майстра створення персонажа на статтю довідника", () => {
  for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
    describe(ruleset, () => {
      it("кожен крок майстра або має статтю, або свідомо перелічений як такий, що її не має", () => {
        const linked = new Set(listLinkedCreationStepIds(ruleset));
        const excused = new Set(STEPS_WITHOUT_RULE_ARTICLE[ruleset]);

        const unaccounted = everyStepId.filter((id) => !linked.has(id) && !excused.has(id));
        expect(unaccounted).toEqual([]);

        const both = everyStepId.filter((id) => linked.has(id) && excused.has(id));
        expect(both).toEqual([]);
      });

      it("кожне посилання веде на наявний якір категорії «abilities» і несе справжній заголовок статті", () => {
        const abilities = ARTICLES[ruleset].filter((article) => article.category === "abilities");
        const prefix = ruleset === "RULES_2024" ? "/2024" : "";

        for (const stepId of listLinkedCreationStepIds(ruleset)) {
          const link = findCreationStepRuleLink(stepId, ruleset);
          expect(link, stepId).not.toBeNull();

          const [path, anchor] = link!.href.split("#");
          expect(path, stepId).toBe(`${prefix}/rules/abilities`);

          const article = findArticleByAnchor(abilities, anchor);
          expect(article, `${ruleset} ${stepId} → #${anchor}`).toBeDefined();
          expect(link!.articleTitle, `${ruleset} ${stepId}`).toBe(article!.title);
        }
      });
    });
  }

  it("2014 веде на статті PHB із KR29.1, а не на статті 2024", () => {
    expect(findCreationStepRuleLink("race", "RULES_2014")?.href).toBe("/rules/abilities#1-choose-a-race");
    expect(findCreationStepRuleLink("asi", "RULES_2014")?.href).toBe("/rules/abilities#3-determine-ability-scores");
    expect(findCreationStepRuleLink("race", "RULES_2024")?.href).toBe(
      "/2024/rules/abilities#step-2-character-origin--choose-a-species"
    );
    expect(findCreationStepRuleLink("weaponMastery", "RULES_2014")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  findCreationStepRuleLink,
  listLinkedCreationStepIds,
  STEPS_WITHOUT_RULE_ARTICLE,
} from "@/lib/components/characterCreator/creation-step-rule-links";
import { collectCreationStepRuleExcerpts } from "@/lib/content/creation-step-rule-excerpts";
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
  hasSpellChoice: true,
  hasFeatSpellChoice: true,
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

      it("кожне посилання веде на наявний якір своєї категорії і несе справжній заголовок статті", () => {
        const prefix = ruleset === "RULES_2024" ? "/2024" : "";

        for (const stepId of listLinkedCreationStepIds(ruleset)) {
          const link = findCreationStepRuleLink(stepId, ruleset);
          expect(link, stepId).not.toBeNull();

          const [path, anchor] = link!.href.split("#");
          expect(path, stepId).toBe(`${prefix}/rules/${link!.category}`);
          expect(anchor, stepId).toBe(link!.anchor);

          const inCategory = ARTICLES[ruleset].filter((article) => article.category === link!.category);
          const article = findArticleByAnchor(inCategory, anchor);
          expect(article, `${ruleset} ${stepId} → #${anchor}`).toBeDefined();
          expect(link!.articleTitle, `${ruleset} ${stepId}`).toBe(article!.title);
        }
      });

      it("кожен крок із посиланням має початок статті для модалки", () => {
        const excerpts = collectCreationStepRuleExcerpts()[ruleset];

        for (const stepId of listLinkedCreationStepIds(ruleset)) {
          const excerpt = excerpts[stepId];
          expect(excerpt, `${ruleset} ${stepId}`).toBeDefined();
          expect(excerpt.excerpt.length, `${ruleset} ${stepId}`).toBeGreaterThan(40);
          expect(excerpt.href, `${ruleset} ${stepId}`).toBe(findCreationStepRuleLink(stepId, ruleset)!.href);
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

  it("майстерність зброї 2024 веде на «Властивості майстерності» в розділі спорядження", () => {
    const link = findCreationStepRuleLink("weaponMastery", "RULES_2024");
    expect(link?.href).toBe("/2024/rules/equipment#weapons--mastery-properties");

    const excerpt = collectCreationStepRuleExcerpts().RULES_2024.weaponMastery;
    expect(excerpt.sectionTitle).toBe("Властивості майстерності");
    expect(excerpt.excerpt).toContain("властивість майстерності");
    expect(excerpt.isTruncated).toBe(true);
  });
});

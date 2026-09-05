import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { searchOmniIndex } from "@/lib/omniSearchData";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024 } from "@/lib/rules2024Data";
import aliasFile from "@/lib/refs/search-aliases.json";
import { findRetiredSlugsFor } from "@/lib/rulesData";

type AliasEntry = { entityType: string; slug: string; edition: string; variants: string[] };

const ruleAliases = (aliasFile.aliases as AliasEntry[]).filter((entry) => entry.entityType === "rule");

/// Пошук навішує аліас і на повний id підрозділу (`order-of-combat--bonus-actions`), і на його
/// хвіст — саме так писалися аліаси KR13.4, тож ключем вважається і те, і те.
function findAnchors(): Set<string> {
  const anchors = new Set<string>();
  for (const articles of [getAllRuleArticles2014(), getAllRuleArticles2024()]) {
    for (const article of articles) {
      anchors.add(article.slug);
      for (const retired of findRetiredSlugsFor(article)) anchors.add(retired);
      for (const subsection of article.subsections) {
        anchors.add(subsection.id);
        anchors.add(subsection.id.split("--").slice(1).join("--"));
      }
    }
  }
  return anchors;
}

describe("KR20.6 — правила знаходяться пошуком і видно пошуковикам", () => {
  describe("Те, чого власник не знаходив", () => {
    const wanted = [
      { query: "бонусна дія", ruleset: "RULES_2014" as const, anchor: "order-of-combat--bonus-actions" },
      { query: "реакція", ruleset: "RULES_2014" as const, anchor: "reactions" },
      { query: "бій верхи", ruleset: "RULES_2014" as const, anchor: "mounted-combat" },
      { query: "вільна дія", ruleset: "RULES_2014" as const, anchor: "order-of-combat--other-activity-on-your-turn" },
      { query: "бонусна дія", ruleset: "RULES_2024" as const, anchor: "bonus-action" },
      { query: "бій верхи", ruleset: "RULES_2024" as const, anchor: "mounted-combat" },
    ];

    for (const { query, ruleset, anchor } of wanted) {
      it(`«${query}» (${ruleset}) веде на #${anchor}`, () => {
        const [first] = searchOmniIndex(query, ruleset);
        expect(first, `${query} нічого не знайшов`).toBeDefined();
        expect(first.href).toContain(`#${anchor}`);
      });
    }
  });

  /// Три аліаси KR13.4 указують не на довідник, а на каталожні поняття 2024 (майстерність зброї,
  /// риси походження, епічні дари). У правилах цілі для них немає — питання винесене власнику,
  /// а поки що вони перелічені явно, щоб список не мовчки ріс.
  const ALIASES_WITHOUT_RULE_ANCHOR = ["weapon-mastery", "origin-feats", "epic-boons"];

  it("кожен аліас правила вказує на наявний якір", () => {
    const anchors = findAnchors();
    const orphans: string[] = [];

    for (const alias of ruleAliases) {
      if (!anchors.has(alias.slug)) orphans.push(alias.slug);
    }

    expect(orphans.sort()).toEqual([...ALIASES_WITHOUT_RULE_ANCHOR].sort());
  });

  it("sitemap містить обидва довідники, усі категорії та кожну статтю", () => {
    const urls = sitemap().map((entry) => entry.url);
    const rules = urls.filter((url) => url.includes("/rules"));

    expect(rules).toContain("https://char.holota.family/rules");
    expect(rules).toContain("https://char.holota.family/2024/rules");
    expect(rules.filter((url) => url.includes("#")).length).toBe(
      getAllRuleArticles2014().length + getAllRuleArticles2024().length
    );
  });
});

import { describe, expect, it } from "vitest";

import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024, getRuleArticle2024BySlug } from "@/lib/rules2024Data";
import { getRuleArticle2014BySlug } from "@/lib/rules2014Data";
import {
  findHandwrittenArticles,
  findRetiredSlugsFor,
  RULE_CATEGORIES,
  RuleArticle,
  SUPERSEDED_BY_SRD,
} from "@/lib/rulesData";
import { findRuleOverlaps } from "../../scripts/srd/find-rule-overlaps";
import { buildOverlapKey, findOverlapDecision, RULE_OVERLAP_DECISIONS } from "../../scripts/srd/rule-overlap-decisions";

/// SRD 5.2.1 сам повторює той самий заголовок: «Укриття» є і розділом бою, і терміном глосарію,
/// а «Ability Checks» трапляється в двох групах глави «Гра». Це не наш дефект, і прибирати
/// означення не можна — воно потрібне пошуку. Дубль дозволений лише тоді, коли другий слаг
/// відрізняється службовим суфіксом; кількість таких пар зафіксована, щоб вона не росла.
///
/// KR23.4 додав десяту пару: DMG 2024 має власний розділ «Alignment» (глава 1), а SRD 5.2.1 —
/// однойменний термін глосарію. Обидва «Світогляд», слаг другого відрізняється суфіксом `-xdmg`
/// (той самий claimSlug, що дав `renown-xdmg`, просто тут заголовки, а не тільки слаги, збіглися).
const SOURCE_ECHO_PAIRS = 10;
const ECHO_SUFFIXES = ["-term", "-rule", "-xdmg"];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function findDuplicateTitles(articles: RuleArticle[]): [string, string[]][] {
  const byTitle = new Map<string, string[]>();
  for (const article of articles) {
    const key = normalize(article.title);
    byTitle.set(key, [...(byTitle.get(key) ?? []), article.slug]);
  }
  return [...byTitle.entries()].filter(([, slugs]) => slugs.length > 1);
}

describe("KR20.4 — жодне правило не представлене двома видимими статтями", () => {
  it("2014: жодного дубля заголовка й жодного дубля слага", () => {
    const articles = getAllRuleArticles2014();
    expect(findDuplicateTitles(articles)).toEqual([]);

    const slugs = articles.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("жодна видима рукописна стаття не повторює англійський заголовок статті SRD", () => {
    for (const [handwritten, imported] of [
      [findHandwrittenArticles("RULES_2014"), getAllRuleArticles2014()],
      [findHandwrittenArticles("RULES_2024"), getAllRuleArticles2024()],
    ] as const) {
      const importedTitles = new Set(
        imported.filter((article) => "provenance" in article).map((article) => normalize(article.engTitle))
      );

      for (const article of handwritten) {
        expect(importedTitles.has(normalize(article.engTitle)), article.slug).toBe(false);
      }
    }
  });

  it("2024: дублі лишилися тільки там, де їх має саме джерело — глава плюс термін глосарію", () => {
    const articles = getAllRuleArticles2024();
    const duplicates = findDuplicateTitles(articles);

    expect(duplicates.length).toBe(SOURCE_ECHO_PAIRS);
    for (const [, slugs] of duplicates) {
      const sorted = [...slugs].sort((left, right) => left.length - right.length);
      expect(sorted.length).toBe(2);
      const allowed = ECHO_SUFFIXES.map((suffix) => `${sorted[0]}${suffix}`);
      expect(allowed, `${sorted[0]} / ${sorted[1]}`).toContain(sorted[1]);
    }

    const slugs = articles.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("слаг поглинутої рукописної статті веде на канонічну статтю SRD", () => {
    for (const [slug, canonical] of Object.entries(SUPERSEDED_BY_SRD.RULES_2014)) {
      const article = findAnyBySlug2014(slug);
      expect(article, `2014 ${slug}`).toBeDefined();
      expect("provenance" in article!, `2014 ${slug} має бути імпортованою`).toBe(true);
      expect(article!.slug, `2014 ${slug}`).toBe(canonical);
    }

    for (const [slug, canonical] of Object.entries(SUPERSEDED_BY_SRD.RULES_2024)) {
      const article = findAnyBySlug2024(slug);
      expect(article, `2024 ${slug}`).toBeDefined();
      expect(article!.slug, `2024 ${slug}`).toBe(canonical);
    }
  });

  /// Слаг — це id елемента на сторінці категорії. Коли рукописний конспект називає підрозділ так
  /// само, як SRD називає статтю, на сторінці стає два однакові id, і посилання веде навмання.
  it("жоден якір сторінки категорії не належить двом елементам", () => {
    for (const [label, articles] of [
      ["2014", getAllRuleArticles2014()],
      ["2024", getAllRuleArticles2024()],
    ] as const) {
      const owners = new Map<string, string[]>();
      const claim = (anchor: string, owner: string) => owners.set(anchor, [...(owners.get(anchor) ?? []), owner]);

      for (const article of articles) {
        claim(`${article.category}#${article.slug}`, `стаття ${article.slug}`);
        for (const retired of findRetiredSlugsFor(article)) {
          claim(`${article.category}#${retired}`, `зниклий слаг ${retired} на ${article.slug}`);
        }
        for (const subsection of article.subsections) {
          claim(`${article.category}#${subsection.id}`, `підрозділ ${article.slug}`);
        }
      }

      const collisions = [...owners.entries()].filter(([, claimants]) => claimants.length > 1);
      expect(collisions, `${label}: ${collisions.map(([anchor]) => anchor).join(", ")}`).toEqual([]);
    }
  });

  it("кожен перетин, що лишився, має проставлене рішення", () => {
    const undecided: string[] = [];
    const seen = new Set<string>();

    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      for (const { handwritten, imported } of findRuleOverlaps(ruleset)) {
        seen.add(buildOverlapKey(ruleset, handwritten.slug, imported.slug));
        if (!findOverlapDecision(ruleset, handwritten.slug, imported.slug)) {
          undecided.push(`${ruleset} ${handwritten.slug} × ${imported.slug}`);
        }
      }
    }

    expect(undecided).toEqual([]);
    expect(Object.keys(RULE_OVERLAP_DECISIONS).filter((key) => !seen.has(key))).toEqual([]);
  });
});

function findAnyBySlug2014(slug: string): RuleArticle | undefined {
  return RULE_CATEGORIES.map((category) => getRuleArticle2014BySlug(category.key, slug)).find(Boolean);
}

function findAnyBySlug2024(slug: string): RuleArticle | undefined {
  return RULE_CATEGORIES.map((category) => getRuleArticle2024BySlug(category.key, slug)).find(Boolean);
}

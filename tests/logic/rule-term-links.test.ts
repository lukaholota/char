import { describe, expect, it } from "vitest";

import { buildRuleTermCards, buildTermCard, type TermSources } from "@/lib/term-card";
import ruleTermCards from "@/lib/generated/rule-term-cards.json";
import { listRuleTermLinks } from "@/lib/term-link";
import { collectTermSources } from "@/lib/term-sources";

/// KR34.2 — реєстр якорів на стани й дії: кожна адреса веде в існуючий стан або підрозділ
/// довідника своєї редакції, і модалка за нею показує саме те, куди веде прямий захід.
const realSources: TermSources = collectTermSources();

const RULESETS = ["RULES_2014", "RULES_2024"] as const;
const ROUTE_PREFIX = { RULES_2014: "/rules/", RULES_2024: "/2024/rules/" } as const;

describe("KR34.2 — реєстр термінів-посилань", () => {
  it("кожна адреса несе свою редакцію в шляху", () => {
    const wrong = listRuleTermLinks().flatMap((entry) =>
      RULESETS.flatMap((ruleset) => {
        const href = entry[ruleset];
        return href && !href.startsWith(ROUTE_PREFIX[ruleset]) ? [`${entry.original} ${ruleset}: ${href}`] : [];
      })
    );
    expect(wrong).toEqual([]);
  });

  it("кожна адреса веде в існуючий стан або підрозділ, і картка показує саме його", () => {
    const broken = listRuleTermLinks().flatMap((entry) =>
      RULESETS.flatMap((ruleset) => {
        const href = entry[ruleset];
        if (!href) return [];
        const card = buildTermCard({ original: entry.original, ruleset }, realSources);
        const shown = card.condition?.href ?? card.article?.href;
        return shown === href ? [] : [`${entry.original} ${ruleset}: ${href} → ${shown ?? "нічого"}`];
      })
    );
    expect(broken).toEqual([]);
  });

  it("дія не підтягує однойменне спорядження: «Hide» — це «Сховатися», а не шкуряний обладунок", () => {
    for (const ruleset of RULESETS) {
      const card = buildTermCard({ original: "Hide", ruleset }, realSources);
      expect(card.catalog, ruleset).toBeNull();
      expect(card.article?.subsection?.title, ruleset).toBe("Сховатися");
    }
  });

  it("термін записано один раз", () => {
    const originals = listRuleTermLinks().map((entry) => entry.original);
    expect(originals.filter((original, index) => originals.indexOf(original) !== index)).toEqual([]);
  });

  it("легкий чанк карток не відстав від довідника й реєстру — інакше `bun run generate:rule-term-cards`", () => {
    expect(ruleTermCards).toEqual(JSON.parse(JSON.stringify(buildRuleTermCards(realSources))));
  });
});

import { RuleArticle } from "./rulesData";

export type RuleProvenance =
  | { kind: "handwritten" }
  | { kind: "srd-5.1" | "srd-5.2.1"; repo: string; commit: string; file: string; url: string }
  /// Матеріал поза SRD береться з пінованого дзеркала 5etools (Р19), а не зі скрейпу вікі:
  /// `book` — книга-джерело (DMG, XGE, TCE, XDMG), `page` — сторінка в ній.
  | { kind: "beyond-srd"; repo: string; revision: string; book: string; page: number; url: string }
  | { kind: "wikidot"; url: string; scrapedAt: string };

export type ImportedRuleArticle = RuleArticle & {
  provenance: RuleProvenance;
  isTranslated: boolean;
};

export function isFromSrd(provenance: RuleProvenance): boolean {
  return provenance.kind === "srd-5.1" || provenance.kind === "srd-5.2.1";
}

export function isBeyondSrd(provenance: RuleProvenance): boolean {
  return provenance.kind === "wikidot" || provenance.kind === "beyond-srd";
}

export function findProvenance(article: RuleArticle): RuleProvenance {
  return "provenance" in article ? (article as ImportedRuleArticle).provenance : { kind: "handwritten" };
}

export function findSourceUrl(provenance: RuleProvenance): string | null {
  return "url" in provenance ? provenance.url : null;
}

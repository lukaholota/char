import type { RuleArticle } from "./rulesData";
import nestedSections from "./refs/nested-rule-sections.json";
import { stripGlossaryMarkers } from "./refs/glossary-marker";

export function collectNestedRuleHeadingAnchors(article: RuleArticle, subsectionId: string) {
  if (article.ruleset !== "RULES_2014") return {};
  const terms = nestedSections[subsectionId as keyof typeof nestedSections] ?? [];
  return Object.fromEntries(terms.map(({ heading, anchor }) => [stripGlossaryMarkers(heading), `${subsectionId}--${anchor}`]));
}

export function findNestedRuleSection(article: RuleArticle, href: string) {
  const prefix = article.ruleset === "RULES_2024" ? "/2024" : "";
  for (const subsection of article.subsections) {
    const anchors = collectNestedRuleHeadingAnchors(article, subsection.id);
    for (const [title, anchor] of Object.entries(anchors)) {
      if (href !== `${prefix}/rules/${article.category}#${anchor}`) continue;
      return extractNestedRuleSection(subsection.content, title, Object.keys(anchors));
    }
  }
  return null;
}

function extractNestedRuleSection(content: string, title: string, peers: readonly string[]) {
  const headings = [...content.matchAll(/^(#{1,6})\s+(.+)$/gm)];
  const heading = headings.find((match) => match[2].trim() === title);
  if (!heading) return extractBoldRuleSection(content, title, peers);
  const end = headings.find((match) => match.index! > heading.index! && match[1].length <= heading[1].length)?.index;
  return { title, content: content.slice(heading.index! + heading[0].length, end).replace(/^[.:]\s*/, "").trim() };
}

function extractBoldRuleSection(content: string, title: string, peers: readonly string[]) {
  const headings = [...content.matchAll(/^(\*{2,3})([^*\n]+)\1/gm)];
  const heading = headings.find((match) => stripGlossaryMarkers(match[2]).replace(/[.:]\s*$/, "").trim() === title);
  if (!heading) return null;
  const next = headings.find((match) => {
    const nextTitle = stripGlossaryMarkers(match[2]).replace(/[.:]\s*$/, "").trim();
    return match.index! > heading.index! &&
      (heading[1].length === 3 || (nextTitle !== title && peers.includes(nextTitle)));
  });
  const nextMarkdownHeading = /^#{1,6}\s+/gm;
  nextMarkdownHeading.lastIndex = heading.index! + heading[0].length;
  const markdownEnd = nextMarkdownHeading.exec(content)?.index;
  const end = Math.min(next?.index ?? content.length, markdownEnd ?? content.length);
  return { title, content: content.slice(heading.index! + heading[0].length, end).trim().replace(/^[.:]\s*/, "") };
}

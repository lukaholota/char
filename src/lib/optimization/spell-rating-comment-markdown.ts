import { isRpgbotAbbreviationsHref } from "./rpgbot-source-codes";
import type { InlineNode } from "./types";

export type SpellRatingComment = { text: string; sectionId: string };

export function buildCommentMarkdown(nodes: readonly InlineNode[]): string {
  const markdown = capitalizeFirstNode(nodes).map(serializeNode).join("");
  return markdown.replace(/\s+/g, " ").trim();
}

function capitalizeFirstNode(nodes: readonly InlineNode[]): InlineNode[] {
  const [first, ...rest] = nodes;
  if (!first) return [];
  const text = first.text.trimStart();
  return [{ ...first, text: text.charAt(0).toLocaleUpperCase("uk") + text.slice(1) }, ...rest];
}

function serializeNode(node: InlineNode): string {
  switch (node.type) {
    case "strong": return `**${node.text}**`;
    case "emphasis": return `*${node.text}*`;
    case "link": return isRpgbotAbbreviationsHref(node.href) ? node.text : `[${node.text}](${node.href})`;
    default: return node.text;
  }
}

import { findCreatureReadingLink } from "@/lib/creature-link";
import { findSpellLinkInHref } from "@/lib/spell-link";
import { findTermLinkInHref } from "@/lib/term-link";
import type { InlineNode } from "./types";

/// Пікер відкриває на місці лише заклинання, терміни й істоти, а зовнішнє джерело — у новій вкладці. Решта посилань статті
/// або працює тільки в читачі (`reference=`), або виводить з творення в каталог, або плутає рису звіра з однойменною рисою раси чи класу.
export function flattenLinksLeavingPicker(nodes: readonly InlineNode[], creatureSlugs: ReadonlySet<string>): InlineNode[] {
  return nodes.map((node) => (node.type === "link" && !isKeptInPicker(node.href, creatureSlugs) ? { type: "text", text: node.text } : node));
}

export function isKeptInPicker(href: string, creatureSlugs: ReadonlySet<string>): boolean {
  return isOpenedInPicker(href, creatureSlugs) || isExternalHref(href);
}

export function isOpenedInPicker(href: string, creatureSlugs: ReadonlySet<string>): boolean {
  if (findSpellLinkInHref(href) || findTermLinkInHref(href)) return true;
  const creatureLink = findCreatureReadingLink(href);
  return creatureLink !== null && creatureLink.ruleset === "RULES_2014" && creatureSlugs.has(creatureLink.key);
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

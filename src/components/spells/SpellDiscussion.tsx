"use client";

import { ContentDiscussion } from "@/components/discussion/ContentDiscussion";
import { findCatalogDiscussionTarget } from "@/lib/logic/content-discussion";

export function SpellDiscussion({ spell, is2024 }: { spell: { spellId: number; engName: string }; is2024: boolean }) {
  const target = findCatalogDiscussionTarget("SPELL", { id: spell.spellId, engName: spell.engName, ruleset: is2024 ? "RULES_2024" : "RULES_2014" });
  return target ? <ContentDiscussion target={target} className="px-1" /> : null;
}

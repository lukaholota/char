"use client";

import type { CreatureData } from "@/lib/bestiaryData";
import { ContentDiscussion } from "@/components/discussion/ContentDiscussion";
import { findCatalogDiscussionTarget } from "@/lib/logic/content-discussion";

export function CreatureDiscussion({ creature, is2024 }: { creature: CreatureData; is2024: boolean }) {
  const target = findCatalogDiscussionTarget("CREATURE", { id: creature.creatureId, engName: creature.nameEng, ruleset: is2024 ? "RULES_2024" : "RULES_2014" });
  return target ? <ContentDiscussion target={target} className="pt-2" /> : null;
}

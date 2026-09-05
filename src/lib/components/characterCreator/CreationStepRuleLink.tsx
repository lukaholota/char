"use client";

import { BookOpen } from "lucide-react";
import type { Ruleset } from "@prisma/client";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { findCreationStepRuleLink } from "@/lib/components/characterCreator/creation-step-rule-links";

interface Props {
  stepId: string | undefined;
  ruleset: Ruleset;
}

export const CreationStepRuleLink = ({ stepId, ruleset }: Props) => {
  const link = stepId ? findCreationStepRuleLink(stepId, ruleset) : null;
  if (!link) return null;

  return (
    <div className="flex justify-end">
      <ModeLink
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="creation-step-rule-link"
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>Як це працює: {link.articleTitle}</span>
      </ModeLink>
    </div>
  );
};

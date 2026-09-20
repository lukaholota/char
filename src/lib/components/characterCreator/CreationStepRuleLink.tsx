"use client";

import { useState } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import type { Ruleset } from "@prisma/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { findCreationStepRuleLink } from "@/lib/components/characterCreator/creation-step-rule-links";
import type {
  CreationStepRuleExcerpt,
  CreationStepRuleExcerpts,
} from "@/lib/content/creation-step-rule-excerpts";

const TRIGGER_CLASS =
  "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition-colors max-md:min-h-10 hover:bg-white/10 hover:text-white";

interface Props {
  stepId: string | undefined;
  ruleset: Ruleset;
  excerpts?: CreationStepRuleExcerpts;
}

/// Початок статті відкривається модалкою просто на кроці — гравець читає правило, не втрачаючи
/// заповнене. Повний текст лишається в довіднику: уривок навмисно обрізаний по абзацах.
export const CreationStepRuleLink = ({ stepId, ruleset, excerpts }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const link = stepId ? findCreationStepRuleLink(stepId, ruleset) : null;
  if (!link) return null;

  const excerpt = stepId ? excerpts?.[ruleset]?.[stepId] : undefined;
  const label = excerpt?.sectionTitle ?? link.articleTitle;

  return (
    <div className="flex justify-end">
      {excerpt ? (
        <button type="button" onClick={() => setIsOpen(true)} data-testid="creation-step-rule-link" className={TRIGGER_CLASS}>
          <TriggerLabel label={label} />
        </button>
      ) : (
        <ModeLink
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="creation-step-rule-link"
          className={TRIGGER_CLASS}
        >
          <TriggerLabel label={label} />
        </ModeLink>
      )}

      {excerpt && <CreationStepRuleDialog excerpt={excerpt} isOpen={isOpen} onOpenChange={setIsOpen} />}
    </div>
  );
};

function TriggerLabel({ label }: { label: string }) {
  return (
    <>
      <BookOpen className="h-3.5 w-3.5" />
      <span>Як це працює: {label}</span>
    </>
  );
}

function CreationStepRuleDialog({
  excerpt,
  isOpen,
  onOpenChange,
}: {
  excerpt: CreationStepRuleExcerpt;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="creation-step-rule-dialog"
        aria-describedby={undefined}
        className="max-h-[85vh] w-[95vw] max-w-2xl overflow-y-auto p-0 bg-gradient-to-b from-slate-950/18 to-slate-950/12"
      >
        <div className="min-w-0 px-4 py-5 text-left sm:p-6">
          <DialogTitle className="min-w-0 bg-gradient-to-r from-arcane-400 to-violet-400 bg-clip-text font-sans text-lg font-semibold uppercase tracking-wider text-transparent sm:text-xl">
            {excerpt.sectionTitle ?? excerpt.articleTitle}
          </DialogTitle>
          {excerpt.sectionTitle && (
            <div className="mt-1 text-sm text-slate-400">{excerpt.articleTitle}</div>
          )}

          <FormattedDescription
            content={excerpt.excerpt}
            className="mt-4 text-sm leading-relaxed text-slate-300 break-words"
          />

          {excerpt.isTruncated && (
            <p className="mt-3 text-xs text-slate-500">Це початок статті — далі правило продовжується в довіднику.</p>
          )}

          <ModeLink
            href={excerpt.href}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="creation-step-rule-full-link"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Повні правила в довіднику</span>
          </ModeLink>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { findEditionAccent } from "@/styles/edition-accent";
import type { CreatureLoreGroup } from "@/lib/bestiaryLore";
import { cn } from "@/lib/utils";

export function CreatureLoreSection({ group, is2024 }: { group: CreatureLoreGroup | null; is2024: boolean }) {
  const [open, setOpen] = useState(false);
  if (!group) return null;

  const { lead, rest } = splitLeadParagraphs(group.description);
  const accent = findEditionAccent(is2024 ? "2024" : "2014").cutFrame;

  return (
    <section
      data-creature-lore
      className="glass-card break-words rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur-xl sm:p-6"
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Лор</div>
      <h2 className={cn("mt-1 text-lg font-semibold", accent.titleClassName)}>
        {group.name} <span className="text-sm font-normal text-slate-500">[{group.engName}]</span>
      </h2>
      <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
        <FormattedDescription content={lead} className="space-y-2 text-sm leading-relaxed text-slate-300" />
        {rest !== "" && (
          <>
            <CollapsibleContent>
              <FormattedDescription content={rest} className="mt-2 space-y-2 text-sm leading-relaxed text-slate-300" />
            </CollapsibleContent>
            <CollapsibleTrigger className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10">
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
              {open ? "Згорнути" : "Розгорнути повністю"}
            </CollapsibleTrigger>
          </>
        )}
      </Collapsible>
    </section>
  );
}

/// Згорнутий стан показує перший абзац прози; усе, що стоїть перед ним — заголовок, епіграф,
/// підзаголовок і список «Середовище / Скарби» у 2024, — іде разом із ним, бо саме по собі
/// нічого не каже.
function splitLeadParagraphs(description: string): { lead: string; rest: string } {
  const blocks = description.split(/\n\n+/);
  const firstProse = blocks.findIndex(isProseParagraph);
  const cut = firstProse === -1 ? blocks.length : firstProse + 1;
  return { lead: blocks.slice(0, cut).join("\n\n"), rest: blocks.slice(cut).join("\n\n") };
}

function isProseParagraph(block: string): boolean {
  const text = block.trim();
  if (/^\*\*[^*]+\*\*$/.test(text) || /^[-|>]/.test(text)) return false;
  return /[.!?…»”)]$/.test(text.replace(/\{\{[^}]*\}\}$/, ""));
}

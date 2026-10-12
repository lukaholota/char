"use client";

import { ModeLink } from "@/components/no-ai/ModeLink";

import type { SourceRef, OptimizationRuleset } from "@/lib/optimization/types";
import { buildDraftArticleHref } from "@/lib/optimization/article-view";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

export function BuildSource({ text, refs, ruleset }: { text: string; refs: SourceRef[]; ruleset: OptimizationRuleset }) {
  return <details className="mt-3 text-sm text-slate-400">
    <summary className="min-h-11 cursor-pointer py-2 text-slate-200">Чому цей варіант</summary>
    <FormattedDescription content={text} className="mt-2 text-sm text-slate-300" />
    {refs.map((ref) => <ModeLink prefetch={false} key={`${ref.articleId}/${ref.sectionId}`} href={buildDraftArticleHref(ruleset, ref.articleId.replace(/^rpgbot-/, ""), ref.sectionId)} target="_blank" rel="noreferrer" className="mt-2 inline-block min-h-11 py-2 underline">До розділу статті ↗</ModeLink>)}
  </details>;
}

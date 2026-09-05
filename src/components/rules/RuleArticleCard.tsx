import { findRetiredSlugsFor, RuleArticle } from "@/lib/rulesData";
import { findProvenance, RuleProvenance } from "@/lib/rulesProvenance";
import { cn } from "@/lib/utils";
import { Sparkles, Info, AlertTriangle, ArrowRight } from "lucide-react";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

type Props = {
  article: RuleArticle;
  className?: string;
};

export function RuleArticleCard({ article, className }: Props) {
  const is2024 = article.ruleset === "RULES_2024";
  const sourceLabel = findSourceLabel(findProvenance(article));

  return (
    <article
      id={article.slug}
      className={cn(
        "glass-card rounded-2xl border border-white/10 bg-slate-950/60 p-6 md:p-8 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-white/20 scroll-mt-24",
        className
      )}
    >
      {findRetiredSlugsFor(article).map((retired) => (
        <span key={retired} id={retired} className="block scroll-mt-24" />
      ))}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-rpg-display text-2xl md:text-3xl text-slate-100 tracking-wide">
              {article.title}
            </h2>
            {is2024 && (
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                2024
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400 font-mono italic">
            {sourceLabel ? `${sourceLabel}: ${article.engTitle}` : article.engTitle}
          </p>
        </div>
      </div>

      {/* Summary */}
      <p className="mt-4 text-sm md:text-base text-slate-300 leading-relaxed font-sans">
        {article.summary}
      </p>

      {/* Subsections with distinct visual styling and Markdown rendering */}
      <div className="mt-6 space-y-6">
        {article.subsections.map((sub) => (
          <div
            key={sub.id}
            id={sub.id}
            className={cn(
              "rounded-xl border border-white/10 bg-slate-900/60 p-5 md:p-6 scroll-mt-24 shadow-md",
              is2024 ? "border-l-4 border-l-amber-500/70" : "border-l-4 border-l-arcane-500/70"
            )}
          >
            <h3 className="font-rpg-display text-lg md:text-xl text-slate-100 font-semibold tracking-wide flex items-center gap-2 pb-2 border-b border-white/5">
              <ArrowRight className={cn("h-4 w-4 shrink-0", is2024 ? "text-amber-400" : "text-arcane-400")} />
              <span>{sub.title}</span>
              {sub.engTitle && (
                <span className="text-xs text-slate-400 font-mono font-normal">({sub.engTitle})</span>
              )}
            </h3>

            {/* Markdown rendered content with bold styling and tables */}
            <div className="mt-4 text-slate-300 leading-relaxed font-sans">
              <FormattedDescription content={sub.content} className="text-slate-300 text-sm leading-relaxed" />
            </div>

            {/* Optional Callout */}
            {sub.callout && (
              <div
                className={cn(
                  "mt-4 rounded-xl border p-3.5 flex items-start gap-3 text-xs leading-relaxed",
                  sub.callout.type === "edition_diff"
                    ? "border-amber-500/30 bg-amber-950/30 text-amber-200"
                    : sub.callout.type === "warning"
                    ? "border-rose-500/30 bg-rose-950/30 text-rose-200"
                    : "border-sky-500/30 bg-sky-950/30 text-sky-200"
                )}
              >
                {sub.callout.type === "edition_diff" ? (
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                ) : sub.callout.type === "warning" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">{sub.callout.title}</div>
                  <div className="mt-0.5 opacity-90">{sub.callout.text}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

/// Підпис під заголовком — код книги (PHB, DMG, XGE…) і англійський заголовок, щоб читач міг
/// звірити текст з оригіналом. Статус джерела («SRD 5.1», «Поза SRD», «Наш текст») читачеві
/// нічого не дає — рішення власника 2026-09-02, [Р35]; він лишається в даних (`provenance.kind`).
function findSourceLabel(provenance: RuleProvenance): string {
  return provenance.kind === "beyond-srd" ? provenance.book : "";
}

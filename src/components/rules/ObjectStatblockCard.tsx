import { GeneratedObjectStatblock } from "@/lib/objectTypes";
import { findObjectSizeLabel, findObjectTypeLabel } from "@/lib/refs/object-labels";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { cn } from "@/lib/utils";
import { ArrowRight, Wrench } from "lucide-react";

type Props = {
  article: GeneratedObjectStatblock;
  className?: string;
};

export function ObjectStatblockCard({ article, className }: Props) {
  const is2024 = article.ruleset === "RULES_2024";
  const sourceLabel = article.provenance.book;

  return (
    <article
      id={article.slug}
      className={cn(
        "glass-card rounded-2xl border border-white/10 bg-slate-950/60 p-6 md:p-8 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-white/20 scroll-mt-24",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Wrench className={cn("h-5 w-5 shrink-0", is2024 ? "text-amber-400" : "text-arcane-400")} />
            <h2 className="font-rpg-display text-2xl md:text-3xl text-slate-100 tracking-wide">{article.title}</h2>
            {is2024 && (
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                2024
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400 font-mono italic">
            {sourceLabel}: {article.engTitle}
          </p>
        </div>
      </div>

      {/* Значки — тип, розмір, КЗ/ХП */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-lg border px-2.5 py-1 text-xs font-medium",
            is2024 ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-arcane-500/30 bg-arcane-500/10 text-arcane-300"
          )}
        >
          {findObjectTypeLabel(article.objectType)}
        </span>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
          {findObjectSizeLabel(article.size)}
        </span>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
          КЗ {article.ac}
        </span>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
          ХП {article.hp}
        </span>
        {article.immune.length > 0 && (
          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
            Імунітет: {article.immune.join(", ")}
          </span>
        )}
      </div>

      {/* Subsections — Опис, потім Дії */}
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
              <span className="text-xs text-slate-400 font-mono font-normal">({sub.engTitle})</span>
            </h3>

            <div className="mt-4 text-slate-300 leading-relaxed font-sans">
              <FormattedDescription content={sub.content} className="text-slate-300 text-sm leading-relaxed" />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

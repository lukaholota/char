"use client";

import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Ruleset } from "@prisma/client";
import {
  RuleCategory,
  ConditionData,
  RuleArticle,
} from "@/lib/rulesData";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { useNoAiMode } from "@/components/no-ai/NoAiModeProvider";
import { getRuleCategoryVisual } from "@/components/catalogs/catalog-visuals";
import { findAccentVariant } from "@/styles/edition-accent";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

type Props = {
  categories: RuleCategory[];
  conditions: ConditionData[];
  featuredArticles: RuleArticle[];
  ruleset?: Ruleset;
};

export function RulesHub({
  categories,
  featuredArticles,
  ruleset = "RULES_2014",
}: Props) {
  const is2024 = ruleset === "RULES_2024";
  const { enabled: noAi } = useNoAiMode();
  const [searchQuery, setSearchQuery] = useState("");

  const basePath = is2024 ? "/2024/rules" : "/rules";

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((cat) => {
      if (cat.title.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q)) {
        return true;
      }
      // Also match if any article in this category matches
      const catArticles = featuredArticles.filter((a) => a.category === cat.key);
      return catArticles.some(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.engTitle.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, categories, featuredArticles]);

  return (
    <motion.div
      className="min-h-[100dvh] w-full p-4 sm:p-8 pt-6 sm:pt-10 pb-36 sm:pb-24 pb-[calc(9rem+env(safe-area-inset-bottom,0px))] flex flex-col items-center justify-start max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Clean Header section without top pill */}
      <motion.div variants={cardVariants} className="text-center mb-8 max-w-2xl">
        <h1 className="font-rpg-display text-4xl sm:text-6xl uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-arcane-200">
          Довідник Правил
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
          Офіційний збірник правил D&D 5e: бій, магія, характеристики, стани істот, пригоди та настанови для Майстра.
        </p>

        {/* Global Search Box in Wiki */}
        <div className="mt-6 relative max-w-md mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Фільтр розділів та правил..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-slate-900/80 border-white/15 text-slate-200 placeholder:text-slate-500 rounded-2xl shadow-lg focus:border-arcane-400/50"
          />
        </div>
      </motion.div>

      {/* 6 Clean Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {filteredCategories.map((cat) => {
          const href = `${basePath}/${cat.key}`;
          const visual = getRuleCategoryVisual(cat.key);

          return (
            <Link
              key={cat.key}
              href={href}
              className="group relative block transition-transform duration-300 hover:-translate-y-1"
            >
              <motion.div
                variants={cardVariants}
                className={cn("w-full", noAi ? "h-48 sm:h-52" : "h-64 sm:h-72")}
              >
                <FramedIllustration
                  src={cat.imageSrc}
                  alt={cat.title}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  chamfer="md"
                  vignette="lg"
                  imageClassName="opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
                  hoverGlowColor={
                    findAccentVariant(is2024, { prism: "rgba(192,74,224,0.35)", arcane: "rgba(45,212,191,0.35)" })
                  }
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

                  {/* Bottom Content */}
                  <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 p-6">
                    <h2 className="font-rpg-display text-2xl sm:text-3xl text-white group-hover:text-amber-300 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {cat.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {cat.description}
                    </p>
                    <div className="pt-1 flex items-center gap-1.5 text-xs font-semibold text-arcane-400 group-hover:text-prism-300 transition-colors">
                      <span>Відкрити розділ</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </FramedIllustration>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center text-slate-400 mt-4">
          Розділів за запитом &ldquo;{searchQuery}&rdquo; не знайдено.
        </div>
      )}

      {/* Footer clearance */}
      <div className="h-24 sm:h-12 w-full shrink-0 pointer-events-none" aria-hidden="true" />
    </motion.div>
  );
}

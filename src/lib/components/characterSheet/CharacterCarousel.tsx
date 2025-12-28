"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PersWithRelations } from "@/lib/actions/pers";
import MainStatsSlide from "./slides/MainStatsSlide";
import SkillsSlide from "./slides/SkillsSlide";
import CombatPage from "./CombatPage";
import MagicSlide from "./slides/MagicSlide";
import FeaturesSlide from "./slides/FeaturesSlide";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

interface CharacterCarouselProps {
  pers: PersWithRelations;
  onPersUpdate: (next: PersWithRelations) => void;
  groupedFeatures: CharacterFeaturesGroupedResult | null;
  isReadOnly?: boolean;
}

export default function CharacterCarousel({ pers, onPersUpdate, groupedFeatures, isReadOnly }: CharacterCarouselProps) {
  const isLg = useMediaQuery("(min-width: 1024px)");
  const isMd = useMediaQuery("(min-width: 768px)");

  type SlideId = "stats" | "skills" | "equipment" | "magic" | "features";
  type SlideDef = { id: SlideId; label: string };

  const allSlides: SlideDef[] = useMemo(
    () => [
      { id: "stats", label: "Головна" },
      { id: "skills", label: "Навички" },
      { id: "equipment", label: "Спорядження" },
      { id: "magic", label: "Магія" },
      { id: "features", label: "Фічі" },
    ],
    []
  );

  const totalSlides = allSlides.length;
  const visibleCount = isLg ? 3 : isMd ? 2 : 1;

  const getStartIndex = () => (isLg ? 4 : 0);

  const [currentIndex, setCurrentIndex] = useState(getStartIndex);

  // On breakpoint change, set initial index per spec.
  useEffect(() => {
    setCurrentIndex(getStartIndex());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLg, isMd]);

  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const getVisibleSlides = () => {
    const visible: Array<SlideDef & { index: number }> = [];
    for (let i = 0; i < visibleCount; i++) {
      const index = (currentIndex + i) % totalSlides;
      visible.push({ ...allSlides[index], index });
    }
    return visible;
  };

  const visibleSlides = getVisibleSlides();

  const renderSlide = (id: SlideId) => {
    if (id === "stats") return <MainStatsSlide pers={pers} onPersUpdate={onPersUpdate} isReadOnly={isReadOnly} />;
    if (id === "skills") return <SkillsSlide pers={pers} onPersUpdate={onPersUpdate} isReadOnly={isReadOnly} />;
    if (id === "equipment") return <CombatPage pers={pers} onPersUpdate={onPersUpdate} isReadOnly={isReadOnly} />;
    if (id === "magic") return <MagicSlide pers={pers} onPersUpdate={onPersUpdate} isReadOnly={isReadOnly} />;
    if (id === "features") return <FeaturesSlide pers={pers} onPersUpdate={onPersUpdate} groupedFeatures={groupedFeatures} isReadOnly={isReadOnly} />;
    return null;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    swipeStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    // Horizontal swipe only; keep vertical scroll intact.
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dy) > 40) return;

    if (dx < 0) handleNext();
    else handlePrevious();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0 px-3 pt-3 pb-2 md:px-4 md:pt-4"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-full grid gap-3 md:gap-4" style={{ gridTemplateColumns: `repeat(${visibleCount}, 1fr)` }}>
            {visibleSlides.map((slide) => (
              <div
                key={`${slide.id}-${slide.index}`}
                className="h-full bg-slate-900/90 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl shadow-black/30 overflow-hidden"
              >
                <div className="h-full overflow-y-auto" style={{ scrollBehavior: "smooth" }}>
                  {renderSlide(slide.id)}
                </div>
              </div>
            ))}
          </div>

          {/* Side navigation arrows (all breakpoints) */}
          <Button
            onClick={handlePrevious}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 bg-slate-900/90 hover:bg-slate-800/95 backdrop-blur-sm border border-white/20 text-white rounded-full w-10 h-10 md:w-12 md:h-12 p-0 shadow-xl z-10"
            size="icon"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          <Button
            onClick={handleNext}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 bg-slate-900/90 hover:bg-slate-800/95 backdrop-blur-sm border border-white/20 text-white rounded-full w-10 h-10 md:w-12 md:h-12 p-0 shadow-xl z-10"
            size="icon"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
        </div>
      </div>

      {/* Bottom navigation (always visible) */}
      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-slate-900/95 backdrop-blur-xl px-2 py-2 shadow-xl shadow-black/30">
        <div className="mx-auto max-w-5xl flex items-center justify-center gap-1">
          {allSlides.map((s, idx) => {
            const active = idx === currentIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                }}
                className={
                  "px-2 py-1 rounded-md text-[10px] sm:text-xs transition border " +
                  (active
                    ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-100"
                    : "bg-white/5 border-white/10 text-slate-200/80 hover:bg-white/10")
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { SpellRatingSection } from "@/components/spells/SpellRatingSection";
import { useSpellRatingFinder } from "@/hooks/useSpellRatingFinder";
import { useSpellRatingContextStore } from "@/lib/stores/spellRatingContextStore";
import { cn } from "@/lib/utils";

const DIALOG_OPEN_DELAY_MS = 120;
const HIGHLIGHT_DURATION_MS = 1800;

export function SpellModalRatings({ spell }: { spell: { engName: string; ruleset?: string | null } }) {
  const casters = useSpellRatingContextStore((state) => state.casters);
  const findMatches = useSpellRatingFinder(casters, casters.length > 0 && spell.ruleset !== "RULES_2024");
  const hasMatches = (findMatches?.(spell.engName) ?? []).length > 0;
  const { isHighlighted, sectionRef } = useRatingFocus(hasMatches);
  const matches = findMatches?.(spell.engName) ?? [];

  if (!hasMatches) return null;

  return (
    <div ref={sectionRef} className={cn("mt-4 scroll-mt-2 rounded-2xl", isHighlighted && "rpgbot-highlight")}>
      <SpellRatingSection matches={matches} spellEngName={spell.engName} />
    </div>
  );
}

function useRatingFocus(hasMatches: boolean) {
  const isFocusRequested = useSpellRatingContextStore((state) => state.isRatingFocusRequested);
  const clearRatingFocus = useSpellRatingContextStore((state) => state.clearRatingFocus);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (!hasMatches || !isFocusRequested) return;
    const timer = window.setTimeout(() => {
      clearRatingFocus();
      setIsHighlighted(true);
      sectionRef.current?.scrollIntoView({ block: "start", behavior: findScrollBehavior() });
    }, DIALOG_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hasMatches, isFocusRequested, clearRatingFocus]);

  useEffect(() => {
    if (!isHighlighted) return;
    const timer = window.setTimeout(() => setIsHighlighted(false), HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isHighlighted]);

  return { isHighlighted, sectionRef };
}

function findScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

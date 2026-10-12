"use client";

import { useEffect, useState } from "react";
import { loadSpellRatingComments } from "@/lib/optimization/spell-rating-comments";
import type { SpellRatingComment } from "@/lib/optimization/spell-rating-comment-markdown";
import { toEntitySlug } from "@/lib/slug-utils";

export function useSpellRatingComment(listKey: string, spellEngName: string): SpellRatingComment | null {
  const [comment, setComment] = useState<SpellRatingComment | null>(null);

  useEffect(() => {
    let isCurrent = true;
    loadSpellRatingComments(listKey).then((commentBySlug) => {
      if (isCurrent) setComment(commentBySlug[toEntitySlug(spellEngName)] ?? null);
    });
    return () => {
      isCurrent = false;
    };
  }, [listKey, spellEngName]);

  return comment;
}

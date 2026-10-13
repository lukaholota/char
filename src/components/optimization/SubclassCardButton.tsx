"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import type { SubclassCardLink } from "@/lib/optimization/article-catalog-links.server";
import { CatalogMention } from "./CatalogMention";

type SubclassCardButtonProps = {
  headingLinks: Readonly<Record<string, SubclassCardLink>>;
  subject: SubclassCardLink | null;
};

export function SubclassCardButton({ headingLinks, subject }: SubclassCardButtonProps) {
  const sectionInView = useSectionInView(Object.keys(headingLinks));
  const link = (sectionInView ? headingLinks[sectionInView] : null) ?? subject;
  if (!link) return null;
  return (
    <CatalogMention
      href={link.href}
      title={link.name}
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-3 z-[55] flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-arcane-300/70 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-arcane-100 no-underline shadow-xl shadow-black/60 hover:border-arcane-200 hover:bg-slate-900 md:bottom-6 md:right-6"
    >
      <BookOpen aria-hidden className="size-4 shrink-0" />
      <span className="truncate">Підклас: {link.name}</span>
    </CatalogMention>
  );
}

function useSectionInView(sectionIds: string[]): string | null {
  const [sectionInView, setSectionInView] = useState<string | null>(null);
  const idsKey = sectionIds.join(" ");
  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(" ");
    let frame = 0;
    const update = () => {
      frame = 0;
      setSectionInView(findSectionAtReadingLine(ids, window.innerHeight * 0.4));
    };
    const scheduleUpdate = () => { frame ||= requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", scheduleUpdate, { capture: true, passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate, { capture: true });
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [idsKey]);
  return sectionInView;
}

function findSectionAtReadingLine(sectionIds: string[], line: number): string | null {
  return sectionIds.findLast((id) => {
    const rect = document.getElementById(id)?.getBoundingClientRect();
    return rect ? rect.top <= line && rect.bottom >= line : false;
  }) ?? null;
}

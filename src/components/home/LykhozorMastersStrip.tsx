import { ExternalLink } from "lucide-react";

import { LYKHOZOR_CAREERS_URL, LYKHOZOR_MARK_SRC } from "@/lib/whats-new/release-notes";

export function LykhozorMastersStrip() {
  return (
    <a
      href={LYKHOZOR_CAREERS_URL}
      target="_blank"
      rel="noreferrer"
      className="glass-card flex items-center gap-3 rounded-xl p-3 text-slate-100 outline outline-1 -outline-offset-1 outline-transparent transition-colors hover:outline-arcane-400/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-300 sm:gap-5 sm:px-6 sm:py-4"
    >
      <img src={LYKHOZOR_MARK_SRC} alt="" width={68} height={56} className="h-14 w-auto shrink-0" />

      <span className="min-w-0 flex-1">
        <span className="block font-rpg-display text-lg leading-tight sm:text-xl">Дід Лихозор шукає майстрів</span>
        <span className="mt-1 block text-sm leading-snug text-slate-300">
          Київський клуб D&amp;D запрошує водити офлайн на вихідних і онлайн у Roll20.
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2 text-sm">
        <span className="hidden sm:inline">Вакансії</span>
        <ExternalLink aria-hidden className="h-4 w-4" />
        <span className="sr-only">(відкриється в новій вкладці)</span>
      </span>
    </a>
  );
}

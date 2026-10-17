import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const RESTORED_DRAFT_MESSAGE = "Відновлено незавершене підвищення.";

export function LevelUpLayout({ nextLevel, notice, children }: { nextLevel: number; notice?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:gap-4 sm:px-4 md:gap-6 md:px-0 md:py-6 md:pb-6">
      <div className="glass-panel border-gradient-rpg w-full rounded-2xl px-3 py-4 sm:px-4 sm:py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="space-y-1">
            <h1 className="font-rpg-display text-xl font-semibold uppercase tracking-widest text-slate-200 sm:text-2xl md:text-3xl">
              Підвищення рівня
            </h1>
            <div className="text-sm text-slate-400">
              До {nextLevel}-го рівня
            </div>
          </div>
          {notice}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Живий регіон стоїть у DOM з першого рендеру: інакше екранний читач не озвучить появу тексту. */
export function RestoredDraftAnnouncement({ isRestored }: { isRestored: boolean }) {
  return <p role="status" className="sr-only">{isRestored ? RESTORED_DRAFT_MESSAGE : ""}</p>;
}

export function RestoredDraftNotice({ onStartOver }: { onStartOver: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
      <span>{RESTORED_DRAFT_MESSAGE}</span>
      <Button type="button" variant="outline" className="min-h-11 border-white/15 bg-white/5 text-slate-200 hover:bg-white/7" onClick={onStartOver}>
        Почати заново
      </Button>
    </div>
  );
}

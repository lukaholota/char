import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { cn } from "@/lib/utils";

export function HomebrewPageShell({ title, backHref, backLabel, isWide = false, children }: { title: string; backHref: string; backLabel: string; isWide?: boolean; children: ReactNode }) {
  const columnWidth = isWide ? "max-w-6xl" : "max-w-3xl";
  return (
    <div className="min-h-dvh w-full shrink-0 overflow-x-clip pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-10">
      <div className="sticky top-safe z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className={cn("mx-auto flex items-center gap-3 px-4 py-3", columnWidth)}>
          <Link href={backHref} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">{title}</h1>
        </div>
      </div>
      <main className={cn("mx-auto space-y-6 px-4 py-6", columnWidth)}>{children}</main>
    </div>
  );
}

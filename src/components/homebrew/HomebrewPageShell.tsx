import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";

export function HomebrewPageShell({ title, backHref, backLabel, children }: { title: string; backHref: string; backLabel: string; children: ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-28">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href={backHref} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">{title}</h1>
        </div>
      </div>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">{children}</main>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

/// Оболонка діалогу фільтрів: заголовок, секції, «Скинути» і «Застосувати». Секції приходять
/// дітьми — каталог складає їх із `FilterGroup`/`FilterChip` і `SourceFilterSection`.
export function CatalogFilterDialog({
  open,
  onOpenChange,
  title,
  is2024 = false,
  onClear,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  is2024?: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85dvh] max-w-lg overflow-y-auto border-white/10 bg-slate-950/95 p-6 text-slate-100 backdrop-blur-2xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="font-rpg-display text-lg uppercase tracking-wider text-slate-200">
          {title}
        </DialogTitle>

        <div className="mt-4 space-y-5">{children}</div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-slate-400">
            Скинути все
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className={cn(
              "rounded-xl text-xs font-semibold",
              findAccentVariant(is2024, { prism: "bg-prism-500 text-slate-950 hover:bg-prism-400", arcane: "bg-arcane-500 text-slate-950 hover:bg-arcane-400" }),
            )}
          >
            Застосувати
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

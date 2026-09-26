"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/// Історію веде адреса (reading-history): власний запис Dialog дав би «Назад» двічі.
/// Фокус після закриття повертає useReadingNavigation — до картки, з якої відкрили.
export function CatalogReadingDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())} enableBackButtonClose={false}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl grid-cols-[minmax(0,1fr)] overflow-y-auto overflow-x-hidden border-white/10 bg-slate-950/95 px-4 pb-6 pt-3 text-slate-100 backdrop-blur-2xl sm:px-6"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useCallback, useState, type ReactNode } from "react";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useReadingDialogFocus } from "@/hooks/useReadingDialogFocus";
import { findCardTargetInHref } from "@/lib/optimization/reference-card-target";
import { ReferenceCardView } from "./ReferenceCardView";

export function CatalogCardContent({ href, title, fallback, onClose }: { href: string; title: string; fallback: ReactNode; onClose: () => void }) {
  const focus = useReadingDialogFocus();
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const onBranchChange = useCallback((isOpen: boolean) => setIsBranchOpen(isOpen), []);
  const target = findCardTargetInHref(href);
  return (
    <DialogContent {...focus.dialogProps} showClose={!isBranchOpen} aria-describedby={undefined}
      className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-3xl grid-cols-[minmax(0,1fr)] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
      <DialogTitle className="sr-only">{title}</DialogTitle>
      {target ? <ReferenceCardView href={href} target={target} onBranchChange={onBranchChange} onClose={onClose} unavailable={fallback} /> : fallback}
    </DialogContent>
  );
}

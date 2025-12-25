"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/lib/components/ui/dialog";

export type EntityInfoKind = "race" | "class" | "background";

export interface EntityInfoDialogEntity {
  name?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

interface EntityInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  kind: EntityInfoKind;
  title: string;
  subtitle?: string;
  entity?: EntityInfoDialogEntity | null;
  children?: ReactNode;
}

export function EntityInfoDialog({
  isOpen,
  onClose,
  kind,
  title,
  subtitle,
  entity,
  children,
}: EntityInfoDialogProps) {
  const description = (entity?.description ?? "").toString().trim();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-2xl overflow-y-auto bg-slate-950/95 backdrop-blur border border-white/10 text-slate-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            {subtitle ? `${subtitle} • ` : ""}
            {kind.toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        {children ? <div className="space-y-3">{children}</div> : null}

        {description ? (
          <div className="text-sm text-slate-200/90 whitespace-pre-line leading-relaxed">{description}</div>
        ) : (
          <div className="text-sm text-slate-400">Немає опису</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

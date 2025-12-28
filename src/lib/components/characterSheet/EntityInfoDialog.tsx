"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { useModalBackButton } from "@/hooks/useModalBackButton";

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

  useModalBackButton(isOpen, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-2xl overflow-y-auto shadow-2xl ring-1 ring-white/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            {subtitle ? `${subtitle} • ` : ""}
            {kind.toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        {children ? <div className="space-y-3">{children}</div> : null}

        {description ? (
          <FormattedDescription
            content={description}
            className="text-sm text-slate-200/90 leading-relaxed"
          />
        ) : (
          <div className="text-sm text-slate-400">Немає опису</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

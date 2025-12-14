"use client";

import { ReactNode, SyntheticEvent, useCallback, useState } from "react";
import { CircleHelp } from "lucide-react";
import clsx from "clsx";
import type { FocusOutsideEvent, PointerDownOutsideEvent } from "@radix-ui/react-dismissable-layer";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/lib/components/ui/dialog";
import { Button } from "@/lib/components/ui/Button";

interface InfoDialogProps {
  title: string;
  subtitle?: string;
  triggerLabel: string;
  triggerClassName?: string;
  children: ReactNode;
}

export const InfoDialog = ({
  title,
  subtitle,
  triggerLabel,
  triggerClassName,
  children,
}: InfoDialogProps) => {
  const [open, setOpen] = useState(false);

  const stopPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const handleInteractOutside = useCallback(
    (event: PointerDownOutsideEvent | FocusOutsideEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const originalEvent = event.detail?.originalEvent;
      originalEvent?.stopPropagation();
      originalEvent?.preventDefault?.();

      setOpen(false);
    },
    []
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className={clsx(
            "absolute -right-2.5 -top-2.5 h-9 w-9 rounded-full border border-indigo-500/50 bg-slate-900/90 text-indigo-100 shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:text-white focus-visible:ring-indigo-400 sm:-right-3 sm:-top-3",
            triggerClassName
          )}
          aria-label={triggerLabel}
          onClick={(e) => e.stopPropagation()}
        >
          <CircleHelp className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[82vh] max-w-3xl overflow-y-auto border border-slate-800/80 bg-slate-950 text-slate-100 shadow-2xl shadow-indigo-500/10 sm:rounded-2xl"
        onPointerDown={stopPropagation}
        onClick={stopPropagation}
        onInteractOutside={handleInteractOutside}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-semibold text-white">{title}</DialogTitle>
          {subtitle ? (
            <DialogDescription className="text-sm text-slate-400">
              {subtitle}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-4 pb-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export const InfoGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-2 sm:grid-cols-2">{children}</div>
);

export const InfoPill = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2 shadow-inner shadow-slate-900/40">
    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
      {label}
    </p>
    <div className="text-sm font-semibold leading-tight text-slate-100">
      {value}
    </div>
  </div>
);

export const InfoSectionTitle = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
    {children}
  </p>
);

export default InfoDialog;

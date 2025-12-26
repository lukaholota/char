"use client";

import { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import clsx from "clsx";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const InfoDialogContent = ({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) => {
  return (
    <DialogContent
      className={clsx(
        "max-h-[85vh] w-[95vw] max-w-lg overflow-y-auto",
        className
      )}
    >
      <div className="absolute left-1/2 top-0 h-[2px] w-1/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

      <DialogHeader className="space-y-3 border-b border-white/10 pb-4">
        <DialogTitle className="font-rpg-display text-2xl font-semibold uppercase tracking-widest text-slate-200">
          {title}
        </DialogTitle>
        {subtitle && (
          <DialogDescription className="text-sm font-medium text-slate-300">
            {subtitle}
          </DialogDescription>
        )}
      </DialogHeader>

      <div className="space-y-4 pt-4 text-sm leading-relaxed text-slate-200/90 sm:text-base">{children}</div>
    </DialogContent>
  );
};

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
  return (
    <Dialog>
      <div 
        onPointerDown={(e) => {
          // Prevent the underlying Card onClick when the trigger overlaps the card.
          // Must NOT be capture-phase; capture would block the click from reaching the trigger.
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={clsx(
          "absolute -right-2.5 -top-2.5 z-[50] sm:-right-3 sm:-top-3",
          triggerClassName
        )}
      >
        <DialogTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="glass-panel border-gradient-rpg h-9 w-9 rounded-full text-slate-100 transition-all duration-200 hover:text-white focus-visible:ring-cyan-400/30"
            aria-label={triggerLabel}
          >
            <CircleHelp className="h-5 w-5" />
          </Button>
        </DialogTrigger>
      </div>
      
      <InfoDialogContent title={title} subtitle={subtitle}>
        {children}
      </InfoDialogContent>
    </Dialog>
  );
};

export const ControlledInfoDialog = ({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  contentClassName?: string;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <InfoDialogContent title={title} subtitle={subtitle} className={contentClassName}>
        {children}
      </InfoDialogContent>
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
}) => {
  if (!value || value === "—") return null;
  
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div className="text-sm font-semibold leading-tight text-slate-100">
        {value}
      </div>
    </div>
  );
};

export const InfoSectionTitle = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
    {children}
  </p>
);

export default InfoDialog;

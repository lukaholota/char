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
        "max-h-[85vh] w-[95vw] max-w-lg overflow-y-auto bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/30 shadow-[0_0_50px_-10px_rgba(79,70,229,0.5)] rounded-2xl p-6",
        className
      )}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_10px_indigo]" />

      <DialogHeader className="space-y-3 pb-4 border-b border-indigo-500/20">
        <DialogTitle className="text-2xl font-bold tracking-wide text-indigo-100 drop-shadow-md">
          {title}
        </DialogTitle>
        {subtitle && (
          <DialogDescription className="text-sm text-indigo-200/70 font-medium">
            {subtitle}
          </DialogDescription>
        )}
      </DialogHeader>

      <div className="pt-4 space-y-4 text-slate-300 leading-relaxed text-sm sm:text-base">{children}</div>
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
        onClick={(e) => {
          // Блокуємо поширення до картки, але НЕ preventDefault!
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
            className="h-9 w-9 rounded-full border border-indigo-500/50 bg-slate-900/90 text-indigo-100 shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:text-white focus-visible:ring-indigo-400"
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
    <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-indigo-400">
        {label}
      </p>
      <div className="text-sm font-semibold leading-tight text-indigo-200">
        {value}
      </div>
    </div>
  );
};

export const InfoSectionTitle = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-400">
    {children}
  </p>
);

export default InfoDialog;

"use client";

import * as React from "react";

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

export function Collapsible({
  open: openProp,
  defaultOpen,
  onOpenChange,
  className,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(!!defaultOpen);
  const isControlled = typeof openProp === "boolean";
  const open = isControlled ? (openProp as boolean) : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div className={className} data-state={open ? "open" : "closed"}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function CollapsibleTrigger({ onClick, type, ...props }, ref) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) {
    throw new Error("CollapsibleTrigger must be used within <Collapsible>");
  }

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-expanded={ctx.open}
      data-state={ctx.open ? "open" : "closed"}
      onClick={(e) => {
        ctx.setOpen(!ctx.open);
        onClick?.(e);
      }}
      {...props}
    />
  );
});

export const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CollapsibleContent({ style, hidden, ...props }, ref) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) {
    throw new Error("CollapsibleContent must be used within <Collapsible>");
  }

  return (
    <div
      ref={ref}
      data-state={ctx.open ? "open" : "closed"}
      hidden={!ctx.open || hidden}
      style={style}
      {...props}
    />
  );
});

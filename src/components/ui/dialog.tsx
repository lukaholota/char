"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-rpg-dialog-overlay
    className={cn(
      "fixed inset-0 z-[9999] bg-slate-950/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    onPointerDown={(e) => {
      props.onPointerDown?.(e);

      // Prevent click-through to underlying UI when closing a dialog via overlay click.
      // Radix closes on pointerdown/outside; the subsequent click event may land on the element
      // that was behind the overlay if the dialog unmounts between pointerdown and click.
      const handler = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(event as any).stopImmediatePropagation?.();
        document.removeEventListener("click", handler, true);
      };

      document.addEventListener("click", handler, true);
      window.setTimeout(() => {
        document.removeEventListener("click", handler, true);
      }, 800);
    }}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

function isFromAnyDialogContent(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("[data-rpg-dialog-content]"));
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showClose?: boolean;
    closeLabel?: string;
  }
>(
  (
    {
      className,
      children,
      showClose = true,
      closeLabel = "Close",
      onPointerDownOutside,
      onInteractOutside,
      onFocusOutside,
      ...props
    },
    ref
  ) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-rpg-dialog-content
      className={cn(
        "fixed left-[50%] top-[50%] z-[9999] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/28 to-slate-950/18 p-6 text-slate-50 backdrop-blur-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      onPointerDown={(e) => {
        // We only want to stop propagation for pointer down if it's actually handled by this content
        // But Radix handles its own layering. Standard shadcn/radix doesn't have these.
        // Removing them to fix outside-click issues for nested portals.
        props.onPointerDown?.(e);
      }}
      onClick={(e) => {
        props.onClick?.(e);
      }}
      onPointerDownOutside={(e) => {
        // If another dialog is stacked on top, interactions with it should NOT dismiss this one.
        // Allow clicking the overlay to dismiss; only block clicks inside another dialog content.
        if (isFromAnyDialogContent(e.target)) e.preventDefault();
        onPointerDownOutside?.(e);
      }}
      onInteractOutside={(e) => {
        if (isFromAnyDialogContent(e.target)) e.preventDefault();
        onInteractOutside?.(e);
      }}
      onFocusOutside={(e) => {
        if (isFromAnyDialogContent(e.target)) e.preventDefault();
        onFocusOutside?.(e);
      }}
      {...props}
    >
      {children}
      {showClose ? (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">{closeLabel}</span>
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPortal>
  )
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "font-rpg-display text-lg font-semibold uppercase leading-none tracking-wider text-slate-200",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

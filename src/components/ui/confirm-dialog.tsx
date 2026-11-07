"use client";

import { useRef } from "react";
import { create } from "zustand";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

export type ConfirmRequest = { title: string; description?: string; confirmLabel: string; isDestructive?: boolean };
type PendingConfirm = ConfirmRequest & { resolve: (isConfirmed: boolean) => void };

const usePendingConfirm = create<{ pending: PendingConfirm | null }>(() => ({ pending: null }));

/// Замість window.confirm: діалог у стилі сайту, «Скасувати» у фокусі, Esc і «назад» — це відмова.
export function askToConfirm(request: ConfirmRequest): Promise<boolean> {
  usePendingConfirm.getState().pending?.resolve(false);
  return new Promise((resolve) => usePendingConfirm.setState({ pending: { ...request, resolve } }));
}

function settleConfirm(isConfirmed: boolean) {
  const { pending } = usePendingConfirm.getState();
  if (!pending) return;
  usePendingConfirm.setState({ pending: null });
  pending.resolve(isConfirmed);
}

export function ConfirmDialogHost() {
  const pending = usePendingConfirm((state) => state.pending);
  const lastShown = useRef<ConfirmRequest | null>(null);
  if (pending) lastShown.current = pending;
  const shown = pending ?? lastShown.current;
  return (
    <Dialog open={pending !== null} onOpenChange={(isOpen) => (isOpen ? undefined : settleConfirm(false))}>
      <DialogContent showClose={false} {...(shown?.description ? {} : { "aria-describedby": undefined })} className="max-w-sm gap-5">
        <div className="grid gap-2">
          <DialogTitle className="normal-case leading-7 tracking-normal">{shown?.title}</DialogTitle>
          {shown?.description ? <DialogDescription className="text-sm text-slate-300">{shown.description}</DialogDescription> : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => settleConfirm(false)} className="h-11">
            Скасувати
          </Button>
          <Button type="button" variant={shown?.isDestructive ? "destructive" : "default"} onClick={() => settleConfirm(true)} className="h-11">
            {shown?.confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

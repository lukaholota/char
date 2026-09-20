"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveDisplayName } from "@/lib/actions/content-discussion-actions";
import { MAX_DISPLAY_NAME_LENGTH } from "@/rules/display-name";

type Props = {
  open: boolean;
  suggestion: string;
  confirmLabel?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function DisplayNameDialog({ open, suggestion, confirmLabel = "Зберегти", onOpenChange, onSaved }: Props) {
  const [name, setName] = useState(suggestion);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setName(suggestion);
  }, [open, suggestion]);

  const submit = () =>
    startTransition(async () => {
      const result = await saveDisplayName(name);
      if (!result.success) return void toast.error(result.error);
      onOpenChange(false);
      onSaved();
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg">Як вас підписувати?</DialogTitle>
          <DialogDescription>Цей нік бачать усі поруч з вашими коментарями й записами. Змінити його можна будь-коли.</DialogDescription>
        </DialogHeader>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          placeholder="Ваш нік"
          aria-label="Ваш нік"
          className="h-11 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 text-base text-slate-100 outline-none focus:ring-1 focus:ring-white/20 sm:text-sm"
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="button" className="h-11 sm:h-9" disabled={isPending || !name.trim()} onClick={submit}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

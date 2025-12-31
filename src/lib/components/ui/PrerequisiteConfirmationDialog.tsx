"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  reason?: string;
}

export function PrerequisiteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Ви не відповідаєте вимогам",
  description = "Ви впевнені, що хочете обрати цю опцію, попри те, що не відповідаєте її вимогам?",
  reason,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glass-panel border-gradient-rpg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        {reason && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-sm text-red-200 font-medium">
              Причина: {reason}
            </p>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-300 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Скасувати
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Так, додати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TermPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  terms: Record<string, string>;
  initialLabels: readonly string[];
  onApply: (labels: string[]) => void;
};

export function TermPickerDialog({ open, onOpenChange, title, terms, initialLabels, onApply }: TermPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>
        <TermPickerBody terms={terms} initialLabels={initialLabels} onClose={() => onOpenChange(false)} onApply={onApply} />
      </DialogContent>
    </Dialog>
  );
}

function TermPickerBody({
  terms,
  initialLabels,
  onClose,
  onApply,
}: Pick<TermPickerDialogProps, "terms" | "initialLabels" | "onApply"> & { onClose: () => void }) {
  const [selected, setSelected] = useState(() => new Set(initialLabels));

  const toggleLabel = (label: string, checked: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(label);
      else next.delete(label);
      return next;
    });

  return (
    <>
      <div className="max-h-[50vh] overflow-y-auto space-y-2">
        {Object.entries(terms).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <input
              type="checkbox"
              checked={selected.has(label) || selected.has(key)}
              onChange={(event) => toggleLabel(label, event.target.checked)}
            />
            <span className="text-sm text-slate-100">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Закрити
        </Button>
        <Button
          type="button"
          onClick={() => {
            onApply(Array.from(selected));
            onClose();
          }}
        >
          Підставити
        </Button>
      </div>
    </>
  );
}

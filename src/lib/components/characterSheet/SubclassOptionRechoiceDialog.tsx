"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { loadSubclassOptionRechoice, saveSubclassOptionRechoice } from "@/lib/actions/subclass-option-rechoice";
import type { SubclassOptionRechoiceOffer } from "@/server/db/subclass-option-rechoice";

type Props = {
  persId: number;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

/**
 * Перевибір опції підкласу з листа (KR37.4): книга дає його після довгого відпочинку, платформа
 * не примушує чекати — як і з формами Дикої форми. Заклинання старої опції зникають, нової —
 * лягають підготовленими; тому діалог просить підтвердити, а не перемикає мовчки.
 */
export function SubclassOptionRechoiceDialog({ persId, groupName, open, onOpenChange, onSaved }: Props) {
  const router = useRouter();
  const [offer, setOffer] = useState<SubclassOptionRechoiceOffer | null>(null);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    if (!open) return;
    setOffer(null);
    loadSubclassOptionRechoice(persId, groupName).then((result) => {
      if (!result.ok) {
        toast.error(result.error);
        onOpenChange(false);
        return;
      }
      setOffer(result.offer);
      setChosenId(result.offer.currentOptionId);
    });
  }, [open, persId, groupName, onOpenChange]);

  const save = () => {
    if (!offer || chosenId === null) return;
    startSaving(async () => {
      const result = await saveSubclassOptionRechoice(persId, { groupName, toOptionId: chosenId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.changed ? "Вибір змінено, заклинання оновлено" : "Вибір без змін");
      onOpenChange(false);
      if (result.changed) {
        onSaved();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg font-bold">{offer?.group.actionLabel ?? groupName}</DialogTitle>
        </DialogHeader>
        {offer ? (
          <>
            <p className="text-xs text-slate-400">{offer.group.hint}</p>
            <div className="space-y-2" role="radiogroup" aria-label={groupName}>
              {offer.options.map((option) => {
                const isChosen = option.choiceOptionId === chosenId;
                return (
                  <button
                    key={option.choiceOptionId}
                    type="button"
                    role="radio"
                    aria-checked={isChosen}
                    onClick={() => setChosenId(option.choiceOptionId)}
                    className={clsx(
                      "w-full rounded-xl border p-3 text-left transition",
                      isChosen ? "border-emerald-400/70 bg-emerald-900/30" : "border-slate-700/70 bg-slate-900/40 hover:bg-slate-800/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">{option.optionName}</span>
                      {option.choiceOptionId === offer.currentOptionId ? (
                        <span className="rounded-full border border-slate-500/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">зараз</span>
                      ) : null}
                    </div>
                    <FormattedDescription content={option.description} className="mt-1 text-xs text-slate-300/90" />
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" className="h-11 sm:h-9" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Скасувати
              </Button>
              <Button type="button" className="h-11 sm:h-9" onClick={save} disabled={isSaving || chosenId === offer.currentOptionId}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Обрати"}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
        )}
      </DialogContent>
    </Dialog>
  );
}

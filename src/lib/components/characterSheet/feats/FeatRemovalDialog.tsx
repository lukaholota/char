"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getFeatRemovalPreview } from "@/lib/actions/feat-actions";
import type { FeatRemovalPreview } from "@/server/db/feat-removal";

type Props = {
  persId: number;
  feat: { featId: number; name: string } | null;
  isRemoving: boolean;
  onCancel: () => void;
  onConfirm: (featId: number, name: string) => void;
};

export function FeatRemovalDialog({ persId, feat, isRemoving, onCancel, onConfirm }: Props) {
  const preview = useFeatRemovalPreview(persId, feat?.featId ?? null);

  return (
    <Dialog open={Boolean(feat)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg">Видалити рису «{feat?.name}»?</DialogTitle>
          <DialogDescription>Персонаж втратить те, що дала риса.</DialogDescription>
        </DialogHeader>

        {preview === "loading" ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-400" />
        ) : preview ? (
          <RemovalChanges preview={preview} />
        ) : (
          <p className="text-sm text-rose-300">Не вдалося порахувати зміни.</p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="h-11 sm:h-9" onClick={onCancel} disabled={isRemoving}>
            Скасувати
          </Button>
          <Button
            type="button"
            className="h-11 bg-rose-600 text-white hover:bg-rose-500 sm:h-9"
            disabled={isRemoving || preview === "loading" || !preview || !feat}
            onClick={() => feat && onConfirm(feat.featId, feat.name)}
          >
            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Видалити рису"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RemovalChanges({ preview }: { preview: FeatRemovalPreview }) {
  return (
    <div className="space-y-2">
      {preview.changes.length ? (
        <ul className="space-y-1 rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-200">
          {preview.changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-300">Риса не змінювала чисел персонажа.</p>
      )}
      {!preview.isExact ? (
        <p className="text-xs leading-snug text-amber-200/90">
          Цю рису взято до того, як лист почав запамʼятовувати її надання. Навички й рядки мов та володінь від неї перевірте вручну.
        </p>
      ) : null}
    </div>
  );
}

function useFeatRemovalPreview(persId: number, featId: number | null): FeatRemovalPreview | null | "loading" {
  const [preview, setPreview] = useState<FeatRemovalPreview | null | "loading">("loading");

  useEffect(() => {
    if (featId === null) return;
    let cancelled = false;
    setPreview("loading");
    getFeatRemovalPreview(persId, featId).then((loaded) => {
      if (!cancelled) setPreview(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [persId, featId]);

  return preview;
}

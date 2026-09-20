"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildCatalogEmbedParams } from "@/lib/catalog-url-helpers";

/// Пікер — це `/2024/bastions` у режимі вбудовування, а не друга копія каталогу: фільтри,
/// пошук і картки там уже написані (KR19.1), а дублювання каталогу — прямий шлях до
/// «працює на 50 екранах, ламається на 51-му».
export function AddBastionFacilityDialog({
  persId,
  persName,
  label = "Додати приміщення",
  levelTab,
  onFacilityAdded,
}: {
  persId: number;
  persName: string;
  label?: string;
  levelTab?: "BASIC";
  onFacilityAdded: () => void;
}) {
  const [open, setOpen] = useState(false);

  /// На сторінці два таких діалоги: слухає лише відкритий, інакше одне додавання перезавантажує дані двічі.
  useEffect(() => {
    if (!open) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "BASTION_FACILITY_ADDED") onFacilityAdded();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, onFacilityAdded]);

  const catalogParams = buildCatalogEmbedParams({ persId, persName }) + (levelTab ? `&lvl=${levelTab}` : "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20">
          <Plus className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex h-[90vh] max-w-5xl flex-col overflow-hidden border-white/10 bg-slate-950 p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Додати приміщення бастіону</DialogTitle>
        <div className="w-full flex-1 bg-slate-950">
          <iframe
            src={`/2024/bastions?${catalogParams}`}
            className="h-full w-full border-0"
            title="Приміщення бастіону"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

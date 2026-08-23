"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useOmniSearchStore } from "@/lib/stores/omniSearchStore";

/// Панель тягне за собою весь статичний індекс — усі згенеровані каталоги, ~1,26 МіБ gzip.
/// Тому вона приїжджає окремим чанком на першу спробу пошуку, а не в бандлі кореневого
/// лейауту, куди цей компонент змонтований (docs/DECISIONS.md Р14).
const OmniSearchPanel = dynamic(
  () => import("@/components/search/OmniSearchPanel").then((module) => module.OmniSearchPanel),
  { ssr: false, loading: () => <OmniSearchLoadingRow /> }
);

export function OmniSearchDialog() {
  const { isOpen, close, toggle } = useOmniSearchStore();

  useEffect(() => {
    const handleHotkey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleHotkey);
    return () => window.removeEventListener("keydown", handleHotkey);
  }, [toggle]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        showClose={false}
        className="max-w-2xl p-0 gap-0 overflow-hidden bg-slate-950/95 border-white/10 backdrop-blur-2xl shadow-2xl rounded-2xl sm:max-h-[85vh] flex flex-col"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Глобальний пошук по платформі (Omni-Search)</DialogTitle>
        <OmniSearchPanel onClose={close} />
      </DialogContent>
    </Dialog>
  );
}

function OmniSearchLoadingRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 text-slate-400">
      <Search className="h-5 w-5 shrink-0 animate-pulse" />
      <span className="text-sm">Готуємо пошук…</span>
    </div>
  );
}

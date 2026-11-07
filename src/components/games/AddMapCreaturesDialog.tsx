"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { MAP_CREATURES_ADDED_MESSAGE, ROOM_PICKER_PARAM } from "@/components/bestiary/RoomCreatureAddPanel";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";

type Edition = "2014" | "2024";

/// Вибір істоти — це сам бестіарій у iframe (як для Дикої форми), а не друга копія каталогу.
export function AddMapCreaturesDialog({ sessionId }: { sessionId: number }) {
  const router = useModeRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [edition, setEdition] = useState<Edition>("2014");

  useEffect(() => {
    if (!isOpen) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== MAP_CREATURES_ADDED_MESSAGE) return;
      const { name, count } = event.data as { name: string; count: number };
      setIsOpen(false);
      toast.success(`${count > 1 ? `${name} × ${count}` : name} — у розділі «Поза мапою»`);
      captureGameEvent("game_creatures_added", { count, edition });
      router.refresh();
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, edition, router]);

  const pickerUrl = `${edition === "2024" ? "/2024" : ""}/bestiary?${ROOM_PICKER_PARAM}=${sessionId}`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 gap-1.5 px-3">
          <Plus className="h-4 w-4" aria-hidden />
          Додати істот
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} onOpenAutoFocus={(event) => event.preventDefault()} className="flex h-[90dvh] max-w-5xl flex-col gap-0 overflow-hidden border-white/10 bg-slate-950 p-0">
        <div className="flex items-center gap-3 border-b border-white/10 py-2 pl-4 pr-14">
          <DialogTitle className="flex-1 truncate normal-case leading-10 tracking-normal">Істоти на мапу</DialogTitle>
          <div role="group" aria-label="Редакція бестіарію" className="flex rounded-xl border border-white/10 p-0.5">
            {(["2014", "2024"] as const).map((option) => (
              <button key={option} type="button" aria-pressed={edition === option} onClick={() => setEdition(option)} className={cn("h-9 rounded-lg px-3 text-sm", edition === option ? "bg-white/10 text-slate-100" : "text-slate-400 hover:text-slate-200")}>
                {option}
              </button>
            ))}
          </div>
        </div>
        <iframe key={edition} src={pickerUrl} className="w-full flex-1 border-0" title="Бестіарій" />
      </DialogContent>
    </Dialog>
  );
}

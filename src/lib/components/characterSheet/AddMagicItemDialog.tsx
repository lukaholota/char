"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AddMagicItemDialog({ persId, persName }: { persId: number; persName?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ITEM_ADDED") {
        router.refresh();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  const queryParams = new URLSearchParams({
    origin: "character",
    persId: String(persId),
  });
  if (persName) {
    queryParams.set("persName", persName);
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          router.refresh(); // Refresh to show added items
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border-violet-500/30">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Додати</span>
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-5xl h-[90vh] p-0 border-white/10 bg-slate-950 overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Додати магічний предмет</DialogTitle>
        <div className="flex-1 w-full bg-slate-950">
          <iframe 
            src={`/magic-items?${queryParams.toString()}`} 
            className="w-full h-full border-0"
            title="Магічні предмети"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

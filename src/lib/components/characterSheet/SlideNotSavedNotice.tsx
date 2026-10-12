"use client";

import { CloudOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SlideNotSavedNotice() {
  return (
    <div role="status" className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center font-sans">
      <CloudOff className="h-6 w-6 text-amber-300" />
      <p className="max-w-xs text-sm text-slate-300">
        Цей розділ ще не збережено на пристрої. Відкрийте лист із мережею — і він зʼявиться навіть без звʼязку.
      </p>
      <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => window.location.reload()}>
        Оновити сторінку
      </Button>
    </div>
  );
}

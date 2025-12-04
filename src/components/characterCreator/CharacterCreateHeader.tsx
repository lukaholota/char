"use client";

import { ArrowLeftRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  onReset: () => void;
  onOpenAuth: () => void;
}

export const CharacterCreateHeader = ({ onReset, onOpenAuth }: Props) => {
  return (
    <div className="w-full rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900/80 to-slate-900 px-6 py-5 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
            DND builder
          </p>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Створити персонажа
          </h1>
          <p className="text-sm text-slate-400">
            Інтуїтивний, мінімалістичний майстер — сфокусований на важливому
            без зайвих відволікань.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="border border-slate-800/60 bg-slate-900/60 hover:bg-slate-800"
            onClick={onReset}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Скинути
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="border border-slate-700/70 bg-white/5 text-white hover:bg-white/10"
            onClick={onOpenAuth}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Увійти
          </Button>
        </div>
      </div>
    </div>
  );
};

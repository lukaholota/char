"use client";

import { ArrowLeftRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onReset: () => void;
  onOpenAuth: () => void;
}

export const CharacterCreateHeader = ({ onReset, onOpenAuth }: Props) => {
  return (
    <div className="w-full rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900/80 to-slate-900 px-3 py-4 sm:px-4 sm:py-4 md:px-6 md:py-5 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
            pers creator
          </p>
          <h1 className="text-xl font-semibold text-white sm:text-2xl md:text-3xl">
            Створити персонажа
          </h1>
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

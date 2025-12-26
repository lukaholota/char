"use client";

import { ArrowLeftRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onReset: () => void;
  onOpenAuth: () => void;
}

export const CharacterCreateHeader = ({ onReset, onOpenAuth }: Props) => {
  return (
    <div className="glass-panel border-gradient-rpg w-full rounded-2xl px-3 py-4 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
            pers creator
          </p>
          <h1 className="font-rpg-display text-xl font-semibold uppercase tracking-widest text-slate-200 sm:text-2xl md:text-3xl">
            Створити персонажа
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/10 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white"
            onClick={onReset}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Скинути
          </Button>
          <Button
            variant="secondary"
            className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
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

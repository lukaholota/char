"use client";

import { ArrowLeftRight, LogIn, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTwoStepConfirm } from "@/hooks/useTwoStepConfirm";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { buildRpgbotCtaProps } from "@/lib/monitoring/rpgbot-analytics-model";
import { InAppBrowserHint } from "@/lib/components/auth/InAppBrowserHint";

interface Props {
  onReset: () => void;
  onOpenAuth: () => void;
  isAuthenticated?: boolean;
  showReadyBuilds?: boolean;
}

export const CharacterCreateHeader = ({
  onReset,
  onOpenAuth,
  isAuthenticated = false,
  showReadyBuilds = false,
}: Props) => {
  const resetConfirm = useTwoStepConfirm<HTMLButtonElement>({
    onConfirm: onReset,
  });

  return (
    <div className="glass-panel border-gradient-rpg w-full rounded-2xl px-3 py-4 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="space-y-1">
          <h1 className="font-rpg-display text-xl font-semibold uppercase tracking-widest text-slate-200 sm:text-2xl md:text-3xl">
            Створити персонажа
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showReadyBuilds ? (
            <Button asChild variant="secondary" className="h-auto min-h-11 w-full justify-start gap-3 border border-arcane-400/40 px-3 py-2.5 lg:w-auto">
              <ModeLink href="/char/presets" {...buildRpgbotCtaProps("open_gallery", "creator_header")}>
                <UserRoundCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-arcane-200" />
                <span className="flex flex-col gap-1 text-left">
                  <span className="flex items-center gap-2">
                    <span>Готові персонажі</span>
                    <span className="rounded border border-arcane-400/30 px-1.5 text-xs text-arcane-200">Нове</span>
                  </span>
                  <span className="text-xs font-normal text-slate-300">Оберіть білд і дайте імʼя</span>
                </span>
              </ModeLink>
            </Button>
          ) : null}
          <Button
            ref={resetConfirm.ref}
            onClick={resetConfirm.onClick}
            variant={resetConfirm.isConfirming ? "destructive" : "ghost"}
            size="sm"
            className={cn(
              "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white",
              resetConfirm.isConfirming && "border-rose-500/50 ring-1 ring-rose-500/40"
            )}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Скинути
          </Button>
          {!isAuthenticated && (
            <Button
              variant="secondary"
              className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={onOpenAuth}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Увійти
            </Button>
          )}
        </div>
      </div>
      {!isAuthenticated ? <InAppBrowserHint onOpenAuth={onOpenAuth} /> : null}
    </div>
  );
};

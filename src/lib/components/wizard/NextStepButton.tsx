"use client";

import { useState, type ComponentProps, type MouseEvent } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NextStepButtonProps = Omit<ComponentProps<typeof Button>, "disabled"> & {
  stepKey: string | number;
  isBlocked: boolean;
  isBusy?: boolean;
  blockedHint: string;
};

/// Неактивна «Далі» лишається клікабельною: замість мертвої кнопки людина бачить, чого бракує
/// (PostHog dead clicks 2026-09-27: ~100 людей тиснули її раз у раз без жодної відповіді).
export function NextStepButton({ stepKey, isBlocked, isBusy = false, blockedHint, onClick, className, ...buttonProps }: NextStepButtonProps) {
  const [hintShownForStep, setHintShownForStep] = useState<string | number | null>(null);
  const isHintShown = isBlocked && hintShownForStep === stepKey;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isBlocked) {
      event.preventDefault();
      setHintShownForStep(stepKey);
      return;
    }
    onClick?.(event);
  };

  return (
    <span className="relative inline-flex">
      {isHintShown && (
        <span
          role="status"
          className="absolute bottom-full right-0 mb-3 flex w-max max-w-[min(20rem,calc(100vw-2rem))] items-start gap-2 whitespace-normal rounded-lg border border-amber-400/30 bg-slate-900 px-3 py-2 text-left text-sm leading-snug text-amber-100 shadow-lg shadow-black/40"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          {blockedHint}
        </span>
      )}
      <Button
        {...buttonProps}
        disabled={isBusy}
        aria-disabled={isBlocked || undefined}
        onClick={handleClick}
        className={cn(className, isBlocked && "opacity-50")}
      />
    </span>
  );
}

"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NextStepButton } from "@/lib/components/wizard/NextStepButton";
import { buildFallbackNextStepHint } from "@/lib/components/wizard/next-step-hint";

interface Props {
  stepIndex: number;
  stepCount: number;
  stepTitle: string | undefined;
  isNextBlocked: boolean;
  nextStepHint: string | null;
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function LevelUpFooter({ stepIndex, stepCount, stepTitle, isNextBlocked, nextStepHint, isSubmitting, onPrev, onNext }: Props) {
  const isLastStep = stepIndex === stepCount - 1;

  return (
    <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] inset-x-0 z-[60] w-full px-2 pb-3 sm:px-3 md:sticky md:bottom-0 md:px-0">
      <div className="border-gradient-rpg mx-auto flex w-full max-w-6xl items-center justify-between rounded-xl border-t border-white/10 bg-slate-900/95 px-2.5 py-2.5 backdrop-blur-xl shadow-xl shadow-black/30 sm:rounded-2xl sm:px-3 sm:py-3">
        <div className="flex items-center gap-2 text-xs text-slate-300 sm:gap-3 sm:text-sm">
          <Badge variant="secondary" className="bg-white/5 text-white text-[11px] sm:text-xs">
            Крок {stepIndex + 1} / {stepCount}
          </Badge>
          <span className="hidden sm:inline">{stepTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={stepIndex === 0 || isSubmitting}
            className="border-white/15 bg-white/5 text-slate-300"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>

          <NextStepButton
            onClick={onNext}
            stepKey={stepIndex}
            isBlocked={isNextBlocked}
            isBusy={isSubmitting}
            blockedHint={nextStepHint ?? buildFallbackNextStepHint(stepTitle)}
          >
            {isLastStep ? (
              <>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Збереження..." : "Підвищити рівень"}
              </>
            ) : (
              <>
                Далі <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </NextStepButton>
        </div>
      </div>
    </div>
  );
}

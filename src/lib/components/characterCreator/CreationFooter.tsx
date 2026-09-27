"use client";

import { ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NextStepButton } from "@/lib/components/wizard/NextStepButton";
import { buildFallbackNextStepHint } from "@/lib/components/wizard/next-step-hint";

interface Props {
  stepNumber: number;
  stepCount: number;
  stepTitle: string | undefined;
  activeFormId: string;
  isNextBlocked: boolean;
  nextStepHint: string | null;
  isSubmitting: boolean;
  onPrev: () => void;
}

export function CreationFooter({ stepNumber, stepCount, stepTitle, activeFormId, isNextBlocked, nextStepHint, isSubmitting, onPrev }: Props) {
  const isLastStep = stepNumber === stepCount;

  return (
    <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] inset-x-0 z-[60] w-full px-2 pb-3 sm:px-3 md:sticky md:bottom-0 md:px-0">
      <div className="glass-panel border-gradient-rpg mx-auto flex w-full max-w-6xl items-center justify-between rounded-xl px-2.5 py-2.5 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/40 sm:rounded-2xl sm:px-3 sm:py-3">
        <div className="flex items-center gap-2 text-xs text-slate-300 sm:gap-3 sm:text-sm">
          <Badge variant="secondary" className="bg-white/5 text-white text-[11px] sm:text-xs">
            Крок {stepNumber} / {stepCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {stepNumber > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 border border-white/10 bg-white/5 px-4 text-sm text-slate-200 hover:bg-white/7 sm:text-base md:h-9 md:px-3"
              onClick={onPrev}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          )}
          <NextStepButton
            type="submit"
            form={activeFormId}
            stepKey={stepNumber}
            isBlocked={isNextBlocked}
            isBusy={isSubmitting}
            blockedHint={nextStepHint ?? buildFallbackNextStepHint(stepTitle)}
            size="sm"
            className="h-11 bg-arcane-600/90 px-5 text-sm text-white shadow-lg shadow-arcane-900/40 hover:bg-arcane-500 sm:text-base md:h-9 md:px-3"
          >
            {isLastStep ? (isSubmitting ? "Створення..." : "Створити") : "Далі →"}
          </NextStepButton>
        </div>
      </div>
    </div>
  );
}

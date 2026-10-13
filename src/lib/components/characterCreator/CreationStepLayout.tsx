"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Check, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NextStepHintProvider, type SetNextStepHint } from "@/lib/components/wizard/next-step-hint";
import { CreationFooter } from "./CreationFooter";

export type CreationLayoutStep = { id: string; name: string };

type Props = {
  header: ReactNode;
  ruleLink?: ReactNode;
  steps: CreationLayoutStep[];
  currentStep: number;
  progress: number;
  isStepDone: (stepOrder: number) => boolean;
  canJumpTo: (stepOrder: number) => boolean;
  onJump: (stepOrder: number) => void;
  onHintChange: SetNextStepHint;
  activeFormId: string;
  isNextBlocked: boolean;
  nextStepHint: string | null;
  isSubmitting: boolean;
  onPrev: () => void;
  children: ReactNode;
  after?: ReactNode;
};

export function CreationStepLayout({ header, ruleLink, steps, currentStep, progress, isStepDone, canJumpTo, onJump, onHintChange, activeFormId, isNextBlocked, nextStepHint, isSubmitting, onPrev, children, after }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 pb-[calc(11rem+env(safe-area-inset-bottom))] sm:px-4 md:gap-6 md:px-0 md:py-6">
      {header}

      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="grid gap-3 p-0 sm:gap-4 md:grid-cols-[1fr,300px]">
          <div className="glass-panel border-gradient-rpg space-y-3 rounded-xl p-3 sm:space-y-4 sm:p-4 md:p-5">
            {ruleLink}
            <NextStepHintProvider onHintChange={onHintChange}>
              {children}
            </NextStepHintProvider>
          </div>

          <aside className="glass-panel border-gradient-rpg rounded-xl p-3 sm:p-4">
          <div className="sticky top-14 sm:top-16">
            <div className="flex items-center justify-between text-xs text-slate-400 sm:text-sm">
                <span className="font-medium text-slate-200">Ваш прогрес</span>
                <Badge variant="outline" className="border-white/15 bg-white/5 text-[11px] text-slate-200 sm:text-xs">
                  {progress}% готово
                </Badge>
              </div>

              <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
                {steps.map((step, index) => {
                  const stepOrder = index + 1;
                  const isDone = isStepDone(stepOrder);
                  const isActive = stepOrder === currentStep;
                  const canJump = canJumpTo(stepOrder);

                  return (
                    <button
                      key={step.id}
                      type="button"
                      data-testid={`creation-step-${step.id}`}
                      data-step-id={step.id}
                      data-active={isActive ? "true" : "false"}
                      disabled={!canJump && !isActive}
                      onClick={() => onJump(stepOrder)}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-all duration-200 sm:px-3",
                        isActive
                          ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white"
                          : canJump
                            ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20"
                            : "border-white/5 bg-transparent text-slate-500 cursor-not-allowed opacity-50"
                      )}
                    >
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">
                          Крок {stepOrder}
                        </p>
                        <p className="text-xs font-semibold sm:text-sm">{step.name}</p>
                      </div>
                      {isDone ? (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
                          <Check className="h-4 w-4" />
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={clsx(
                            "border-white/15 bg-white/5 text-slate-300",
                            isActive && "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100"
                          )}
                        >
                          <Circle className="h-3 w-3" />
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 h-1.5 rounded-full bg-white/10 sm:mt-5 sm:h-2">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-arcane-500 to-arcane-300 transition-all sm:h-2"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </aside>
        </CardContent>
      </Card>

      <CreationFooter
        stepNumber={currentStep}
        stepCount={steps.length}
        stepTitle={steps[currentStep - 1]?.name}
        activeFormId={activeFormId}
        isNextBlocked={isNextBlocked}
        nextStepHint={nextStepHint}
        isSubmitting={isSubmitting}
        onPrev={onPrev}
      />

      {after}
    </div>
  );
}

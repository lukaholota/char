"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { waitForPendingHistoryBack } from "@/lib/history-back";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { saveAssemblyTargetLevel } from "@/lib/optimization/ready-preset-assembly-draft";
import type { PresetSuggestion, PresetSuggestionQuery } from "@/lib/optimization/ready-preset-suggestion";
import { AnalystAvatar } from "./AnalystAvatar";
import { ReadyPresetSuggestionDialog } from "./ReadyPresetSuggestionDialog";
import { useReadyPresetSuggestion } from "./use-ready-preset-suggestion";

const CURTAIN_DURATION_MS = 650;
const DISMISSED_STORAGE_KEY = "ready-preset-suggestion-dismissed";
const SUGGESTION_STEP_IDS = new Set(["class", "subclass", "subclassChoices", "classChoices", "classOptional", "weaponMastery", "race", "raceDetails", "raceChoices", "speciesFeatChoices"]);

export function isPresetSuggestionStep(stepId: string | undefined): boolean {
  return stepId !== undefined && SUGGESTION_STEP_IDS.has(stepId);
}

export function forgetPresetSuggestionDismissal() {
  try {
    window.sessionStorage.removeItem(DISMISSED_STORAGE_KEY);
  } catch {}
}

export function ReadyPresetSuggestion({ classKey, subclassKey, raceKey }: PresetSuggestionQuery) {
  const query = useMemo(() => ({ classKey, subclassKey, raceKey }), [classKey, subclassKey, raceKey]);
  const response = useReadyPresetSuggestion(query);
  const router = useModeRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedClassKey, setDismissedClassKey] = useState(readDismissedClassKey);
  const isDismissed = dismissedClassKey === classKey;
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dismissedClassKey === null || dismissedClassKey === classKey) return;
    forgetPresetSuggestionDismissal();
    setDismissedClassKey(null);
  }, [classKey, dismissedClassKey]);

  useEffect(() => {
    if (!targetHref) return;
    let isCancelled = false;
    waitForPendingHistoryBack()
      .then(() => playCurtain(curtainRef.current, buttonRef.current))
      .then(() => {
        if (!isCancelled) router.push(targetHref);
      });
    return () => {
      isCancelled = true;
    };
  }, [targetHref, router]);

  const best = response?.best;
  useRpgbotSurfaceView(best && !isDismissed ? { surface: "preset_suggestion", preset_id: best.entry.buildId, ...describeMatch(best) } : null);
  if (!response || !best) return null;
  const presetId = best.entry.buildId;
  const match = describeMatch(best);

  function openSuggestion() {
    captureRpgbotEvent("rpgbot_preset_suggestion", { preset_id: presetId, action: "opened", ...match });
    setIsOpen(true);
  }

  function declineSuggestion() {
    captureRpgbotEvent("rpgbot_preset_suggestion", { preset_id: presetId, action: "declined", ...match });
    setIsOpen(false);
    rememberDismissedClassKey(classKey);
    setDismissedClassKey(classKey);
  }

  function continueWithSuggestion(targetLevel: number) {
    captureRpgbotEvent("rpgbot_preset_suggestion", { preset_id: presetId, action: "accepted", target_level: targetLevel, ...match });
    saveAssemblyTargetLevel(presetId, targetLevel);
    setIsOpen(false);
    setTargetHref(`/char/create?${new URLSearchParams({ preset: best!.entry.slug, from: "suggestion" })}`);
  }

  return (
    <>
      {isDismissed ? null : (
        <button
          ref={buttonRef}
          type="button"
          onClick={openSuggestion}
          title="Підібрати готового персонажа за обраним класом"
          className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+6rem)] right-3 z-[55] flex h-14 items-center gap-2 rounded-full border border-arcane-300/70 bg-slate-950 py-1 pl-1.5 pr-4 shadow-xl shadow-black/60 ring-4 ring-arcane-400/20 hover:border-arcane-200 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-arcane-300 md:bottom-[88px] md:right-4"
        >
          <AnalystAvatar className="size-11" />
          <span className="text-sm font-semibold text-arcane-100">Доробити персонажа</span>
        </button>
      )}
      <ReadyPresetSuggestionDialog
        suggestion={best}
        total={response.total}
        query={query}
        isOpen={isOpen}
        onOpenChange={(nextIsOpen) => (nextIsOpen ? setIsOpen(true) : declineSuggestion())}
        onContinue={continueWithSuggestion}
      />
      {targetHref ? <div ref={curtainRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[120] bg-arcane-900 opacity-0" /> : null}
    </>
  );
}

function readDismissedClassKey(): string | null {
  try {
    return window.sessionStorage.getItem(DISMISSED_STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberDismissedClassKey(classKey: string) {
  try {
    window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, classKey);
  } catch {}
}

function describeMatch(suggestion: PresetSuggestion) {
  return { is_subclass_match: suggestion.isSubclassMatch, is_race_match: suggestion.isRaceMatch };
}

function playCurtain(curtain: HTMLDivElement | null, origin: HTMLElement | null): Promise<void> {
  const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!curtain || !origin || isReducedMotion) return Promise.resolve();
  const rect = origin.getBoundingClientRect();
  const center = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
  const radius = Math.hypot(window.innerWidth, window.innerHeight);
  const animation = curtain.animate(
    [{ clipPath: `circle(0px at ${center})`, opacity: 1 }, { clipPath: `circle(${radius}px at ${center})`, opacity: 1 }],
    { duration: CURTAIN_DURATION_MS, easing: "ease-in", fill: "forwards" },
  );
  return animation.finished.then(() => undefined);
}

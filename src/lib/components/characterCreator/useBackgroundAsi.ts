"use client";

import { useMemo, useState } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import {
  findBackgroundAsiStep,
  findCompleteBackgroundAsi,
  type BackgroundAsiDraft,
  type BackgroundAsiStep,
} from "@/rules/background-asi";
import type { RulesetId } from "@/rules/strategies/types";
import type { BackgroundASIChoice } from "@/rules/types";

type BackgroundAsiState = {
  /** null у 2014: там бонуси дає раса, і крок лишається на расових бонусах. */
  step: BackgroundAsiStep | null;
  draft: BackgroundAsiDraft | null;
  setDraft: (draft: BackgroundAsiDraft) => void;
  complete: BackgroundASIChoice | null;
};

export function useBackgroundAsi(
  ruleset: RulesetId | undefined,
  abilityOptions: readonly string[] | null | undefined,
): BackgroundAsiState {
  const stored = usePersFormStore((state) => state.formData.backgroundAsiChoice);
  const step = useMemo(
    () => findBackgroundAsiStep(ruleset ?? "RULES_2014", abilityOptions),
    [ruleset, abilityOptions],
  );
  const [draft, setDraft] = useState<BackgroundAsiDraft | null>(stored ?? null);

  return { step, draft, setDraft, complete: step ? findCompleteBackgroundAsi(step, draft) : null };
}

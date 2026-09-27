"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";

type SetNextStepHint = (publisherId: string, hint: string | null) => void;

const NextStepHintContext = createContext<SetNextStepHint>(() => {});

export function NextStepHintProvider({ onHintChange, children }: { onHintChange: SetNextStepHint; children: ReactNode }) {
  return <NextStepHintContext.Provider value={onHintChange}>{children}</NextStepHintContext.Provider>;
}

/// Крок чи його частина: `null`, коли все обрано, інакше — що саме лишилось, звичайною мовою.
/// Частин у кроці буває кілька (заклинання класу й риси) — показується перша незавершена.
export function useNextStepHint(hint: string | null): void {
  const setHint = useContext(NextStepHintContext);
  const publisherId = useId();
  useEffect(() => {
    setHint(publisherId, hint);
  }, [publisherId, hint, setHint]);
  useEffect(() => () => setHint(publisherId, null), [publisherId, setHint]);
}

export function useNextStepHintState(stepKey: string | number) {
  const [hintsByPublisher, setHintsByPublisher] = useState<Record<string, string | null>>({});
  const [hintStepKey, setHintStepKey] = useState(stepKey);
  if (hintStepKey !== stepKey) {
    setHintStepKey(stepKey);
    setHintsByPublisher({});
  }

  const setHint = useCallback<SetNextStepHint>((publisherId, hint) => {
    setHintsByPublisher((current) => (current[publisherId] === hint ? current : { ...current, [publisherId]: hint }));
  }, []);
  const hint = useMemo(() => Object.values(hintsByPublisher).find((value) => value !== null) ?? null, [hintsByPublisher]);

  return [hint, setHint] as const;
}

export function buildFallbackNextStepHint(stepTitle: string | undefined): string {
  return stepTitle
    ? `Щоб перейти далі, завершіть вибір на кроці «${stepTitle}».`
    : "Щоб перейти далі, завершіть вибір на цьому кроці.";
}

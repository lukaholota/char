"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import { buildHeroDamageOperationId } from "@/rules/game-roll-hero-target";

/// Удар чекає тут, доки лист героя його не підхопить: черга офлайн, тимчасові хіти, концентрація.
/// isAppliedOnServer — кімната вже зняла хіти, лист лише бере свіжі з сервера й питає про концентрацію.
/// isHealing — союзник вилікував героя: лист лише бере свіжі хіти, без ряткидка концентрації.
export type HeroDamageRequest = { persId: number; amount: number; operationId: string; isAppliedOnServer?: boolean; isHealing?: boolean };

export const useHeroDamageStore = create<{ requests: HeroDamageRequest[] }>(() => ({ requests: [] }));
const seenOperationIds = new Set<string>();

export function requestHeroDamage(request: HeroDamageRequest) {
  if (seenOperationIds.has(request.operationId)) return;
  seenOperationIds.add(request.operationId);
  useHeroDamageStore.setState((state) => ({ requests: [...state.requests, request] }));
}

/// Нові події кімнати, що вже змінили хіти мого героя: удар, лікування чи рядок ряткидку зони.
export function collectAppliedHeroDamage(sessionId: number, myPersId: number, events: readonly GameRollEventView[]): HeroDamageRequest[] {
  return events.flatMap((event) => {
    const target = event.heroTarget;
    const amount = target?.damage || target?.healing;
    const fromTarget = target?.persId === myPersId && target.isAppliedToSheet && amount ? [{ persId: myPersId, amount, operationId: buildHeroDamageOperationId(sessionId, event.seq), isAppliedOnServer: true, isHealing: target.kind === "heal" }] : [];
    const fromSaves = (event.saves?.rows ?? []).flatMap((row, index) =>
      row.persId === myPersId && row.isAppliedToSheet && row.damage > 0 ? [{ persId: myPersId, amount: row.damage, operationId: buildHeroDamageOperationId(sessionId, event.seq, index), isAppliedOnServer: true }] : [],
    );
    return [...fromTarget, ...fromSaves];
  });
}

export function useHeroDamageRequests(persId: number, isEnabled: boolean, takeDamage: (request: HeroDamageRequest) => void) {
  const request = useHeroDamageStore((state) => (isEnabled ? state.requests.find((queued) => queued.persId === persId) : undefined));
  useEffect(() => {
    if (!request) return;
    useHeroDamageStore.setState((state) => ({ requests: state.requests.filter((queued) => queued !== request) }));
    takeDamage(request);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- кожен запит знімає хіти рівно раз, а не на кожну нову функцію листа
  }, [request]);
}

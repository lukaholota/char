"use client";

import { create } from "zustand";
import type { GameRollEventView } from "@/server/db/game-roll-events";

export type RollVerdict = { tone: "good" | "bad" | "plain"; text: string };

/// Останній кидок з ціллю, кинутий з цього пристрою: лоток показує його результат, щойно кімната відповість.
export const useRollVerdictStore = create<{ key: string | null; event: GameRollEventView | null }>(() => ({ key: null, event: null }));

export function watchRollVerdict(key: string) {
  useRollVerdictStore.setState({ key, event: null });
}

export function settleRollVerdict(key: string, event: GameRollEventView) {
  if (useRollVerdictStore.getState().key === key) useRollVerdictStore.setState({ event });
}

export function clearRollVerdict(key?: string) {
  if (key === undefined || useRollVerdictStore.getState().key === key) useRollVerdictStore.setState({ key: null, event: null });
}

/// Гравець бачить те саме, що й у журналі: влучання чи промах, кинуту шкоду, «повалений» — без КЗ і хітів істоти.
export function buildRollVerdict(event: Pick<GameRollEventView, "target" | "heroTarget">): RollVerdict | null {
  const target = event.target ?? event.heroTarget;
  if (!target) return null;
  if (target.kind === "attack") return buildAttackVerdict(target.name, target.isHit);
  if (target.kind === "heal") return { tone: "good", text: `${target.name}: +${event.heroTarget?.healing ?? 0} хітів` };
  const isDowned = event.target?.isDowned ?? false;
  return { tone: "plain", text: `${target.name}: −${target.damage ?? 0}${isDowned ? " · повалений" : ""}` };
}

function buildAttackVerdict(name: string, isHit: boolean | null): RollVerdict {
  if (isHit === null) return { tone: "plain", text: `${name}: КЗ невідомий — вирішує майстер` };
  return isHit ? { tone: "good", text: `Влучання — ${name}` } : { tone: "bad", text: `Промах — ${name}` };
}

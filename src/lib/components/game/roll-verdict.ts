"use client";

import { create } from "zustand";
import type { GameRollSavesView } from "@/rules/game-roll-saves";
import { TOKEN_CONDITION_LABELS } from "@/rules/token-conditions";
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
export function buildRollVerdict(event: Pick<GameRollEventView, "target" | "heroTarget" | "saves">): RollVerdict | null {
  if (event.saves) return buildSavesVerdict(event.saves);
  const target = event.target ?? event.heroTarget;
  if (!target) return null;
  if (target.kind === "attack") return buildAttackVerdict(target.name, target.isHit);
  if (target.kind === "heal") return { tone: "good", text: `${target.name}: +${event.heroTarget?.healing ?? 0} хітів` };
  const isDowned = event.target?.isDowned ?? false;
  return { tone: "plain", text: `${target.name}: −${target.damage ?? 0}${isDowned ? " · повалений" : ""}` };
}

/// Тон — з боку того, хто кидає: провал цілі для нього успіх.
function buildSavesVerdict({ rows }: GameRollSavesView): RollVerdict {
  const failedCount = rows.filter((row) => !row.isSaved).length;
  const tone = failedCount === rows.length ? "good" : failedCount === 0 ? "bad" : "plain";
  if (rows.length > 1) return { tone, text: `Провалили: ${failedCount} · встояли: ${rows.length - failedCount}` };
  const [row] = rows;
  const parts = [`${row.name} — ${row.isSaved ? "успіх" : "провал"}`, row.damage > 0 ? `−${row.damage}` : null, row.condition ? TOKEN_CONDITION_LABELS[row.condition] : null];
  return { tone, text: parts.filter(Boolean).join(" · ") };
}

function buildAttackVerdict(name: string, isHit: boolean | null): RollVerdict {
  if (isHit === null) return { tone: "plain", text: `${name}: КЗ невідомий — вирішує майстер` };
  return isHit ? { tone: "good", text: `Влучання — ${name}` } : { tone: "bad", text: `Промах — ${name}` };
}

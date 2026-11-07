"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Swords, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addCombatantsAction,
  advanceCombatTurnAction,
  endCombatAction,
  endOwnCombatTurnAction,
  setCombatantInitiativeAction,
  startCombatAction,
} from "@/lib/actions/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { findCombatNewcomers, moveTurn as moveTurnPosition, type CombatView } from "@/rules/game-combat";
import type { GameSessionView } from "@/server/db/game-sessions";
import { CombatantItem } from "./CombatantItem";
import { sendOptimistic, useOptimistic } from "./optimistic-values";
import { askToConfirm } from "@/components/ui/confirm-dialog";

type CommandResult<T> = { ok: true; value: T } | { ok: false; error: string };

type TurnShown = { round: number; currentId: number | null };
const findTurnKey = (sessionId: number) => `combat-turn:${sessionId}`;

/// Хід, переданий майстром, видно одразу: і в черзі, і кільцем на токені.
export function useShownCombat(view: GameSessionView): CombatView | null {
  const combat = view.combat;
  const turn = useOptimistic<TurnShown | null>(findTurnKey(view.id), null);
  return useMemo(() => (combat && turn ? { ...combat, ...turn } : combat), [combat, turn]);
}

export function CombatTracker({ view }: { view: GameSessionView }) {
  const canControl = view.myRole === "GM" && !view.isArchived;
  const combat = useShownCombat(view);
  if (combat) return <ActiveCombat sessionId={view.id} combat={combat} canControl={canControl} myUserId={view.isArchived ? null : view.myUserId} newcomers={canControl ? findViewNewcomers(view, combat) : null} />;
  return canControl ? <StartCombatButton sessionId={view.id} /> : null;
}

function findViewNewcomers(view: GameSessionView, combat: CombatView) {
  const heroes = view.members.flatMap((member) => (member.persId === null ? [] : [{ userId: member.userId, name: member.persName ?? member.name }]));
  return findCombatNewcomers(combat, { heroes, creatures: view.viewedSceneId === view.activeSceneId ? view.creatures : null });
}

function useCombatCommand() {
  const router = useModeRouter();
  const [isPending, startTransition] = useTransition();
  const run = <T,>(command: () => Promise<CommandResult<T>>, onDone?: (value: T) => void) =>
    startTransition(async () => {
      const result = await command();
      if (!result.ok) return void toast.error(result.error);
      onDone?.(result.value);
      router.refresh();
    });
  return { isPending, run };
}

function StartCombatButton({ sessionId }: { sessionId: number }) {
  const { isPending, run } = useCombatCommand();
  const start = () => run(() => startCombatAction(sessionId), ({ combatantCount }) => captureGameEvent("game_combat_started", { combatant_count: combatantCount }));
  return (
    <Button type="button" variant="outline" onClick={start} disabled={isPending} title="Ініціативу кине сервер: за героїв з листа, за істот на мапі зі Спритності" className="h-11 gap-2 px-3">
      <Swords className="h-4 w-4" aria-hidden />
      Почати бій
    </Button>
  );
}

type ActiveCombatProps = { sessionId: number; combat: CombatView; canControl: boolean; myUserId: number | null; newcomers: string[] | null };

/// Секція — контейнер: у бічній колонці мапи черга стає стовпчиком, у ширшому місці лишається рядком.
function ActiveCombat({ sessionId, combat, canControl, myUserId, newcomers }: ActiveCombatProps) {
  const { isPending, run } = useCombatCommand();
  const [isQueueShown, setIsQueueShown] = useState(true);
  const queueId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const current = combat.combatants.find((combatant) => combatant.id === combat.currentId);
  useCenterCurrentCombatant(listRef, combat.currentId);
  const controls = canControl ? { sessionId, combat, rounds: combat.round, isPending, run } : null;
  const isMyTurn = !canControl && myUserId !== null && current?.hero?.userId === myUserId;
  const editInitiative = (combatantId: number, initiative: number) =>
    run(() => setCombatantInitiativeAction(sessionId, combatantId, initiative), () => captureGameEvent("game_combat_initiative_edited", {}));
  return (
    <section aria-label="Бій" className="shrink-0 space-y-2 rounded-2xl border border-arcane-400/30 bg-arcane-500/5 p-2 [container-type:inline-size]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-1">
        <h2 className="font-rpg-display text-lg text-slate-50">Бій · раунд {combat.round}</h2>
        <p aria-live="polite" className="min-w-0 flex-1 truncate text-sm text-slate-300 [@container(max-width:20rem)]:order-1 [@container(max-width:20rem)]:basis-full">{describeCurrentTurn(combat, canControl ? null : myUserId)}</p>
        <Button type="button" variant="ghost" aria-expanded={isQueueShown} aria-controls={queueId} onClick={() => setIsQueueShown(!isQueueShown)} aria-label={isQueueShown ? "Згорнути чергу" : "Показати чергу"} title={isQueueShown ? "Згорнути чергу" : "Показати чергу"} className="-my-1 ml-auto h-11 w-11 shrink-0 p-0 text-slate-400">
          <ChevronDown className={cn("h-4 w-4", isQueueShown && "rotate-180")} aria-hidden />
        </Button>
        {controls ? <TurnButtons {...controls} /> : null}
        {isMyTurn && current ? <EndOwnTurnButton sessionId={sessionId} combat={combat} combatantId={current.id} /> : null}
      </div>
      {isQueueShown ? (
        <div id={queueId} className="space-y-2">
          <ol ref={listRef} aria-label="Черга ходів" className="relative flex gap-2 overflow-x-auto pb-1 [@container(max-width:17rem)]:flex-col [@container(max-width:17rem)]:overflow-visible">
            {combat.combatants.map((combatant) => (
              <CombatantItem key={combatant.id} combatant={combatant} isCurrent={combatant.id === combat.currentId} canEdit={canControl} onEditInitiative={editInitiative} />
            ))}
          </ol>
          {controls ? <CombatSetupButtons {...controls} newcomers={newcomers} /> : null}
        </div>
      ) : null}
    </section>
  );
}

type CombatControlsProps = { sessionId: number; combat: CombatView; rounds: number; isPending: boolean; run: ReturnType<typeof useCombatCommand>["run"] };

function findTurnAfter(combat: CombatView, step: 1 | -1): TurnShown {
  const index = combat.combatants.findIndex((combatant) => combatant.id === combat.currentId);
  const next = moveTurnPosition({ round: combat.round, index: Math.max(0, index) }, combat.combatants.length, step);
  return { round: next.round, currentId: combat.combatants[next.index]?.id ?? combat.currentId };
}

/// Гравцю — скільки ходів до його героя: можна готуватися, поки ходять інші.
export function describeCurrentTurn(combat: CombatView, myUserId: number | null): string {
  const currentIndex = combat.combatants.findIndex((combatant) => combatant.id === combat.currentId);
  const current = combat.combatants[currentIndex];
  if (!current) return "У черзі нікого немає";
  if (myUserId !== null && current.hero?.userId === myUserId) return "Ваш хід";
  const myIndex = myUserId === null ? -1 : combat.combatants.findIndex((combatant) => combatant.hero?.userId === myUserId);
  const name = current.hero?.name ?? current.creature?.label;
  if (myIndex < 0) return `Зараз ходить: ${name}`;
  const turnsUntilMine = (myIndex - currentIndex + combat.combatants.length) % combat.combatants.length;
  return `Зараз ходить: ${name} · ваш хід ${turnsUntilMine === 1 ? "наступний" : `через ${turnsUntilMine}`}`;
}

function EndOwnTurnButton({ sessionId, combat, combatantId }: { sessionId: number; combat: CombatView; combatantId: number }) {
  const endTurn = async () => {
    const result = await sendOptimistic(findTurnKey(sessionId), findTurnAfter(combat, 1), () => endOwnCombatTurnAction(sessionId, combatantId));
    if (result.ok) captureGameEvent("game_combat_turn_advanced", { step: 1 });
  };
  return (
    <Button type="button" onClick={() => void endTurn()} className="order-2 h-11 w-full gap-1 px-4 text-base [@container(min-width:30rem)]:w-auto">
      Завершити хід
      <ChevronRight className="h-4 w-4" aria-hidden />
    </Button>
  );
}

function TurnButtons({ sessionId, combat }: CombatControlsProps) {
  const moveTurn = async (step: 1 | -1) => {
    const result = await sendOptimistic(findTurnKey(sessionId), findTurnAfter(combat, step), () => advanceCombatTurnAction(sessionId, step));
    if (result.ok) captureGameEvent("game_combat_turn_advanced", { step });
  };
  return (
    <div className="order-2 flex w-full gap-2 [@container(min-width:30rem)]:w-auto">
      <Button type="button" variant="outline" onClick={() => void moveTurn(-1)} aria-label="Назад" title="Назад" className="h-11 w-11 shrink-0 p-0">
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </Button>
      <Button type="button" onClick={() => void moveTurn(1)} className="h-11 min-w-0 flex-1 gap-1 px-4 text-base">
        Наступний хід
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

function CombatSetupButtons({ sessionId, rounds, isPending, run, newcomers }: CombatControlsProps & { newcomers: string[] | null }) {
  const addNewcomers = () =>
    run(() => addCombatantsAction(sessionId), ({ addedCount }) => {
      captureGameEvent("game_combatants_added", { added_count: addedCount });
      if (addedCount === 0) toast.info("Усі герої з листами й поставлені на мапу істоти вже в черзі");
    });
  const finish = async () => {
    if (!(await askToConfirm({ title: "Завершити бій?", description: "Черга ініціативи зникне.", confirmLabel: "Завершити бій", isDestructive: true }))) return;
    run(() => endCombatAction(sessionId), () => captureGameEvent("game_combat_ended", { rounds }));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {newcomers?.length === 0 ? null : (
        <Button type="button" variant="ghost" onClick={addNewcomers} disabled={isPending} className="h-auto min-h-11 min-w-0 justify-start gap-2 px-3 text-left text-slate-300">
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0">{describeNewcomers(newcomers)}</span>
        </Button>
      )}
      <Button type="button" variant="ghost" onClick={finish} disabled={isPending} className="ml-auto h-11 px-3 text-rose-200 hover:text-rose-100">
        Завершити бій
      </Button>
    </div>
  );
}

function describeNewcomers(newcomers: string[] | null): string {
  if (newcomers === null) return "Додати в бій нових з мапи";
  const shown = newcomers.slice(0, 2).join(", ");
  return newcomers.length > 2 ? `Додати в бій: ${shown} і ще ${newcomers.length - 2}` : `Додати в бій: ${shown}`;
}

/// Прокручується сам рядок, а не сторінка: оновлення від майстра не мають зсувати екран гравця.
function useCenterCurrentCombatant(listRef: React.RefObject<HTMLOListElement | null>, currentId: number | null) {
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !item) return;
    list.scrollLeft = item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2;
  }, [listRef, currentId]);
}

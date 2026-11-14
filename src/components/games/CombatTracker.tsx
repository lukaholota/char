"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDownToLine, ArrowUpToLine, ChevronDown, ChevronLeft, ChevronRight, Swords, UserPlus } from "lucide-react";
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
  activateGameSceneAction,
} from "@/lib/actions/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { findCombatNewcomers, moveTurn as moveTurnPosition, type CombatView } from "@/rules/game-combat";
import type { GameSessionView } from "@/server/db/game-sessions";
import { CARD_WIDTH, CombatantItem, CombatantPortrait } from "./CombatantItem";
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

/// Де стоять портрети: поверх верхнього краю мапи (мапа лишається на весь екран) або окремим рядом над нею.
export type PortraitPlacement = { isOverMap: boolean; onChange: (isOverMap: boolean) => void };
const OVER_MAP = "bg-slate-950/90 shadow-xl shadow-black/50";

function PlacementButton({ placement }: { placement: PortraitPlacement }) {
  const label = placement.isOverMap ? "Винести портрети в ряд над мапою" : "Покласти портрети на мапу";
  const Arrow = placement.isOverMap ? ArrowUpToLine : ArrowDownToLine;
  return (
    <Button type="button" variant="ghost" onClick={() => placement.onChange(!placement.isOverMap)} aria-label={label} title={label} className="h-11 w-11 shrink-0 p-0 text-slate-300">
      <Arrow className="h-4 w-4" aria-hidden />
    </Button>
  );
}

export function CombatTracker({ view, placement }: { view: GameSessionView; placement?: PortraitPlacement }) {
  const canControl = view.myRole === "GM" && !view.isArchived;
  const combat = useShownCombat(view);
  if (combat) return <ActiveCombat sessionId={view.id} combat={combat} canControl={canControl} myUserId={view.isArchived ? null : view.myUserId} newcomers={canControl ? findViewNewcomers(view, combat) : null} placement={placement} />;
  return canControl ? <StartCombatButton view={view} /> : null;
}

function findViewNewcomers(view: GameSessionView, combat: CombatView) {
  const heroes = view.members.flatMap((member) => (member.persId === null ? [] : [{ persId: member.persId, name: member.persName ?? member.name }]));
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

/// Бій іде на сцені, яку бачать гравці. Якщо майстер дивиться іншу, її спершу показуємо всім — інакше істоти з неї не потрапили б у чергу.
function StartCombatButton({ view }: { view: GameSessionView }) {
  const { isPending, run } = useCombatCommand();
  const privateScene = view.viewedSceneId === view.activeSceneId ? undefined : view.scenes.find((scene) => scene.id === view.viewedSceneId);
  const start = async () => {
    if (privateScene && !(await askToConfirm({ title: "Показати сцену гравцям і почати бій?", description: `Гравці зараз бачать іншу сцену, а бій іде там, де вони. «${privateScene.name}» відкриється для всіх.`, confirmLabel: "Показати й почати" }))) return;
    run(async () => {
      const shown = privateScene ? await activateGameSceneAction(view.id, privateScene.id) : null;
      return shown && !shown.ok ? shown : startCombatAction(view.id);
    }, ({ combatantCount }) => captureGameEvent("game_combat_started", { combatant_count: combatantCount }));
  };
  return (
    <Button type="button" variant="outline" onClick={start} disabled={isPending} title="Ініціативу кине сервер: за героїв з листа, за істот на мапі зі Спритності" className="h-11 gap-2 px-3">
      <Swords className="h-4 w-4" aria-hidden />
      Почати бій
    </Button>
  );
}

type ActiveCombatProps = { sessionId: number; combat: CombatView; canControl: boolean; myUserId: number | null; newcomers: string[] | null; placement?: PortraitPlacement };

/// Поки на мапі відкрита панель, вибір цілі чи лоток кубиків, бій стискається в рядок над ними, щоб хід не загубився за краєм екрана.
export const CompactCombatContext = createContext(false);

/// Поза боєм стоять лише герої, без ініціативи. Відкрита панель чи інструмент забирає їх із мапи, а з ряду над нею — лише на вузькому екрані.
export function PartyPortraits({ view, placement }: { view: GameSessionView; placement?: PortraitPlacement }) {
  const isCompact = useContext(CompactCombatContext);
  const heroes = view.members.filter((member) => member.persId !== null);
  if (heroes.length === 0) return null;
  return (
    <div className={cn("min-w-0 [container-type:inline-size]", isCompact && (placement?.isOverMap ? "hidden" : "hidden [@container(min-width:40rem)]:block"))}>
      <div className="pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-1">
        <ul aria-label="Герої" className="flex min-w-0 gap-2 overflow-x-auto p-1">
          {heroes.map((hero) => (
            <li key={hero.heroId} className={cn("shrink-0", CARD_WIDTH)}>
              <CombatantPortrait creature={null} avatarUrl={hero.avatarUrl} name={hero.persName ?? hero.name} isCurrent={false} isDown={hero.lifeState.kind === "dead"} />
            </li>
          ))}
        </ul>
        {placement ? <span className={cn("shrink-0 rounded-md", placement.isOverMap && OVER_MAP)}><PlacementButton placement={placement} /></span> : null}
      </div>
    </div>
  );
}

type CombatLook = "open" | "folded" | "compact";

/// Ширину міряє секція бою: на вузькій — заголовок, портрети й кнопки згори донизу, на широкій — в один ряд над мапою.
const LOOK_LAYOUT: Record<CombatLook, string> = {
  open: "grid gap-2 [@container(min-width:48rem)]:grid-cols-[auto_minmax(0,1fr)_auto] [@container(min-width:48rem)]:items-center [@container(min-width:48rem)]:gap-x-4",
  folded: "flex flex-wrap items-center gap-2",
  compact: "flex flex-wrap items-center gap-2",
};
const TURN_PLACE: Record<CombatLook, string> = {
  open: "min-w-0 flex-1 [@container(min-width:48rem)]:-order-1 [@container(min-width:48rem)]:flex-none",
  folded: "w-full [@container(min-width:30rem)]:ml-auto [@container(min-width:30rem)]:w-auto",
  compact: "ml-auto",
};

function ActiveCombat({ sessionId, combat, canControl, myUserId, newcomers, placement }: ActiveCombatProps) {
  const isCompact = useContext(CompactCombatContext);
  const { isPending, run } = useCombatCommand();
  const [isQueueShown, setIsQueueShown] = useState(true);
  const queueId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const look: CombatLook = isCompact ? "compact" : isQueueShown ? "open" : "folded";
  const isOpen = look === "open";
  const current = combat.combatants.find((combatant) => combatant.id === combat.currentId);
  useCenterCurrentCombatant(listRef, combat.currentId);
  const controls = canControl ? { sessionId, combat, rounds: combat.round, isPending, run } : null;
  const isMyTurn = !canControl && myUserId !== null && current?.hero?.userId === myUserId;
  const editInitiative = (combatantId: number, initiative: number) =>
    run(() => setCombatantInitiativeAction(sessionId, combatantId, initiative), () => captureGameEvent("game_combat_initiative_edited", {}));
  return (
    <div className="shrink-0 [container-type:inline-size]">
      <section aria-label="Бій" className={cn("pointer-events-auto rounded-2xl border border-arcane-400/30 p-2", placement?.isOverMap ? cn("mx-auto w-fit max-w-full", OVER_MAP) : "bg-arcane-500/5")}>
        <div className={LOOK_LAYOUT[look]}>
          <div className={cn("flex min-w-0 items-center gap-x-2 pl-1", isOpen ? "[@container(min-width:48rem)]:max-w-[14rem] [@container(min-width:48rem)]:flex-wrap" : "flex-1")}>
            <h2 className="shrink-0 font-rpg-display text-lg text-slate-50">{isCompact ? `Раунд ${combat.round}` : `Бій · раунд ${combat.round}`}</h2>
            {isCompact ? null : (
              <Button type="button" variant="ghost" aria-expanded={isQueueShown} aria-controls={queueId} onClick={() => setIsQueueShown(!isQueueShown)} aria-label={isQueueShown ? "Згорнути чергу" : "Показати чергу"} title={isQueueShown ? "Згорнути чергу" : "Показати чергу"} className="h-11 w-11 shrink-0 p-0 text-slate-300">
                <ChevronDown className={cn("h-4 w-4", isQueueShown && "rotate-180")} aria-hidden />
              </Button>
            )}
            {placement ? <PlacementButton placement={placement} /> : null}
            <p aria-live="polite" className={cn("min-w-0 flex-1 text-sm leading-tight text-slate-300", isOpen ? "line-clamp-2 [@container(min-width:48rem)]:line-clamp-none [@container(min-width:48rem)]:basis-full" : "truncate")}>{describeCurrentTurn(combat, canControl ? null : myUserId)}</p>
          </div>
          {isOpen ? (
            <ol id={queueId} ref={listRef} aria-label="Черга ходів" className="relative flex min-w-0 items-end gap-2 overflow-x-auto p-1.5 [&>li:first-child]:ml-auto [&>li:last-child]:mr-auto">
              {combat.combatants.map((combatant) => (
                <CombatantItem key={combatant.id} combatant={combatant} isCurrent={combatant.id === combat.currentId} canEdit={canControl} onEditInitiative={editInitiative} />
              ))}
            </ol>
          ) : null}
          {controls || isMyTurn ? (
            <div className={isOpen ? "flex flex-wrap items-center gap-2 [@container(min-width:48rem)]:w-52 [@container(min-width:48rem)]:flex-col [@container(min-width:48rem)]:flex-nowrap [@container(min-width:48rem)]:items-stretch" : "contents"}>
              {controls && isOpen ? <CombatSetupButtons {...controls} newcomers={newcomers} /> : null}
              {controls ? <TurnButtons {...controls} className={TURN_PLACE[look]} /> : null}
              {isMyTurn && current ? <EndOwnTurnButton sessionId={sessionId} combat={combat} combatantId={current.id} className={TURN_PLACE[look]} /> : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
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

function EndOwnTurnButton({ sessionId, combat, combatantId, className }: { sessionId: number; combat: CombatView; combatantId: number; className: string }) {
  const endTurn = async () => {
    const result = await sendOptimistic(findTurnKey(sessionId), findTurnAfter(combat, 1), () => endOwnCombatTurnAction(sessionId, combatantId));
    if (result.ok) captureGameEvent("game_combat_turn_advanced", { step: 1 });
  };
  return (
    <Button type="button" onClick={() => void endTurn()} className={cn("h-11 gap-1 px-4 text-base", className)}>
      Завершити хід
      <ChevronRight className="h-4 w-4" aria-hidden />
    </Button>
  );
}

function TurnButtons({ sessionId, combat, className }: CombatControlsProps & { className: string }) {
  const moveTurn = async (step: 1 | -1) => {
    const result = await sendOptimistic(findTurnKey(sessionId), findTurnAfter(combat, step), () => advanceCombatTurnAction(sessionId, step));
    if (result.ok) captureGameEvent("game_combat_turn_advanced", { step });
  };
  return (
    <div className={cn("flex gap-2", className)}>
      <Button type="button" variant="outline" onClick={() => void moveTurn(-1)} aria-label="Назад" title="Назад" className="h-11 w-11 shrink-0 p-0">
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </Button>
      <Button type="button" onClick={() => void moveTurn(1)} className="h-11 min-w-0 flex-1 gap-1 px-3 text-base">
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
    <>
      {newcomers?.length === 0 ? null : (
        <Button type="button" variant="ghost" onClick={addNewcomers} disabled={isPending} className="h-auto min-h-11 min-w-0 basis-full justify-start gap-2 whitespace-normal px-3 text-left text-slate-300 [@container(min-width:48rem)]:order-1 [@container(min-width:48rem)]:basis-auto">
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0">{describeNewcomers(newcomers)}</span>
        </Button>
      )}
      <Button type="button" variant="ghost" onClick={finish} disabled={isPending} className="h-11 shrink-0 px-3 text-rose-200 hover:text-rose-100">
        Завершити бій
      </Button>
    </>
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

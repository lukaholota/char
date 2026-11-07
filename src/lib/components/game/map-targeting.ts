"use client";

import { toast } from "sonner";
import { create } from "zustand";
import { readHeroTargetPersId, readRollTargetCreatureId } from "@/lib/stores/gameSessionStore";
import { useDiceUIStore, type DiceRollAction, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { findGameRollKind } from "@/rules/game-roll-target";
import { addTargetPick, groupTargetPicks, removeTargetPick, splitRollTargets, toggleUniqueTargetPick, type RollTargetRef, type TargetPickGroup } from "@/rules/map-target-picks";
import type { GameSessionView } from "@/server/db/game-sessions";
import { findMapRoomId, showMapForPicking } from "./area-cast";
import { findActionRollKind } from "./build-game-roll";
import { useGameSessionLiveStore } from "./game-session-live-store";

type TargetPicking = { sessionId: number; maxPicks: number; picks: RollTargetRef[] };
/// isHeal — лікування: на мапі обирають лише героїв.
export type RollTargeting = TargetPicking & { roll: DiceRollContext; isHeal: boolean };
/// «Благословення» нічого не кидає: обрані цілі отримують позначку на токені.
export type BlessTargeting = TargetPicking & { blessing: { title: string } };
export type MapTargeting = RollTargeting | BlessTargeting;

export const useMapTargetingStore = create<{ targeting: MapTargeting | null }>(() => ({ targeting: null }));

/// Атака чи шкода по одній цілі в кімнаті з мапою: ціль обирають дотиком по токену, як у BG3.
/// Одна ціль, уже закріплена, — кидок іде одразу, без зайвого кроку; промені й дротики завжди розводять на мапі.
export function startMapTargeting(roll: DiceRollContext): boolean {
  const sessionId = findMapRoomId();
  const view = useGameSessionLiveStore.getState().view;
  const kind = view ? findTargetedRollKind(roll, view) : null;
  if (sessionId === null || kind === null) return false;
  const isHeal = kind === "heal";
  const maxPicks = roll.targetPicks?.count ?? 1;
  const sticky = isHeal ? null : readStickyTarget(sessionId, roll);
  if (maxPicks === 1 && sticky) return false;
  useMapTargetingStore.setState({ targeting: { sessionId, roll, isHeal, maxPicks, picks: sticky ? [sticky] : [] } });
  showMapForPicking();
  return true;
}

function findTargetedRollKind(roll: DiceRollContext, view: GameSessionView) {
  if (roll.areaTargets || roll.rollTarget !== undefined || roll.check) return null;
  if (roll.isCreatureRoll && view.myRole !== "GM") return null;
  const action = roll.actions.find((candidate) => candidate.key === roll.autoRollKey);
  return action ? findActionRollKind(roll, action) : null;
}

function readStickyTarget(sessionId: number, roll: DiceRollContext): RollTargetRef | null {
  const id = roll.isCreatureRoll ? readHeroTargetPersId(sessionId) : readRollTargetCreatureId(sessionId);
  if (id === null) return null;
  return roll.isCreatureRoll ? { persId: id } : { creatureId: id };
}

export function pickMapTarget(target: RollTargetRef) {
  const { targeting } = useMapTargetingStore.getState();
  if (!targeting) return;
  const picks = "blessing" in targeting ? toggleUniqueTargetPick(targeting.picks, target, targeting.maxPicks) : addTargetPick(targeting.picks, target, targeting.maxPicks);
  useMapTargetingStore.setState({ targeting: { ...targeting, picks } });
}

export function unpickMapTarget(target: RollTargetRef) {
  const { targeting } = useMapTargetingStore.getState();
  if (targeting) useMapTargetingStore.setState({ targeting: { ...targeting, picks: removeTargetPick(targeting.picks, target) } });
}

/// Скасування нічого не витрачає: кидок ще не відкривався, комірку лист знімає лише після кидка.
export function cancelMapTargeting() {
  useMapTargetingStore.setState({ targeting: null });
}

/// picks — замість обраних, щоб «Без цілі» кинуло кидок, нікого не зачепивши.
export function confirmMapTargets(view: GameSessionView, picks?: RollTargetRef[]) {
  const { targeting } = useMapTargetingStore.getState();
  if (!targeting || !("roll" in targeting)) return;
  useMapTargetingStore.setState({ targeting: null });
  const [first] = buildTargetRolls({ ...targeting, picks: picks ?? targeting.picks }, (target) => findTargetName(view, target));
  useDiceUIStore.getState().openRoll(first);
}

/// Кожен промінь — свій кидок атаки й шкоди; дротики в одну ціль кидаються разом, бо влучають без атаки.
export function buildTargetRolls({ roll, maxPicks, picks }: Pick<RollTargeting, "roll" | "maxPicks" | "picks">, nameTarget: (target: RollTargetRef) => string): DiceRollContext[] {
  if (!picks.length) return [{ ...roll, rollTarget: null }];
  const isSummed = roll.targetPicks?.isSummed ?? false;
  const shots: Array<{ target: RollTargetRef; roll: DiceRollContext; note: string | null }> = isSummed
    ? groupTargetPicks(picks).map((group) => ({ target: group.target, roll: splitSummedRoll(roll, group, maxPicks), note: describeDarts(group.count) }))
    : picks.map((target, index) => ({ target, roll, note: picks.length > 1 ? `${index + 1} з ${picks.length}` : null }));
  const rolls = shots.map(({ target, roll: shot, note }) => ({ ...shot, rollTarget: target, subtitle: [shot.subtitle, note, `ціль: ${nameTarget(target)}`].filter(Boolean).join(" · ") }));
  return rolls.reduceRight<DiceRollContext[]>((chain, shot) => [chain[0] ? { ...shot, next: chain[0] } : shot, ...chain], []);
}

function splitSummedRoll(roll: DiceRollContext, group: TargetPickGroup, maxPicks: number): DiceRollContext {
  const damage = roll.actions.find((action) => findGameRollKind(action) === "damage");
  const share = (action: DiceRollAction): DiceRollAction => (action === damage ? { ...action, count: (action.count / maxPicks) * group.count, bonus: (action.bonus / maxPicks) * group.count } : action);
  return { ...roll, actions: roll.actions.map(share), ...(damage ? { autoRollKey: damage.key } : {}) };
}

function describeDarts(count: number): string {
  const lastDigit = count % 10;
  const isTeen = count % 100 >= 11 && count % 100 <= 14;
  const word = lastDigit === 1 && !isTeen ? "дротик" : lastDigit >= 2 && lastDigit <= 4 && !isTeen ? "дротики" : "дротиків";
  return `${count} ${word}`;
}

export function findTargetName(view: GameSessionView, target: RollTargetRef): string {
  if ("creatureId" in target) return view.creatures.find((creature) => creature.id === target.creatureId)?.label ?? "істота";
  const member = view.members.find((candidate) => candidate.persId === target.persId);
  return member?.persName ?? member?.name ?? "герой";
}

/// Цілей стільки, скільки дає комірка: 3 на першому колі й ще одна за кожне коло вище, як у правилах обох редакцій.
export function startBlessTargeting(title: string, slotLevel: number): boolean {
  const sessionId = findMapRoomId();
  if (sessionId === null) return false;
  useMapTargetingStore.setState({ targeting: { sessionId, blessing: { title }, maxPicks: 2 + Math.max(1, slotLevel), picks: [] } });
  showMapForPicking();
  return true;
}

/// Вибір лишається, доки сервер не прийняв: при обриві звʼязку досить натиснути ще раз.
export async function confirmBlessing(view: GameSessionView): Promise<void> {
  const { targeting } = useMapTargetingStore.getState();
  if (!targeting || !("blessing" in targeting) || !targeting.picks.length) return;
  const result = await import("@/lib/actions/game-sessions").then(({ blessRoomTargetsAction }) => blessRoomTargetsAction(targeting.sessionId, splitRollTargets(targeting.picks))).catch(() => null);
  if (!result?.ok) return void toast.error(result?.error ?? "Не вдалося накласти благословення — перевірте звʼязок і спробуйте ще раз");
  if (useMapTargetingStore.getState().targeting === targeting) useMapTargetingStore.setState({ targeting: null });
  const names = targeting.picks.map((target) => findTargetName(view, target)).join(", ");
  toast.success(`«${targeting.blessing.title}»: ${names}`, { description: "+к4 до атак і ряткидків, поки триває концентрація" });
}

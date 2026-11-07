"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { moveGameTokenAction } from "@/lib/actions/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { shiftTokenPosition, type TokenPosition } from "@/rules/game-map";
import { findTokenArrowStep } from "@/rules/game-grid";
import type { TokenNameMode } from "@/rules/game-map-creatures";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import { GameAvatar } from "./GameAvatar";
import { HeroConditionsDialog } from "./HeroConditionsDialog";
import { HIGHLIGHT_RING_CLASS, MapTokenSlot, findBoardTokenSize, findGhostTokenSize, findLabelWidth, hasTokenNames, snapTokenPosition, type PlacedToken, type TokenDrag, type TokenLayout } from "./MapTokenSlot";
import { TURN_RING_CLASS, useIsHeroTurn } from "./combat-turn";
import { TokenConditionMarks } from "./TokenConditionMarks";
import { TokenName } from "./TokenName";
import { showOptimistic, sendOptimistic, useOptimisticReader } from "./optimistic-values";
import { useTokenDrag, type TokenGhost } from "./use-token-drag";
import { TOKEN_SIZE_PX } from "./use-token-scale";
import { DownMark } from "./MapCreatureHitPoints";
import { describeHeroLifeState, type HeroLifeState } from "@/rules/hero-life-state";

type Point = { clientX: number; clientY: number };
const HERO_CELLS = 1;

type HeroTokensInput = { view: GameSessionView; moves: TokenMoves; layout: TokenLayout; nameMode: TokenNameMode; findDropPosition: (point: Point) => TokenPosition | null; isTurned: () => boolean };

/// Свого героя рухає гравець, усіх — майстер; дотик без руху відкриває стани героя.
export function useHeroTokens({ view, moves, layout, nameMode, findDropPosition, isTurned }: HeroTokensInput) {
  const [conditionsHeroId, setConditionsHeroId] = useState<number | null>(null);
  const canMove = (member: GameSessionMemberView) => !view.isArchived && (view.myRole === "GM" || member.userId === view.myUserId);
  const findSnappedDrop = (point: Point) => {
    const position = findDropPosition(point);
    return position ? snapTokenPosition(position, layout, HERO_CELLS) : null;
  };
  const { ghost, bindToken } = useTokenDrag(
    (userId, point) => {
      const position = findSnappedDrop(point);
      const member = view.members.find((candidate) => candidate.userId === userId);
      if (member && (position || moves.findPosition(member))) void moves.sendPosition(userId, position);
    },
    (point) => findDropPosition(point) !== null,
    (userId) => setConditionsHeroId(userId),
  );
  const heroes = view.members.filter((member) => member.persId !== null);
  const waiting = heroes.filter((member) => !moves.findPosition(member));
  const dragged = ghost ? heroes.find((member) => member.userId === ghost.id) : undefined;
  const showsNames = hasTokenNames(layout);

  const renderToken = (member: GameSessionMemberView, size: string | number, onBoard: { labelWidth: number; isHighlighted: boolean } | null) => {
    const isPlaced = moves.findPosition(member) !== null;
    const onKeyDown = (event: KeyboardEvent) => {
      const step = findTokenArrowStep(event.key, layout.frame);
      const position = moves.findPosition(member);
      if (step && position) moves.showPosition(member.userId, shiftTokenPosition(position, step));
      else if ((event.key === "Enter" || event.key === " ") && !isPlaced) void moves.sendPosition(member.userId, layout.findFreeSpot());
      else if (event.key === "Enter" || event.key === " ") setConditionsHeroId(member.userId);
      else if ((event.key === "Delete" || event.key === "Backspace") && isPlaced) void moves.sendPosition(member.userId, null);
      else return;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const position = moves.findPosition(member);
      if (findTokenArrowStep(event.key, layout.frame) && position) void moves.sendPosition(member.userId, snapTokenPosition(position, layout, HERO_CELLS));
    };
    return (
      <TokenFace member={member} isMine={member.userId === view.myUserId} isDimmed={ghost?.id === member.userId} size={size} nameMode={onBoard && !showsNames ? null : nameMode} onBoard={onBoard}>
        {canMove(member) ? (
          <button
            type="button"
            aria-label={`Токен «${member.persName ?? member.name}»${describeLifeSuffix(member.lifeState)}. ${isPlaced ? "Дотик — стани, тягніть або рухайте стрілками; Delete — прибрати з мапи" : "Перетягніть на мапу або натисніть Enter"}`}
            className="absolute inset-0 cursor-grab touch-none rounded-full active:cursor-grabbing"
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            {...bindToken(member.userId)}
          />
        ) : null}
      </TokenFace>
    );
  };

  const placed: PlacedToken[] = heroes.flatMap((member) => {
    const position = moves.findPosition(member);
    return position ? [{ key: `hero-${member.userId}`, name: member.persName ?? member.name, position, cells: HERO_CELLS, ...(member.persId !== null ? { persId: member.persId } : {}) }] : [];
  });
  const draggedFrom = dragged ? moves.findPosition(dragged) : null;
  const drag: TokenDrag | null = ghost && dragged ? { from: draggedFrom, to: findSnappedDrop(ghost), cells: HERO_CELLS } : null;
  const size = findBoardTokenSize(layout, HERO_CELLS, 1);

  return {
    ghost,
    drag,
    placed,
    heroes,
    waiting,
    trayTokens: waiting.map((member) => <li key={member.userId}>{renderToken(member, TOKEN_SIZE_PX, null)}</li>),
    mapTokens: heroes.map((member) => {
      const position = moves.findPosition(member);
      if (!position) return null;
      const zClass = member.userId === view.myUserId ? "z-[32]" : canMove(member) ? "z-[31]" : "z-30";
      return (
        <MapTokenSlot key={member.userId} position={position} size={size} className={zClass}>
          {renderToken(member, size, { labelWidth: findLabelWidth(layout, 1), isHighlighted: layout.isHighlighted(position, HERO_CELLS) })}
        </MapTokenSlot>
      );
    }),
    overlay: (
      <>
        {ghost && dragged ? <DraggedToken ghost={ghost} member={dragged} size={findGhostTokenSize(layout, HERO_CELLS, 1)} isMine={ghost.id === view.myUserId} isTurned={isTurned()} isLeavingMap={!ghost.isOverTarget && draggedFrom !== null} /> : null}
        <HeroConditionsDialog sessionId={view.id} hero={view.members.find((member) => member.userId === conditionsHeroId) ?? null} onClose={() => setConditionsHeroId(null)} />
      </>
    ),
  };
}

type TokenFaceProps = {
  member: GameSessionMemberView;
  isMine: boolean;
  isDimmed?: boolean;
  size?: string | number;
  nameMode?: TokenNameMode | null;
  onBoard?: { labelWidth: number; isHighlighted: boolean } | null;
  children?: ReactNode;
};

function TokenFace({ member, isMine, isDimmed, size = TOKEN_SIZE_PX, nameMode = "short", onBoard = null, children }: TokenFaceProps) {
  const name = member.persName ?? member.name;
  const isTurn = useIsHeroTurn(member.userId);
  const { lifeState } = member;
  return (
    <div className={cn("flex flex-col items-center", !children && "pointer-events-none", isDimmed && "opacity-40")} title={name}>
      <div className={cn("relative rounded-full", onBoard?.isHighlighted && HIGHLIGHT_RING_CLASS)} style={{ width: size, height: size }}>
        <GameAvatar src={member.avatarUrl} name={name} className={cn("h-full w-full border-2 shadow-lg shadow-black/50 ring-2 ring-slate-950/80", isMine ? "border-arcane-300" : "border-white/70", lifeState.kind === "dying" && "border-rose-500", lifeState.kind === "dead" && "opacity-50 grayscale", isTurn && TURN_RING_CLASS)} />
        {lifeState.kind === "dead" ? <DownMark /> : null}
        {children}
      </div>
      <div className="flex flex-col items-center">
        {lifeState.kind === "dying" ? <DeathSaveMarks successes={lifeState.successes} failures={lifeState.failures} /> : null}
        {!children && lifeState.kind !== "up" ? <span className="sr-only">{describeHeroLifeState(lifeState)}</span> : null}
        <TokenConditionMarks token={{ kind: "hero", id: member.userId }} conditions={member.conditions} />
        {nameMode ? <TokenName name={name} mode={nameMode} tokenSize={onBoard?.labelWidth ?? (typeof size === "number" ? size : TOKEN_SIZE_PX)} /> : null}
      </div>
    </div>
  );
}

function describeLifeSuffix(state: HeroLifeState): string {
  const text = describeHeroLifeState(state);
  return text ? `, ${text}` : "";
}

function DeathSaveMarks({ successes, failures }: { successes: number; failures: number }) {
  const dots = (filled: number, filledClass: string) => [0, 1, 2].map((index) => <span key={index} className={cn("h-2 w-2 rounded-full ring-1", index < filled ? filledClass : "bg-transparent ring-slate-500")} />);
  return (
    <span aria-hidden title={`Кидки смерті: успіхів ${successes}, провалів ${failures}`} className="mt-0.5 flex items-center gap-1 rounded bg-slate-950/90 px-1 py-0.5 ring-1 ring-rose-400/60">
      {dots(successes, "bg-emerald-400 ring-emerald-300")}
      <span className="h-2.5 w-px bg-slate-600" />
      {dots(failures, "bg-rose-500 ring-rose-300")}
    </span>
  );
}

function DraggedToken({ ghost, member, size, isMine, isTurned, isLeavingMap }: { ghost: TokenGhost; member: GameSessionMemberView; size: number; isMine: boolean; isTurned: boolean; isLeavingMap: boolean }) {
  return createPortal(
    <div className="pointer-events-none fixed z-[10000] flex flex-col items-center" style={{ left: ghost.clientX, top: ghost.clientY, transform: `translate(-50%, ${-size / 2}px)${isTurned ? " rotate(90deg)" : ""}`, transformOrigin: `50% ${size / 2}px` }} aria-hidden>
      <TokenFace member={member} isMine={isMine} size={size} nameMode={null} />
      {isLeavingMap ? <span className="mt-1 whitespace-nowrap rounded-full bg-rose-950/90 px-2 py-0.5 text-xs text-rose-100 shadow-lg shadow-black/50">Прибрати з мапи</span> : null}
    </div>,
    document.body,
  );
}

export type TokenMoves = ReturnType<typeof useTokenMoves>;

/// Рух видно одразу й по всій кімнаті; правдою знову стає сервер, щойно прийде вигляд після відповіді.
export function useTokenMoves(view: GameSessionView) {
  const read = useOptimisticReader();
  const findKey = (userId: number) => `hero-position:${view.viewedSceneId}:${userId}`;
  const findPosition = (member: GameSessionMemberView) => read(findKey(member.userId), member.token);
  const showPosition = (userId: number, position: TokenPosition | null) => void showOptimistic(findKey(userId), position);

  const sendPosition = async (userId: number, position: TokenPosition | null) => {
    const sceneId = view.viewedSceneId;
    if (sceneId === null) return;
    const result = await sendOptimistic(findKey(userId), position, () => moveGameTokenAction(view.id, sceneId, userId, position));
    if (result.ok) captureGameEvent("game_token_moved", { is_own: userId === view.myUserId, is_on_map: position !== null });
  };

  return { findPosition, showPosition, sendPosition };
}

"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { moveGameTokenAction, transformHeroTokenAction } from "@/lib/actions/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { shiftTokenPosition, type TokenPosition } from "@/rules/game-map";
import { findTokenArrowStep } from "@/rules/game-grid";
import type { TokenNameMode } from "@/rules/game-map-creatures";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import { GameAvatar } from "./GameAvatar";
import { ContentImage } from "@/components/no-ai/ContentImage";
import { isMediaImageUrl } from "@/lib/media-url";
import { findCutoutOutlineClass, findHeroCutoutKey, useCutoutImage } from "./token-cutout";
import { HeroConditionsDialog } from "./HeroConditionsDialog";
import { HIGHLIGHT_RING_CLASS, MapTokenSlot, findBoardTokenSize, findGhostTokenSize, findLabelWidth, hasTokenNames, snapTokenPosition, type PlacedToken, type TokenDrag, type TokenLayout, type TokenOnBoard } from "./MapTokenSlot";
import { TURN_RING_CLASS, useIsHeroTurn } from "./combat-turn";
import { TokenConditionMarks } from "./TokenConditionMarks";
import { TokenName } from "./TokenName";
import { holdValueBefore, rememberUndo } from "./map-history";
import { showOptimistic, sendOptimistic, useOptimistic, useOptimisticReader } from "./optimistic-values";
import { useTokenDrag, type TokenGhost } from "./use-token-drag";
import { TOKEN_SIZE_PX } from "./use-token-scale";
import { DownMark } from "./MapCreatureHitPoints";
import { describeHeroLifeState, type HeroLifeState } from "@/rules/hero-life-state";
import type { TokenTransform } from "@/rules/token-transform";
import { TokenTransformHandles, findTokenRotationStyle, scaleGhostSize, scaleTokenSize, type SelectedToken, type TokenSelection } from "./TokenTransformControls";

type Point = { clientX: number; clientY: number };
const HERO_CELLS = 1;

type HeroTokensInput = { view: GameSessionView; moves: TokenMoves; layout: TokenLayout; nameMode: TokenNameMode; selection: TokenSelection; findDropPosition: (point: Point) => TokenPosition | null; isTurned: () => boolean };

/// Свого героя рухає гравець, усіх — майстер; дотик без руху вибирає токен на мапі, а наступний відкриває стани героя.
export function useHeroTokens({ view, moves, layout, nameMode, selection, findDropPosition, isTurned }: HeroTokensInput) {
  const [conditionsHeroId, setConditionsHeroId] = useState<number | null>(null);
  const transforms = useHeroTransforms(view);
  const canMove = (member: GameSessionMemberView) => !view.isArchived && (view.myRole === "GM" || member.userId === view.myUserId);
  const findKey = (heroId: number) => `hero-${heroId}`;
  const tapHero = (heroId: number) => {
    const member = view.members.find((candidate) => candidate.heroId === heroId);
    const open = () => setConditionsHeroId(heroId);
    if (member && moves.findPosition(member)) selection.tap(findKey(heroId), open);
    else open();
  };
  const findSnappedDrop = (point: Point) => {
    const position = findDropPosition(point);
    return position ? snapTokenPosition(position, layout, HERO_CELLS) : null;
  };
  const { ghost, bindToken } = useTokenDrag(
    (heroId, point) => {
      const position = findSnappedDrop(point);
      const member = view.members.find((candidate) => candidate.heroId === heroId);
      if (member && (position || moves.findPosition(member))) void moves.sendPosition(member, position);
    },
    (point) => findDropPosition(point) !== null,
    tapHero,
  );
  const heroes = view.members.filter((member) => member.persId !== null);
  const waiting = heroes.filter((member) => !moves.findPosition(member));
  const dragged = ghost ? heroes.find((member) => member.heroId === ghost.id) : undefined;
  const showsNames = hasTokenNames(layout);

  const selectedMember = heroes.find((member) => findKey(member.heroId) === selection.key && canMove(member) && moves.findPosition(member));
  const selected: SelectedToken | null = selectedMember
    ? {
        key: findKey(selectedMember.heroId),
        name: selectedMember.persName ?? selectedMember.name,
        transform: transforms.find(selectedMember),
        openLabel: "Стани",
        onOpen: () => setConditionsHeroId(selectedMember.heroId),
        onPreview: (transform) => transforms.show(selectedMember, transform),
        onChange: (transform) => void transforms.send(selectedMember, transform),
      }
    : null;

  const renderToken = (member: GameSessionMemberView, size: string | number, onBoard: TokenOnBoard | null, handles: ReactNode = null) => {
    const isPlaced = moves.findPosition(member) !== null;
    const onKeyDown = (event: KeyboardEvent) => {
      const step = findTokenArrowStep(event.key, layout.frame);
      const position = moves.findPosition(member);
      if (step && position) moves.showPosition(member, shiftTokenPosition(position, step));
      else if ((event.key === "Enter" || event.key === " ") && !isPlaced) void moves.sendPosition(member, layout.findFreeSpot());
      else if (event.key === "Enter" || event.key === " ") tapHero(member.heroId);
      else if (event.key === "Escape" && handles) selection.select(null);
      else if ((event.key === "Delete" || event.key === "Backspace") && isPlaced) void moves.sendPosition(member, null);
      else return;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const position = moves.findPosition(member);
      if (findTokenArrowStep(event.key, layout.frame) && position) void moves.sendPosition(member, snapTokenPosition(position, layout, HERO_CELLS));
    };
    return (
      <TokenFace member={member} isMine={member.userId === view.myUserId} isDimmed={ghost?.id === member.heroId} size={size} nameMode={onBoard && !showsNames ? null : nameMode} onBoard={onBoard}>
        {canMove(member) ? (
          <>
            <button
              type="button"
              aria-label={`Токен «${member.persName ?? member.name}»${describeLifeSuffix(member.lifeState)}. ${isPlaced ? "Дотик — вибрати для повороту й розміру, ще дотик — стани; тягніть або рухайте стрілками; Delete — прибрати з мапи" : "Перетягніть на мапу або натисніть Enter"}`}
              className="absolute inset-0 cursor-grab touch-none rounded-full active:cursor-grabbing"
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              {...bindToken(member.heroId)}
            />
            {handles}
          </>
        ) : null}
      </TokenFace>
    );
  };

  const placed: PlacedToken[] = heroes.flatMap((member) => {
    const position = moves.findPosition(member);
    return position ? [{ key: `hero-${member.heroId}`, name: member.persName ?? member.name, position, cells: HERO_CELLS, ...(member.persId !== null ? { persId: member.persId } : {}) }] : [];
  });
  const draggedFrom = dragged ? moves.findPosition(dragged) : null;
  const drag: TokenDrag | null = ghost && dragged ? { from: draggedFrom, to: findSnappedDrop(ghost), cells: HERO_CELLS } : null;
  const size = findBoardTokenSize(layout, HERO_CELLS, 1);

  return {
    ghost,
    drag,
    placed,
    selected,
    heroes,
    waiting,
    trayTokens: waiting.map((member) => <li key={member.heroId}>{renderToken(member, TOKEN_SIZE_PX, null)}</li>),
    mapTokens: heroes.map((member) => {
      const position = moves.findPosition(member);
      if (!position) return null;
      const isSelected = selected?.key === findKey(member.heroId);
      const zClass = isSelected ? "z-[33]" : member.userId === view.myUserId ? "z-[32]" : canMove(member) ? "z-[31]" : "z-30";
      const transform = transforms.find(member);
      const shownSize = scaleTokenSize(size, transform);
      const handles = isSelected && selected ? <TokenTransformHandles token={selected} onDeselect={() => selection.select(null)} /> : null;
      return (
        <MapTokenSlot key={member.heroId} position={position} size={shownSize} className={zClass}>
          {renderToken(member, shownSize, { labelWidth: findLabelWidth(layout, 1), isHighlighted: layout.isHighlighted(position, HERO_CELLS), isOutlined: layout.isCutoutOutlined, rotation: transform.rotation }, handles)}
        </MapTokenSlot>
      );
    }),
    overlay: (
      <>
        {ghost && dragged ? <DraggedToken ghost={ghost} member={dragged} size={scaleGhostSize(findGhostTokenSize(layout, HERO_CELLS, 1), transforms.find(dragged))} rotation={transforms.find(dragged).rotation} isOutlined={layout.isCutoutOutlined} isMine={dragged.userId === view.myUserId} isTurned={isTurned()} isLeavingMap={!ghost.isOverTarget && draggedFrom !== null} /> : null}
        <HeroConditionsDialog view={view} hero={view.members.find((member) => member.heroId === conditionsHeroId) ?? null} onClose={() => setConditionsHeroId(null)} />
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
  onBoard?: TokenOnBoard | null;
  children?: ReactNode;
};

function TokenFace({ member, isMine, isDimmed, size = TOKEN_SIZE_PX, nameMode = "short", onBoard = null, children }: TokenFaceProps) {
  const name = member.persName ?? member.name;
  const isTurn = useIsHeroTurn(member.persId);
  const { lifeState } = member;
  return (
    <div className={cn("flex flex-col items-center", !children && "pointer-events-none", isDimmed && "opacity-40")} title={name}>
      <div className={cn("relative rounded-full", onBoard?.isHighlighted && HIGHLIGHT_RING_CLASS)} style={{ width: size, height: size }}>
        <div className="h-full w-full" style={findTokenRotationStyle(onBoard?.rotation ?? 0)}>
          <HeroPortrait member={member} name={name} isOnBoard={onBoard !== null} frameClass={cn(lifeState.kind === "dead" && "opacity-50 grayscale", isTurn && TURN_RING_CLASS)} borderClass={lifeState.kind === "dying" ? "border-rose-500" : isMine ? "border-arcane-300" : "border-white/70"} outlineClass={findCutoutOutlineClass(lifeState.kind === "dying" ? "dying" : isMine ? "mine" : "other", Boolean(onBoard?.isOutlined))} />
        </div>
        {lifeState.kind === "dead" ? <DownMark /> : null}
        {children}
      </div>
      <div className="flex flex-col items-center">
        {lifeState.kind === "dying" ? <DeathSaveMarks successes={lifeState.successes} failures={lifeState.failures} /> : null}
        {!children && lifeState.kind !== "up" ? <span className="sr-only">{describeHeroLifeState(lifeState)}</span> : null}
        <TokenConditionMarks token={{ kind: "hero", id: member.heroId }} conditions={member.conditions} />
        {nameMode ? <TokenName name={name} mode={nameMode} tokenSize={onBoard?.labelWidth ?? (typeof size === "number" ? size : TOKEN_SIZE_PX)} /> : null}
      </div>
    </div>
  );
}

type HeroPortraitProps = { member: GameSessionMemberView; name: string; isOnBoard: boolean; frameClass: string; borderClass: string; outlineClass: string };

const ROUND_FRAME = "border-2 shadow-lg shadow-black/50 ring-2 ring-slate-950/80";

/// У лотку токен завжди круглий; на мапі й під пальцем прозорий герой лишається прозорим.
function HeroPortrait({ member, name, isOnBoard, frameClass, borderClass, outlineClass }: HeroPortraitProps) {
  const isCutoutChosen = useOptimistic(findHeroCutoutKey(member.heroId), member.isCutout);
  const cutoutSrc = isCutoutChosen && isOnBoard && isMediaImageUrl(member.avatarUrl) ? member.avatarUrl : null;
  const { isCutout, inspectImage } = useCutoutImage(cutoutSrc);
  if (!cutoutSrc) return <GameAvatar src={member.avatarUrl} name={name} className={cn("h-full w-full", ROUND_FRAME, borderClass, frameClass)} />;
  return (
    <div className={cn("relative h-full w-full rounded-full", isCutout ? outlineClass : cn("overflow-hidden", ROUND_FRAME, borderClass), frameClass)}>
      <ContentImage src={cutoutSrc} alt="" provenance="manual" fill sizes="128px" draggable={false} onLoad={(event) => inspectImage(event.currentTarget)} className={isCutout ? "object-contain" : "object-cover"} />
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

type DraggedTokenProps = { ghost: TokenGhost; member: GameSessionMemberView; size: number; rotation: number; isOutlined: boolean; isMine: boolean; isTurned: boolean; isLeavingMap: boolean };

function DraggedToken({ ghost, member, size, rotation, isOutlined, isMine, isTurned, isLeavingMap }: DraggedTokenProps) {
  return createPortal(
    <div className="pointer-events-none fixed z-[10000] flex flex-col items-center" style={{ left: ghost.clientX, top: ghost.clientY, transform: `translate(-50%, ${-size / 2}px)${isTurned ? " rotate(90deg)" : ""}`, transformOrigin: `50% ${size / 2}px` }} aria-hidden>
      <TokenFace member={member} isMine={isMine} size={size} nameMode={null} onBoard={{ labelWidth: size, isHighlighted: false, isOutlined, rotation }} />
      {isLeavingMap ? <span className="mt-1 whitespace-nowrap rounded-full bg-rose-950/90 px-2 py-0.5 text-xs text-rose-100 shadow-lg shadow-black/50">Прибрати з мапи</span> : null}
    </div>,
    document.body,
  );
}

export type TokenMoves = ReturnType<typeof useTokenMoves>;

/// Рух видно одразу й по всій кімнаті; правдою знову стає сервер, щойно прийде вигляд після відповіді.
export function useTokenMoves(view: GameSessionView) {
  const read = useOptimisticReader();
  const findKey = (member: GameSessionMemberView) => `hero-position:${view.viewedSceneId}:${member.heroId}`;
  const findPosition = (member: GameSessionMemberView) => read(findKey(member), member.token);
  const showPosition = (member: GameSessionMemberView, position: TokenPosition | null) => {
    holdValueBefore(findKey(member), findPosition(member));
    showOptimistic(findKey(member), position);
  };

  const sendPosition = async (member: GameSessionMemberView, position: TokenPosition | null) => {
    const sceneId = view.viewedSceneId;
    if (sceneId === null) return;
    rememberUndo(sceneId, findKey(member), findPosition(member), position, (before) => sendPosition(member, before));
    const result = await sendOptimistic(findKey(member), position, () => moveGameTokenAction(view.id, sceneId, member.heroId, position));
    if (result.ok) captureGameEvent("game_token_moved", { is_own: member.userId === view.myUserId, is_on_map: position !== null });
  };

  return { findPosition, showPosition, sendPosition };
}

/// Поворот і розмір героя належать сцені: на іншій сцені той самий герой стоїть як звичайно.
function useHeroTransforms(view: GameSessionView) {
  const read = useOptimisticReader();
  const findKey = (member: GameSessionMemberView) => `hero-transform:${view.viewedSceneId}:${member.heroId}`;
  const find = (member: GameSessionMemberView) => read(findKey(member), member.tokenTransform);
  const show = (member: GameSessionMemberView, transform: TokenTransform) => {
    holdValueBefore(findKey(member), find(member));
    showOptimistic(findKey(member), transform);
  };
  const send = async (member: GameSessionMemberView, transform: TokenTransform) => {
    const sceneId = view.viewedSceneId;
    rememberUndo(sceneId, findKey(member), find(member), transform, (before) => send(member, before));
    if (sceneId !== null) await sendOptimistic(findKey(member), transform, () => transformHeroTokenAction(view.id, sceneId, member.heroId, transform));
  };
  return { find, show, send };
}

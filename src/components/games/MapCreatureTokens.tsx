"use client";

import { createContext, useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";
import { useCutoutImage } from "./token-cutout";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { changeMapCreatureHitPointsAction, moveMapCreatureAction, removeMapCreaturesAction, renameMapCreatureAction, setCreatureNameModeAction, setMapCreatureCutoutAction, setMapCreatureSizeAction } from "@/lib/actions/game-sessions";
import { useAreaCastStore } from "@/lib/components/game/area-cast";
import { useMapTargetingStore } from "@/lib/components/game/map-targeting";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { NO_TOKEN_CONDITIONS } from "@/rules/token-conditions";
import { applyHitPointChange, isCreatureDown, type HitPointChange } from "@/rules/creature-hit-points";
import { shiftTokenPosition, type TokenPosition } from "@/rules/game-map";
import { findTokenArrowStep } from "@/rules/game-grid";
import { CREATURE_SIZE_CELLS, CREATURE_TOKEN_SIZE_SCALES, buildCreatureInitials, type CreatureTokenSize, type MapCreatureView, type TokenNameMode } from "@/rules/game-map-creatures";
import type { GameSessionView } from "@/server/db/game-sessions";
import { AddMapCreaturesDialog } from "./AddMapCreaturesDialog";
import { TURN_RING_CLASS, useIsCreatureTurn } from "./combat-turn";
import { DownMark, HitPointBar } from "./MapCreatureHitPoints";
import { buildCreatureTargetControl, useRollTargetCreatureId } from "./RollTargetControls";
import { TokenConditionMarks } from "./TokenConditionMarks";
import { useShownConditions, useTokenConditionChanges } from "./use-token-conditions";
import { MapCreatureStatblockDialog } from "./MapCreatureStatblockDialog";
import { readOptimistic, sendOptimistic, showOptimistic, useOptimisticReader } from "./optimistic-values";
import { useTokenDrag, type TokenGhost } from "./use-token-drag";
import { TokenName } from "./TokenName";
import { TOKEN_SIZE_PX } from "./use-token-scale";
import { HIGHLIGHT_RING_CLASS, MapTokenSlot, findBoardTokenSize, findGhostTokenSize, findLabelWidth, hasTokenNames, snapTokenPosition, type PlacedToken, type TokenDrag, type TokenLayout } from "./MapTokenSlot";
import { askToConfirm } from "@/components/ui/confirm-dialog";

type Point = { clientX: number; clientY: number };

type CreatureTokensInput = { view: GameSessionView; layout: TokenLayout; findDropPosition: (point: Point) => TokenPosition | null; isTurned: () => boolean };
type OnBoard = { labelWidth: number; isHighlighted: boolean };

/// Черга бою відкриває картку тієї ж мапи, у якій стоїть: у кімнаті й на весь екран — кожна свою.
export const OpenCreatureCardContext = createContext<((creatureId: number) => void) | null>(null);

/// Істот рухає й прибирає лише майстер; дотик без руху відкриває картку: майстру — зі статблоком, гравцю — без. Істоту в тумані гравець не бачить зовсім.
export function useMapCreatureTokens({ view, layout, findDropPosition, isTurned }: CreatureTokensInput) {
  const canEdit = view.myRole === "GM" && !view.isArchived;
  const moves = useCreatureMoves(view);
  const looks = useCreatureLooks(view);
  const changeConditions = useTokenConditionChanges(view.id);
  const targetId = useRollTargetCreatureId(view.id);
  const myHeroName = view.members.find((member) => member.userId === view.myUserId)?.persName ?? null;
  const findCells = (creature: MapCreatureView) => CREATURE_SIZE_CELLS[looks.findSize(creature)];
  const findSnappedDrop = (creature: MapCreatureView | undefined, point: Point) => {
    const position = findDropPosition(point);
    return position && creature ? snapTokenPosition(position, layout, findCells(creature)) : position;
  };
  const [openId, setOpenId] = useState<number | null>(null);
  const isTargeting = useMapTargetingStore((state) => state.targeting !== null);
  const isCasting = useAreaCastStore((state) => state.cast !== null);
  useEffect(() => {
    if (isTargeting || isCasting) setOpenId(null);
  }, [isTargeting, isCasting]);
  const openStatblock = (id: number) => {
    setOpenId(id);
    captureGameEvent("game_creature_statblock_opened", { is_gm: view.myRole === "GM" });
  };
  const { ghost, bindToken } = useTokenDrag<number>(
    (id, point) => {
      const creature = view.creatures.find((candidate) => candidate.id === id);
      const position = findSnappedDrop(creature, point);
      if (creature && (position || moves.findPosition(creature))) void moves.send(id, position);
    },
    (point) => findDropPosition(point) !== null,
    openStatblock,
  );
  const router = useModeRouter();
  const renameCreature = async (id: number, name: string) => {
    const result = await renameMapCreatureAction(view.id, id, name);
    if (!result.ok) toast.error(result.error);
    else router.refresh();
    return result.ok;
  };
  const removeFromStatblock = (id: number) => {
    setOpenId(null);
    void moves.send(id, null);
  };
  const shown = view.creatures.filter((creature) => !moves.isRemoved(creature)).map(looks.applyPendingHitPoints).map(looks.applyPendingCutout);
  const waiting = shown.filter((creature) => !moves.findPosition(creature));
  const dragged = ghost ? shown.find((creature) => creature.id === ghost.id) : undefined;
  const openCreature = shown.find((creature) => creature.id === openId) ?? null;
  const openConditions = useShownConditions({ kind: "creature", id: openCreature?.id ?? 0 }, openCreature?.conditions ?? NO_TOKEN_CONDITIONS);

  const isShownOnMap = (creature: MapCreatureView) => {
    const position = moves.findPosition(creature);
    return position !== null && !layout.isHidden(position);
  };
  const placed: PlacedToken[] = shown.filter(isShownOnMap).map((creature) => ({ key: `creature-${creature.id}`, creatureId: creature.id, name: creature.label, position: moves.findPosition(creature)!, cells: findCells(creature) }));
  const draggedFrom = dragged ? moves.findPosition(dragged) : null;
  const drag: TokenDrag | null = ghost && dragged ? { from: draggedFrom, to: findSnappedDrop(dragged, ghost), cells: findCells(dragged) } : null;

  const renderToken = (creature: MapCreatureView, size: string | number, shownName: TokenNameMode | null, onBoard: OnBoard | null) => {
    const position = moves.findPosition(creature);
    const onKeyDown = (event: KeyboardEvent) => {
      const step = findTokenArrowStep(event.key, layout.frame);
      if (step && position) moves.show(creature.id, shiftTokenPosition(position, step));
      else if ((event.key === "Enter" || event.key === " ") && position) openStatblock(creature.id);
      else if (event.key === "Enter" || event.key === " ") void moves.send(creature.id, layout.findFreeSpot());
      else if (event.key === "Delete" || event.key === "Backspace") void moves.send(creature.id, null);
      else return;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (findTokenArrowStep(event.key, layout.frame) && position) void moves.send(creature.id, snapTokenPosition(position, layout, findCells(creature)));
    };
    const status = `${creature.hitPoints ? `, хіти ${creature.hitPoints.current} з ${creature.hitPoints.max}` : ""}${creature.isDown ? ", повалений" : ""}${creature.id === targetId ? ", ціль" : ""}`;
    const hint = canEdit ? (position ? "Дотик — статблок, тягніть або рухайте стрілками; Delete — прибрати" : "Перетягніть на мапу або натисніть Enter") : "Відкрити картку істоти";
    return (
      <CreatureTokenFace creature={creature} size={size} nameMode={shownName} isDimmed={ghost?.id === creature.id} isTarget={creature.id === targetId} onBoard={onBoard}>
        <button
          type="button"
          aria-label={`${creature.isAlly ? "Союзник" : "Ворог"} «${creature.label}»${status}. ${hint}`}
          className={cn("absolute inset-0 rounded-full", canEdit && "cursor-grab touch-none active:cursor-grabbing")}
          {...(canEdit ? { onKeyDown, onKeyUp, ...bindToken(creature.id) } : { onClick: () => openStatblock(creature.id) })}
        />
      </CreatureTokenFace>
    );
  };

  return {
    openStatblock,
    ghost,
    drag,
    placed,
    hasPlaced: placed.length > 0,
    names: canEdit && placed.length > 0 ? { mode: looks.nameMode, onChange: looks.sendNameMode } : null,
    tray: canEdit ? (
      <CreatureTray sessionId={view.id} hasCreatures={shown.length > 0} hasWaiting={waiting.length > 0}>
        {waiting.map((creature) => <li key={creature.id}>{renderToken(creature, TOKEN_SIZE_PX, "short", null)}</li>)}
      </CreatureTray>
    ) : null,
    mapTokens: shown.filter(isShownOnMap).map((creature) => {
      const position = moves.findPosition(creature)!;
      const sizeScale = CREATURE_TOKEN_SIZE_SCALES[looks.findSize(creature)];
      const size = findBoardTokenSize(layout, findCells(creature), sizeScale);
      return (
        <MapTokenSlot key={creature.id} position={position} size={size} className={canEdit ? "z-[11]" : "z-10"}>
          {renderToken(creature, size, hasTokenNames(layout, findCells(creature)) ? looks.nameMode : null, { labelWidth: findLabelWidth(layout, sizeScale), isHighlighted: layout.isHighlighted(position, findCells(creature)) })}
        </MapTokenSlot>
      );
    }),
    overlay: (
      <>
        {ghost && dragged ? (
          <CreatureGhost ghost={ghost} creature={dragged} size={findGhostTokenSize(layout, findCells(dragged), CREATURE_TOKEN_SIZE_SCALES[looks.findSize(dragged)])} isTurned={isTurned()} isLeavingMap={!ghost.isOverTarget && draggedFrom !== null} />
        ) : null}
        <MapCreatureStatblockDialog
          creature={openCreature}
          onClose={() => setOpenId(null)}
          sessionId={view.id}
          onRemove={canEdit && openCreature ? () => removeFromStatblock(openCreature.id) : null}
          size={canEdit && openCreature ? { value: looks.findSize(openCreature), onChange: (size) => void looks.sendSize(openCreature.id, size) } : null}
          cutout={canEdit && openCreature ? { value: looks.findIsCutout(openCreature), onChange: (isCutout) => void looks.sendCutout(openCreature, isCutout) } : null}
          hitPoints={canEdit && openCreature ? { value: openCreature.hitPoints, onChange: (change) => void looks.sendHitPointChange(openCreature, change) } : null}
          conditions={openCreature ? { value: openConditions, onChange: canEdit ? (change) => void changeConditions({ kind: "creature", id: openCreature.id }, openCreature.conditions, change) : null } : null}
          target={openCreature && myHeroName && moves.findPosition(openCreature) ? buildCreatureTargetControl(view.id, openCreature.id, targetId, myHeroName) : null}
          naming={canEdit && openCreature ? { value: openCreature.customName, onSave: (name) => renameCreature(openCreature.id, name) } : null}
        />
      </>
    ),
  };
}

type TrayProps = { sessionId: number; hasCreatures: boolean; hasWaiting: boolean; children: ReactNode };

function CreatureTray({ sessionId, hasCreatures, hasWaiting, children }: TrayProps) {
  const router = useModeRouter();
  const [isClearing, setIsClearing] = useState(false);
  const clearAll = async () => {
    if (!(await askToConfirm({ title: "Прибрати всіх істот?", description: "Зникнуть і з мапи, і з ряду під нею.", confirmLabel: "Прибрати всіх", isDestructive: true }))) return;
    setIsClearing(true);
    const result = await removeMapCreaturesAction(sessionId, null);
    setIsClearing(false);
    if (!result.ok) return void toast.error(result.error);
    router.refresh();
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <AddMapCreaturesDialog sessionId={sessionId} />
        {hasWaiting ? <ul aria-label="Істоти поза мапою" className="flex flex-wrap gap-3">{children}</ul> : null}
        {hasCreatures ? (
          <Button type="button" variant="ghost" onClick={clearAll} disabled={isClearing} className="ml-auto h-11 px-3 text-slate-400">
            Прибрати всіх
          </Button>
        ) : null}
      </div>
      {hasWaiting ? <p className="text-sm text-slate-400">Перетягніть істоту на мапу. Дотик відкриває статблок.</p> : null}
    </div>
  );
}

type FaceProps = { creature: MapCreatureView; size?: string | number; nameMode: TokenNameMode | null; isDimmed?: boolean; isTarget?: boolean; onBoard?: OnBoard | null; children?: ReactNode };

const CUTOUT_ALLY_OUTLINE = "filter [--tw-drop-shadow:drop-shadow(0_0_1px_theme(colors.emerald.400))_drop-shadow(0_0_2px_theme(colors.emerald.400))]";
const CUTOUT_ENEMY_OUTLINE = "filter [--tw-drop-shadow:drop-shadow(0_0_1px_theme(colors.rose.500))_drop-shadow(0_0_2px_theme(colors.rose.500))]";

export function CreatureTokenFace({ creature, size = TOKEN_SIZE_PX, nameMode, isDimmed, isTarget, onBoard = null, children }: FaceProps) {
  const isArtHidden = useIsArtHidden(creature.imageUrl, "manual");
  const src = isArtHidden ? null : creature.imageUrl;
  const isTurn = useIsCreatureTurn(creature.id);
  const { isCutout: isCutoutImage, inspectImage } = useCutoutImage(src);
  const isCutout = creature.isCutout && isCutoutImage && Boolean(onBoard) && !creature.isRoundImage;
  const labelWidth = onBoard?.labelWidth ?? (typeof size === "number" ? size : TOKEN_SIZE_PX);
  return (
    <div className={cn("flex flex-col items-center", !children && "pointer-events-none", isDimmed && "opacity-40")} title={creature.label}>
      <div className={cn("relative rounded-full", onBoard?.isHighlighted && HIGHLIGHT_RING_CLASS)} style={{ width: size, height: size }}>
        <div className={cn("relative h-full w-full rounded-full", isCutout ? (creature.isAlly ? CUTOUT_ALLY_OUTLINE : CUTOUT_ENEMY_OUTLINE) : cn("overflow-hidden border-2 bg-slate-900 shadow-lg shadow-black/50 ring-2 ring-slate-950/80", creature.isAlly ? "border-emerald-400" : "border-rose-500"), creature.isDown && "opacity-50 grayscale", isTurn && TURN_RING_CLASS)}>
          {src ? (
            <ContentImage src={src} alt="" provenance="manual" fill sizes="128px" draggable={false} onLoad={(event) => inspectImage(event.currentTarget)} className={creature.isRoundImage || isCutout ? "object-contain" : "object-cover object-top"} />
          ) : (
            <span aria-hidden className="grid h-full w-full place-items-center font-rpg-display text-slate-100" style={{ fontSize: typeof size === "number" ? Math.max(12, Math.round(size * 0.34)) : `calc(${size} * 0.34)` }}>
              {buildCreatureInitials(creature.label)}
            </span>
          )}
        </div>
        {creature.isDown ? <DownMark /> : null}
        {isTarget ? <span aria-hidden className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-dashed border-amber-300" /> : null}
        {creature.badge !== null ? (
          <span aria-hidden className={cn("absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-slate-950 px-1 text-xs leading-none text-slate-100 ring-1", creature.isAlly ? "ring-emerald-400" : "ring-rose-500")}>
            {creature.badge}
          </span>
        ) : null}
        {children}
      </div>
      <div className="flex flex-col items-center">
        {creature.hitPoints ? <div className="mt-1"><HitPointBar hitPoints={creature.hitPoints} width={labelWidth} /></div> : null}
        <TokenConditionMarks token={{ kind: "creature", id: creature.id }} conditions={creature.conditions} />
        {nameMode ? <TokenName name={creature.label} mode={nameMode} tokenSize={labelWidth} /> : null}
      </div>
    </div>
  );
}

function CreatureGhost({ ghost, creature, size, isTurned, isLeavingMap }: { ghost: TokenGhost<number>; creature: MapCreatureView; size: number; isTurned: boolean; isLeavingMap: boolean }) {
  return createPortal(
    <div
      className="pointer-events-none fixed z-[10000] flex flex-col items-center"
      style={{ left: ghost.clientX, top: ghost.clientY, transform: `translate(-50%, ${-size / 2}px)${isTurned ? " rotate(90deg)" : ""}`, transformOrigin: `50% ${size / 2}px` }}
      aria-hidden
    >
      <CreatureTokenFace creature={creature} size={size} nameMode={null} />
      {isLeavingMap ? <span className="mt-1 whitespace-nowrap rounded-full bg-rose-950/90 px-2 py-0.5 text-xs text-rose-100 shadow-lg shadow-black/50">Прибрати з мапи</span> : null}
    </div>,
    document.body,
  );
}

/// position null — істоту прибрано: майстер витягнув її з мапи.
function useCreatureMoves(view: GameSessionView) {
  const read = useOptimisticReader();
  const findPosition = (creature: MapCreatureView) => read(`creature-position:${creature.id}`, creature.token);
  const isRemoved = (creature: MapCreatureView) => read(`creature-removed:${creature.id}`, false);
  const show = (id: number, position: TokenPosition | null) => void showOptimistic(`creature-position:${id}`, position);

  const send = async (id: number, position: TokenPosition | null) => {
    const result = position
      ? await sendOptimistic(`creature-position:${id}`, position, () => moveMapCreatureAction(view.id, id, position))
      : await sendOptimistic(`creature-removed:${id}`, true, () => removeMapCreaturesAction(view.id, id));
    if (result.ok) captureGameEvent("game_creature_moved", { is_on_map: position !== null });
  };

  return { findPosition, isRemoved, show, send };
}

/// Розмір, хіти і показ імен майстер бачить одразу; правдою їх робить наступний стан кімнати з сервера.
function useCreatureLooks(view: GameSessionView) {
  const router = useModeRouter();
  const read = useOptimisticReader();
  const nameModeKey = `creature-name-mode:${view.id}`;
  const findHitPointsKey = (creature: MapCreatureView) => `creature-hp:${creature.id}`;
  const finish = (result: { ok: boolean }) => result.ok && router.refresh();

  const sendSize = async (id: number, size: CreatureTokenSize) => finish(await sendOptimistic(`creature-size:${id}`, size, () => setMapCreatureSizeAction(view.id, id, size)));
  const findCutoutKey = (creature: MapCreatureView) => `creature-cutout:${creature.ruleset}:${creature.creatureKey}`;
  const findIsCutout = (creature: MapCreatureView) => read(findCutoutKey(creature), creature.isCutout);
  const sendCutout = async (creature: MapCreatureView, isCutout: boolean) => finish(await sendOptimistic(findCutoutKey(creature), isCutout, () => setMapCreatureCutoutAction(view.id, creature.id, isCutout)));
  const applyPendingCutout = (creature: MapCreatureView): MapCreatureView => (findIsCutout(creature) === creature.isCutout ? creature : { ...creature, isCutout: !creature.isCutout });
  const sendNameMode = async (mode: TokenNameMode) => finish(await sendOptimistic(nameModeKey, mode, () => setCreatureNameModeAction(view.id, mode)));
  const sendHitPointChange = async (creature: MapCreatureView, change: HitPointChange) => {
    const next = applyHitPointChange(readOptimistic(findHitPointsKey(creature), creature.hitPoints), change);
    finish(await sendOptimistic(findHitPointsKey(creature), next ?? creature.hitPoints, () => changeMapCreatureHitPointsAction(view.id, creature.id, change)));
  };
  const applyPendingHitPoints = (creature: MapCreatureView): MapCreatureView => {
    const hitPoints = read(findHitPointsKey(creature), creature.hitPoints);
    return hitPoints === creature.hitPoints || !hitPoints ? creature : { ...creature, hitPoints, isDown: isCreatureDown(hitPoints) };
  };

  return {
    nameMode: read(nameModeKey, view.creatureNameMode),
    findSize: (creature: MapCreatureView) => read(`creature-size:${creature.id}`, creature.tokenSize),
    sendSize,
    findIsCutout,
    sendCutout,
    applyPendingCutout,
    sendNameMode,
    sendHitPointChange,
    applyPendingHitPoints,
  };
}

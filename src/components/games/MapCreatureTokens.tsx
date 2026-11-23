"use client";

import { createContext, useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { askToConfirm } from "@/components/ui/confirm-dialog";
import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";
import { CREATURE_BORDER_CLASSES, findCutoutOutlineClass, useCutoutImage } from "./token-cutout";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { moveMapCreatureAction, removeMapCreaturesAction, renameMapCreatureAction, setMapCreatureNameHiddenAction } from "@/lib/actions/game-sessions";
import { useAreaCastStore } from "@/lib/components/game/area-cast";
import { useMapTargetingStore } from "@/lib/components/game/map-targeting";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { NO_TOKEN_CONDITIONS, type TokenConditionChange, type TokenConditions } from "@/rules/token-conditions";
import type { HitPointChange } from "@/rules/creature-hit-points";
import type { FloorId } from "@/rules/game-floors";
import { shiftTokenPosition, type TokenPosition } from "@/rules/game-map";
import { findTokenArrowStep } from "@/rules/game-grid";
import { CREATURE_SIZE_CELLS, CREATURE_TOKEN_SIZE_SCALES, buildCreatureInitials, type CreatureBorderColor, type CreatureTokenSize, type MapCreatureView, type TokenNameMode } from "@/rules/game-map-creatures";
import type { GameSessionView } from "@/server/db/game-sessions";
import { CreatureTray } from "./CreatureTray";
import { SpotlightAura, findSpotlightRingClass, useIsCreatureTurn } from "./combat-turn";
import { DownMark, HitPointBar } from "./MapCreatureHitPoints";
import { buildCreatureTargetControl, useRollTargetCreatureId } from "./RollTargetControls";
import { TokenConditionMarks } from "./TokenConditionMarks";
import { useIsTokenInvisible, useSpotlightStyle, useShownConditions, useSpotlightControl, useTokenConditionChanges } from "./use-token-conditions";
import { CreatureSheet, CreatureTokenSettings, MapCreatureStatblockDialog, type CreatureControls } from "./MapCreatureStatblockDialog";
import { holdValueBefore, rememberUndo } from "./map-history";
import { readOptimistic, sendOptimistic, sendOptimisticMany, showOptimistic, useOptimisticReader } from "./optimistic-values";
import { useCreatureLooks } from "./use-creature-looks";
import { useTokenDrag, type TokenGhost } from "./use-token-drag";
import { TokenName } from "./TokenName";
import { TOKEN_SIZE_PX } from "./use-token-scale";
import { HIGHLIGHT_RING_CLASS, MapTokenSlot, OFF_FLOOR_CLASS, buildTokenSizeStyle, findBoardTokenSize, findGhostTokenSize, findLabelWidth, hasTokenNames, snapTokenPosition, type GroupTokenLook, type PlacedToken, type TokenDrag, type TokenGroupBinding, type TokenLayout, type TokenOnBoard } from "./MapTokenSlot";
import { GroupedTokenFrame, TokenTransformHandles, findTokenRotationStyle, scaleGhostSize, scaleTokenSize, type SelectedToken, type TokenSelection } from "./TokenTransformControls";

type Point = { clientX: number; clientY: number };

const NO_CREATURE_CONTROLS: CreatureControls = { onRemove: null, size: null, cutout: null, hitPoints: null, conditions: null, target: null, naming: null, borderColor: null };

type CreatureTokensInput = { view: GameSessionView; layout: TokenLayout; selection: TokenSelection; group: TokenGroupBinding; findDropPosition: (point: Point) => TokenPosition | null; isTurned: () => boolean };

/// Черга бою відкриває картку тієї ж мапи, у якій стоїть: у кімнаті й на весь екран — кожна свою.
export const OpenCreatureCardContext = createContext<((creatureId: number) => void) | null>(null);

/// Істот рухає й прибирає лише майстер; дотик без руху відкриває картку: майстру — зі статблоком, гравцю — без. Істоту в тумані гравець не бачить зовсім.
/// Майстрові перший дотик до істоти на мапі вибирає її для повороту й розміру, другий — відкриває картку.
export function useMapCreatureTokens({ view, layout, selection, group, findDropPosition, isTurned }: CreatureTokensInput) {
  const canEdit = view.myRole === "GM" && !view.isArchived;
  const moves = useCreatureMoves(view);
  const looks = useCreatureLooks(view);
  const changeConditions = useTokenConditionChanges(view.id, view.viewedSceneId);
  const targetId = useRollTargetCreatureId(view.id);
  const myHeroName = view.members.find((member) => member.userId === view.myUserId && member.persId !== null)?.persName ?? null;
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
      if (position && group.moveWith(findKey(id), position)) return;
      if (creature && (position || moves.findPosition(creature))) void moves.send(id, position, findLandingFloor(creature, position));
    },
    (point) => findDropPosition(point) !== null,
    (id) => tapCreature(id),
  );
  const router = useModeRouter();
  const renameCreature = async (id: number, name: string) => {
    const before = view.creatures.find((creature) => creature.id === id)?.customName ?? "";
    rememberUndo(view.viewedSceneId, `creature-name:${id}`, before, name, (restored) => renameCreature(id, restored));
    return refreshAfter(renameMapCreatureAction(view.id, id, name));
  };
  const refreshAfter = async (pending: Promise<{ ok: true } | { ok: false; error: string }>) => {
    const result = await pending;
    if (!result.ok) toast.error(result.error);
    else router.refresh();
    return result.ok;
  };
  /// Прибрану істоту не повернути кроком назад, тож клавіша, яку легко натиснути випадково, спершу питає.
  const removeAfterConfirm = async (creature: MapCreatureView) => {
    if (await askToConfirm({ title: `Прибрати «${creature.label}»?`, description: "Істота зникне і з мапи, і з ряду під нею.", confirmLabel: "Прибрати", isDestructive: true })) void moves.send(creature.id, null);
  };
  const removeFromStatblock = (id: number) => {
    setOpenId(null);
    void moves.send(id, null);
  };
  const shown = view.creatures.filter((creature) => !moves.isRemoved(creature)).map(looks.applyPendingHitPoints).map(looks.applyPendingLook);
  const waiting = shown.filter((creature) => !moves.findPosition(creature));
  const dragged = ghost ? shown.find((creature) => creature.id === ghost.id) : undefined;
  const openCreature = shown.find((creature) => creature.id === openId) ?? null;
  const openConditions = useShownConditions({ kind: "creature", id: openCreature?.id ?? 0 }, openCreature?.conditions ?? NO_TOKEN_CONDITIONS);
  const buildControls = (creature: MapCreatureView | null, conditions: TokenConditions): CreatureControls => {
    if (!creature) return NO_CREATURE_CONTROLS;
    const editable = <Control,>(control: Control) => (canEdit ? control : null);
    return {
      onRemove: editable(() => removeFromStatblock(creature.id)),
      size: editable({ value: looks.findSize(creature), onChange: (size: CreatureTokenSize) => void looks.sendSize(creature.id, size) }),
      cutout: editable({ value: looks.findIsCutout(creature), onChange: (isCutout: boolean) => void looks.sendCutout(creature, isCutout) }),
      hitPoints: editable({ value: creature.hitPoints, onChange: (change: HitPointChange) => void looks.sendHitPointChange(creature, change) }),
      conditions: { value: conditions, onChange: editable((change: TokenConditionChange) => void changeConditions({ kind: "creature", id: creature.id }, creature.conditions, change)) },
      target: myHeroName && moves.findPosition(creature) ? buildCreatureTargetControl(view.id, creature.id, targetId, myHeroName) : null,
      naming: editable({ value: creature.customName, isHidden: creature.isNameHidden, onSave: (name: string) => renameCreature(creature.id, name), onHiddenChange: (isHidden: boolean) => refreshAfter(setMapCreatureNameHiddenAction(view.id, creature.id, isHidden)) }),
      borderColor: editable({ value: creature.borderColor, onChange: (color: CreatureBorderColor) => void looks.sendBorderColor(creature, color) }),
    };
  };

  const isOffFloor = (creature: MapCreatureView) => {
    const at = moves.findPosition(creature);
    return at !== null && layout.floors.isOffFloor({ at, floor: moves.findFloor(creature) });
  };
  const findLandingFloor = (creature: MapCreatureView | undefined, to: TokenPosition | null) => (creature && to && !isOffFloor(creature) ? layout.floors.findLanding(to) : undefined);
  const isShownOnMap = (creature: MapCreatureView) => {
    const position = moves.findPosition(creature);
    return position !== null && !layout.isHidden(position, findCells(creature)) && (canEdit || !isOffFloor(creature));
  };
  const findKey = (id: number) => `creature-${id}`;
  const tapCreature = (id: number) => {
    const creature = shown.find((candidate) => candidate.id === id);
    if (creature && moves.findPosition(creature)) selection.tap(findKey(id), () => openStatblock(id));
    else openStatblock(id);
  };
  const selectedCreature = canEdit ? shown.find((creature) => findKey(creature.id) === selection.key && isShownOnMap(creature)) : undefined;
  const spotlight = useSpotlightControl(view.id, view.viewedSceneId, selectedCreature ? { kind: "creature", id: selectedCreature.id } : null, selectedCreature?.conditions ?? NO_TOKEN_CONDITIONS);
  const selectedConditions = useShownConditions({ kind: "creature", id: selectedCreature?.id ?? 0 }, selectedCreature?.conditions ?? NO_TOKEN_CONDITIONS);
  const selectedControls = buildControls(selectedCreature ?? null, selectedConditions);
  const selected: SelectedToken | null = selectedCreature
    ? {
        key: findKey(selectedCreature.id),
        name: selectedCreature.label,
        transform: looks.findTransform(selectedCreature),
        openLabel: "Статблок і стани",
        onOpen: () => openStatblock(selectedCreature.id),
        onPreview: (transform) => looks.showTransform(selectedCreature.id, transform),
        onChange: (transform) => void looks.sendTransform(selectedCreature.id, transform),
        lightTarget: { kind: "creature", creature: selectedCreature },
        spotlight,
        sheetLabel: "Статблок",
        sheet: <CreatureSheet creature={selectedCreature} controls={selectedControls} />,
        showRoomSheet: null,
        remove: () => void removeAfterConfirm(selectedCreature),
        settings: <CreatureTokenSettings creature={selectedCreature} sessionId={view.id} controls={selectedControls} />,
      }
    : null;
  const placed: PlacedToken[] = shown.filter(isShownOnMap).map((creature) => ({ key: `creature-${creature.id}`, creatureId: creature.id, name: creature.label, position: moves.findPosition(creature)!, cells: findCells(creature) }));
  const draggedFrom = dragged ? moves.findPosition(dragged) : null;
  const drag: TokenDrag | null = ghost && dragged ? { key: findKey(dragged.id), from: draggedFrom, to: findSnappedDrop(dragged, ghost), cells: findCells(dragged), ghostPx: scaleGhostSize(findGhostTokenSize(layout, findCells(dragged), CREATURE_TOKEN_SIZE_SCALES[looks.findSize(dragged)]), looks.findTransform(dragged)) } : null;

  const renderToken = (creature: MapCreatureView, size: string | number, shownName: TokenNameMode | null, onBoard: TokenOnBoard | null, handles: ReactNode = null) => {
    const position = moves.findPosition(creature);
    const onKeyDown = (event: KeyboardEvent) => {
      const step = findTokenArrowStep(event.key, layout.frame);
      if (step && position) moves.show(creature.id, shiftTokenPosition(position, step));
      else if ((event.key === "Enter" || event.key === " ") && position) tapCreature(creature.id);
      else if (event.key === "Escape" && handles) selection.select(null);
      else if (event.key === "Enter" || event.key === " ") {
        const spot = layout.findFreeSpot();
        void moves.send(creature.id, spot, findLandingFloor(creature, spot));
      }
      else if (event.key === "Delete" || event.key === "Backspace") void removeAfterConfirm(creature);
      else return;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (findTokenArrowStep(event.key, layout.frame) && position) void moves.send(creature.id, snapTokenPosition(position, layout, findCells(creature)));
    };
    const status = `${creature.hitPoints ? `, хіти ${creature.hitPoints.current} з ${creature.hitPoints.max}` : ""}${creature.isDown ? ", повалений" : ""}${creature.id === targetId ? ", ціль" : ""}`;
    const hint = canEdit ? (position ? "Дотик — вибрати для повороту й розміру, ще дотик — статблок і стани; тягніть або рухайте стрілками; Delete — прибрати" : "Перетягніть на мапу або натисніть Enter") : "Відкрити картку істоти";
    return (
      <CreatureTokenFace creature={creature} size={size} nameMode={shownName} isDimmed={ghost?.id === creature.id} isTarget={creature.id === targetId} onBoard={onBoard}>
        <button
          type="button"
          aria-label={`Токен «${creature.label}»${status}. ${hint}`}
          className={cn("absolute inset-0 rounded-full", canEdit && "cursor-grab touch-none active:cursor-grabbing")}
          data-token-tap={canEdit && onBoard ? findKey(creature.id) : undefined}
          {...(canEdit ? { onKeyDown, onKeyUp, ...bindToken(creature.id) } : { onClick: () => openStatblock(creature.id) })}
        />
        {handles}
      </CreatureTokenFace>
    );
  };

  return {
    openStatblock,
    remove: (id: number) => void moves.send(id, null),
    ghost,
    drag,
    placed,
    selected,
    hasPlaced: placed.length > 0,
    findGroupLook: (key: string): GroupTokenLook | null => {
      const creature = shown.find((candidate) => findKey(candidate.id) === key);
      return creature ? { token: { kind: "creature", id: creature.id }, conditions: creature.conditions, transform: looks.findTransform(creature), showTransform: (transform) => looks.showTransform(creature.id, transform), sendTransform: (transform) => void looks.sendTransform(creature.id, transform) } : null;
    },
    waitingCount: canEdit ? waiting.length : 0,
    names: canEdit && placed.length > 0 ? { mode: looks.nameMode, onChange: looks.sendNameMode } : null,
    tray: canEdit ? (
      <CreatureTray sessionId={view.id} hasCreatures={shown.length > 0} hasWaiting={waiting.length > 0}>
        {waiting.map((creature) => <li key={creature.id}>{renderToken(creature, TOKEN_SIZE_PX, "short", null)}</li>)}
      </CreatureTray>
    ) : null,
    mapTokens: shown.filter(isShownOnMap).map((creature) => {
      const position = moves.findPosition(creature)!;
      const sizeScale = CREATURE_TOKEN_SIZE_SCALES[looks.findSize(creature)];
      const transform = looks.findTransform(creature);
      const size = scaleTokenSize(findBoardTokenSize(layout, findCells(creature), sizeScale), transform);
      const isSelected = selected?.key === findKey(creature.id);
      const isGrouped = group.isGrouped(findKey(creature.id));
      const handles = isSelected && selected ? <TokenTransformHandles token={selected} onDeselect={() => selection.select(null)} /> : isGrouped ? <GroupedTokenFrame rotation={transform.rotation} /> : null;
      return (
        <MapTokenSlot key={creature.id} position={position} size={size} isGroupFollower={isGrouped && ghost?.id !== creature.id} className={cn(isSelected ? "z-[33]" : canEdit ? "z-[11]" : "z-10", layout.revealClassName, isOffFloor(creature) && OFF_FLOOR_CLASS)}>
          {renderToken(creature, size, hasTokenNames(layout, findCells(creature)) ? looks.nameMode : null, { screenPx: scaleGhostSize(findGhostTokenSize(layout, findCells(creature), sizeScale), transform), labelWidth: findLabelWidth(layout, sizeScale), isHighlighted: layout.isHighlighted(position, findCells(creature)), isOutlined: layout.isCutoutOutlined, rotation: transform.rotation }, handles)}
        </MapTokenSlot>
      );
    }),
    overlay: (
      <>
        {ghost && dragged ? (
          <CreatureGhost ghost={ghost} creature={dragged} size={drag?.ghostPx ?? 0} labelWidth={findLabelWidth(layout, CREATURE_TOKEN_SIZE_SCALES[looks.findSize(dragged)])} rotation={looks.findTransform(dragged).rotation} isOutlined={layout.isCutoutOutlined} isTurned={isTurned()} isLeavingMap={!ghost.isOverTarget && draggedFrom !== null} />
        ) : null}
        <MapCreatureStatblockDialog creature={openCreature} onClose={() => setOpenId(null)} sessionId={view.id} controls={buildControls(openCreature, openConditions)} />
      </>
    ),
  };
}

type FaceProps = { creature: MapCreatureView; size?: string | number; nameMode: TokenNameMode | null; isDimmed?: boolean; isTarget?: boolean; onBoard?: TokenOnBoard | null; children?: ReactNode };


export function CreatureTokenFace({ creature, size = TOKEN_SIZE_PX, nameMode, isDimmed, isTarget, onBoard = null, children }: FaceProps) {
  const isArtHidden = useIsArtHidden(creature.imageUrl, "manual");
  const src = isArtHidden ? null : creature.imageUrl;
  const isTurn = useIsCreatureTurn(creature.id);
  const spotlight = useSpotlightStyle({ kind: "creature", id: creature.id }, creature.conditions);
  const isInvisible = useIsTokenInvisible({ kind: "creature", id: creature.id }, creature.conditions);
  const { isCutout: isCutoutImage, inspectImage } = useCutoutImage(src);
  const isCutout = creature.isCutout && isCutoutImage && Boolean(onBoard) && !creature.isRoundImage;
  const border = CREATURE_BORDER_CLASSES[creature.borderColor ?? "default"];
  const labelWidth = onBoard?.labelWidth ?? (typeof size === "number" ? size : TOKEN_SIZE_PX);
  return (
    <div className={cn("flex flex-col items-center", !children && "pointer-events-none", isInvisible && "opacity-50", isDimmed && "opacity-40")} title={creature.label}>
      <div className={cn("relative isolate rounded-full", onBoard?.isHighlighted && HIGHLIGHT_RING_CLASS)} style={buildTokenSizeStyle(size)}>
        <SpotlightAura style={spotlight} />
        <div className={cn("relative h-full w-full rounded-full", isCutout ? findCutoutOutlineClass(creature.borderColor ?? "other", Boolean(onBoard?.isOutlined)) : cn("overflow-hidden border-2 bg-slate-900 shadow-lg shadow-black/50 ring-2 ring-slate-950/80", border.border), creature.isDown && "opacity-50 grayscale", findSpotlightRingClass(isTurn, spotlight))} style={findTokenRotationStyle(onBoard?.rotation ?? 0)}>
          {src ? (
            <ContentImage src={src} alt="" provenance="manual" fill sizes={`${Math.max(128, Math.round(onBoard?.screenPx ?? 0))}px`} draggable={false} onLoad={(event) => inspectImage(event.currentTarget)} className={creature.isRoundImage || isCutout ? "object-contain" : "object-cover object-top"} />
          ) : (
            <span aria-hidden className="grid h-full w-full place-items-center font-rpg-display text-slate-100" style={{ fontSize: typeof size === "number" ? Math.max(12, Math.round(size * 0.34)) : `calc(${size} * 0.34)` }}>
              {buildCreatureInitials(creature.label)}
            </span>
          )}
        </div>
        {creature.isDown ? <DownMark /> : null}
        {isTarget ? <span aria-hidden className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-dashed border-amber-300" /> : null}
        {creature.badge !== null ? (
          <span aria-hidden className={cn("absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-slate-950 px-1 text-xs leading-none text-slate-100 ring-1", border.badge)}>
            {creature.badge}
          </span>
        ) : null}
        {children}
      </div>
      <div className="flex flex-col items-center">
        {creature.hitPoints ? <div className="mt-1"><HitPointBar hitPoints={creature.hitPoints} width={labelWidth} /></div> : null}
        {spotlight ? <span className="sr-only">Підсвічено</span> : null}
        <TokenConditionMarks token={{ kind: "creature", id: creature.id }} conditions={creature.conditions} />
        {nameMode ? <TokenName name={creature.label} mode={nameMode} tokenSize={labelWidth} /> : null}
      </div>
    </div>
  );
}

type GhostProps = { ghost: TokenGhost<number>; creature: MapCreatureView; size: number; labelWidth: number; rotation: number; isOutlined: boolean; isTurned: boolean; isLeavingMap: boolean };

function CreatureGhost({ ghost, creature, size, labelWidth, rotation, isOutlined, isTurned, isLeavingMap }: GhostProps) {
  return createPortal(
    <div
      className="pointer-events-none fixed z-[10000] flex flex-col items-center"
      style={{ left: ghost.clientX, top: ghost.clientY, transform: `translate(-50%, ${-size / 2}px)${isTurned ? " rotate(90deg)" : ""}`, transformOrigin: `50% ${size / 2}px` }}
      aria-hidden
    >
      <CreatureTokenFace creature={creature} size={size} nameMode={null} onBoard={{ screenPx: size, labelWidth, isHighlighted: false, isOutlined, rotation }} />
      {isLeavingMap ? <span className="mt-1 whitespace-nowrap rounded-full bg-rose-950/90 px-2 py-0.5 text-xs text-rose-100 shadow-lg shadow-black/50">Прибрати з мапи</span> : null}
    </div>,
    document.body,
  );
}

export const findCreaturePositionKey = (id: number) => `creature-position:${id}`;

/// position null — істоту прибрано: майстер витягнув її з мапи.
function useCreatureMoves(view: GameSessionView) {
  const read = useOptimisticReader();
  const findPosition = (creature: MapCreatureView) => read(findCreaturePositionKey(creature.id), creature.token);
  const findFloor = (creature: MapCreatureView): FloorId => read(`creature-floor:${creature.id}`, creature.floor);
  const isRemoved = (creature: MapCreatureView) => read(`creature-removed:${creature.id}`, false);
  const findPositionById = (id: number) => readOptimistic(findCreaturePositionKey(id), view.creatures.find((creature) => creature.id === id)?.token ?? null);
  const show = (id: number, position: TokenPosition | null) => {
    holdValueBefore(findCreaturePositionKey(id), findPositionById(id));
    showOptimistic(findCreaturePositionKey(id), position);
  };

  /// Скасовуємо лише крок по мапі: прибрану істоту й першу постановку з лотка відміняє окрема дія.
  const send = async (id: number, position: TokenPosition | null, floor?: FloorId) => {
    const before = findPositionById(id);
    if (before && position) rememberUndo(view.viewedSceneId, findCreaturePositionKey(id), before, position, (restored) => send(id, restored));
    const result = position
      ? await sendOptimisticMany(floor === undefined ? { [findCreaturePositionKey(id)]: position } : { [findCreaturePositionKey(id)]: position, [`creature-floor:${id}`]: floor }, () => moveMapCreatureAction(view.id, id, position, floor))
      : await sendOptimistic(`creature-removed:${id}`, true, () => removeMapCreaturesAction(view.id, id));
    if (result.ok) captureGameEvent("game_creature_moved", { is_on_map: position !== null });
  };

  return { findPosition, findFloor, isRemoved, show, send };
}

/// Розмір, хіти і показ імен майстер бачить одразу; правдою їх робить наступний стан кімнати з сервера.

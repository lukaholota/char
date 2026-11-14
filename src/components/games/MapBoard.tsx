"use client";

import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { castOnArea, dropAreaCast, placeAreaCast, registerReadyMapBoard, useAreaCastStore } from "@/lib/components/game/area-cast";
import { describeTargetSave, findPressedTargetSave } from "@/lib/components/dice/roll-contexts";
import { useMapTargetingStore } from "@/lib/components/game/map-targeting";
import { cn } from "@/lib/utils";
import { AREA_SHAPE_LABELS, findAreaTip, isPointInArea, isTokenInArea, type AreaPlacement } from "@/rules/game-areas";
import { applyFogChange, isPointHidden, type FogStroke, type SceneFog } from "@/rules/game-fog";
import { findFreeCellNear, measureGridFeet, snapToHalfCell, type MapFrame } from "@/rules/game-grid";
import { isTokenSeen } from "@/rules/game-lighting";
import { findMapShareInRect, findTokenPositionInRect, type TokenPosition } from "@/rules/game-map";
import type { TokenNameMode } from "@/rules/game-map-creatures";
import { collectClosedLines } from "@/rules/game-walls";
import type { GameSessionView } from "@/server/db/game-sessions";
import { AreaPanel, type AreaStart } from "./AreaToolPanel";
import { useHeroTokens, type TokenMoves } from "./HeroTokens";
import { HeroTokenTray } from "./HeroTokenTray";
import { OpenCreatureCardContext, useMapCreatureTokens } from "./MapCreatureTokens";
import { MapTargetingPanel, MapTargetPicks, MapTaskHint } from "./MapTargeting";
import { MapAreasLayer, MapFogLayer, MapGridLayer, MapHandle, MapLabel, MapMeasureLayer, type AreaLook } from "./MapOverlay";
import type { TokenLayout } from "./MapTokenSlot";
import { FoldSection, MapToolRow, MapZoomControls } from "./MapToolbar";
import { FogPanel, GridPanel, RulerPanel, ViewPanel } from "./MapToolPanels";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { CompactCombatContext } from "./CombatTracker";
import { DrawPanel, MapDrawingsLayer } from "./MapDrawings";
import { LightPanel, MapLightMarkers, MapSight, TokenLightRows } from "./MapLighting";
import { MapObjectsLayer, ObjectsPanel } from "./MapObjects";
import { MapPings, pingMap } from "./MapPings";
import { MapDoorButtons, MapWallsLayer, WallsPanel } from "./MapWalls";
import { ToolPanelSlotContext, useRoomTabStore } from "./room-tabs";
import { useSharedBoard } from "./shared-board";
import { useMapHistory } from "./map-history";
import { useElementWidth } from "./use-element-width";
import { useMapDrawings } from "./use-map-drawings";
import { useMapLights, useTokenLights } from "./use-map-lights";
import { useMapObjects } from "./use-map-objects";
import { usePartySight, useWallSight } from "./use-map-sight";
import { useMapWalls } from "./use-map-walls";
import { useAreaTool, useFogTool, useGridTool, useRulerTool, type MapTool } from "./use-map-tools";
import { useMapViewport } from "./use-map-viewport";
import { useGridDraft, useSceneTools } from "./use-scene-tools";
import { TokenTransformPanel, useTokenSelection } from "./TokenTransformControls";

type Point = { clientX: number; clientY: number };
/// Ширину міряє контейнер мапи, а не екран: та сама розкладка працює в кімнаті, на весь екран і в повернутому діалозі.
/// Інструменти й масштаб лежать на правому краї мапи. Панель інструмента на компʼютері відкривається в бічній колонці кімнати;
/// де її нема — вузько під мапою, широко праворуч від неї. Стрічка бою — над мапою. Порожня доріжка не забирає місця в мапи.
const LAYOUT = {
  root: "grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] [@container(min-width:40rem)]:grid-cols-[minmax(0,1fr)_auto] [@container(min-width:40rem)]:grid-rows-[auto_minmax(0,1fr)]",
  stage: "relative row-start-2 min-h-0 min-w-0 [@container(min-width:40rem)]:col-start-1 [@container(min-width:40rem)]:m-2",
  side: "contents [@container(min-width:40rem)]:col-start-2 [@container(min-width:40rem)]:row-start-1 [@container(min-width:40rem)]:row-span-2 [@container(min-width:40rem)]:flex [@container(min-width:40rem)]:min-h-0 [@container(min-width:40rem)]:w-[17.5rem] [@container(min-width:40rem)]:flex-col [@container(min-width:40rem)]:gap-2 [@container(min-width:40rem)]:overflow-y-auto [@container(min-width:40rem)]:overscroll-contain [@container(min-width:40rem)]:py-2 [@container(min-width:40rem)]:pr-2",
  combat: "row-start-1 min-w-0 px-2 pt-2 empty:hidden [@container(min-width:40rem)]:col-start-1",
  panel: "row-start-3 max-h-[38dvh] overflow-y-auto overscroll-contain p-2 [@container(min-width:40rem)]:max-h-none [@container(min-width:40rem)]:overflow-visible [@container(min-width:40rem)]:p-0",
};

const clampShare = (point: TokenPosition) => ({ x: Math.min(1, Math.max(0, point.x)), y: Math.min(1, Math.max(0, point.y)) });
const isInsideRect = (point: Point, rect: DOMRect) => point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom;
/// Мазок пензля видно під пальцем ще до відповіді сервера, разом з усім туманом.
function findShownFog(fog: SceneFog | null, stroke: FogStroke | null) {
  const next = stroke ? applyFogChange(fog, { kind: "area", area: stroke }) : fog;
  return next === "too_many" ? fog : next;
}

export type MapBoardProps = {
  view: GameSessionView;
  moves: TokenMoves;
  tokenScale: number;
  onTokenScaleChange: (scale: number) => void;
  heroNames: { mode: TokenNameMode; onChange: (mode: TokenNameMode) => void };
  cutoutOutline: { isOn: boolean; onChange: (isOn: boolean) => void };
  partyPortraits: { isOn: boolean; onChange: (isOn: boolean) => void };
  mapImageUrl: string;
  stageTop?: ReactNode;
  combat?: ReactNode;
  isCombatOverMap: boolean;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  turn?: { isTurned: boolean; toggle: () => void };
};

/// Мапа забирає все місце свого контейнера; керування сценою, лоток і масштаб лежать поверх неї.
export function MapBoard({ view, moves, tokenScale, onTokenScaleChange, heroNames, cutoutOutline, partyPortraits, mapImageUrl, stageTop, combat, isCombatOverMap, onFullscreen, isFullscreen, turn }: MapBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [isBroken, setIsBroken] = useState(false);
  const { tool, setTool, area: areaStore, skippedKeys, setSkippedKeys, replacedAreaId } = useSharedBoard();
  const [isFogPreview, setIsFogPreview] = useState(false);
  const targeting = useMapTargetingStore((state) => (state.targeting?.sessionId === view.id ? state.targeting : null));
  const canEditScene = view.myRole === "GM" && !view.isArchived;
  const scene = useSceneTools(view);
  const gridDraft = useGridDraft(view);
  const grid = gridDraft.grid;
  const frame: MapFrame | null = aspect && grid ? { aspect, grid } : null;
  const boardWidth = useElementWidth(boardRef);

  const isQuarterTurned = () => Boolean(turn?.isTurned) && window.matchMedia("(orientation: portrait)").matches;
  const toShare = (point: Point) => {
    const rect = boardRef.current?.getBoundingClientRect();
    return rect ? findMapShareInRect(point, rect, isQuarterTurned()) : null;
  };
  const ruler = useRulerTool(toShare, frame);
  const fogTool = useFogTool(toShare, frame, aspect, (change) => void scene.changeFog(change));
  const fog = findShownFog(scene.fog, fogTool.stroke);
  const history = useMapHistory(view.viewedSceneId);
  const gridTool = useGridTool(toShare, aspect, grid, gridDraft.changeGrid);
  const area = useAreaTool(areaStore, toShare, frame, scene.saveArea);
  const drawings = useMapDrawings(view, toShare, aspect);
  const isEditingWalls = tool === "walls" && canEditScene;
  const walls = useMapWalls({ view, toShare, frame, aspect, isEditing: isEditingWalls });
  const gesture = tool === "walls" ? walls.gesture : tool === "ruler" ? ruler.gesture : tool === "draw" ? drawings.gesture : tool === "fog" ? fogTool.gesture : tool === "grid" ? gridTool.gesture : tool === "area" ? area.gesture : null;

  const selection = useTokenSelection(tool === null && !targeting);
  const openTappedArea = (point: Point) => {
    if (isEditingWalls && walls.mode === "edit") return walls.chooseAt(point);
    selection.select(null);
    objects.choose(null);
    lights.choose(null);
    if (targeting) return;
    const at = toShare(point);
    const hit = frame && at ? [...scene.areas].reverse().find((candidate) => isPointInArea(at, candidate, frame)) : undefined;
    if (hit) {
      area.open(hit, canEditScene || (!view.isArchived && hit.userId === view.myUserId));
      setTool("area");
    } else if (area.draft && !area.draft.canEdit) area.close();
  };
  const pingHeldPoint = (point: Point) => {
    const at = toShare(point);
    if (at && !view.isArchived && at.x >= 0 && at.x <= 1 && at.y >= 0 && at.y <= 1) pingMap(view, at);
  };
  const maxZoom = grid ? Math.min(12, Math.max(5, grid.columns / 6)) : 5;
  const viewport = useMapViewport({ boardRef, isTurned: isQuarterTurned, maxZoom, gesture, onTap: openTappedArea, onHold: pingHeldPoint });

  const findDropPosition = (point: Point) => {
    const viewportRect = viewport.viewportRef.current?.getBoundingClientRect();
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || (viewportRect && !isInsideRect(point, viewportRect))) return null;
    const trayRect = trayRef.current?.getBoundingClientRect();
    if (trayRect && isInsideRect(point, trayRect)) return null;
    return findTokenPositionInRect(point, rect, isQuarterTurned());
  };
  const isEditingLights = tool === "light" && canEditScene;
  const lights = useMapLights({ view, isEditing: isEditingLights, findDropPosition, findViewCentre: () => findViewCentre() });
  const tokenLights = useTokenLights(view);
  const wallSight = useWallSight(view.myRole === "GM" ? collectClosedLines(walls.shown) : view.sightLines, aspect);
  const isFogPreviewOn = isFogPreview && (tool === "fog" || tool === "light");
  const hidesForMe = fog !== null && (view.myRole !== "GM" || isFogPreviewOn);
  const activeArea = tool === "area" ? (area.draft?.placement ?? null) : null;
  const layout: TokenLayout = {
    cellPx: grid && boardWidth ? boardWidth / grid.columns : null,
    scale: tokenScale,
    zoom: viewport.zoom,
    frame,
    isHidden: (position) => hidesForMe && isPointHidden(position, fog, aspect ?? 1),
    isHighlighted: (position, cells) => Boolean(frame && activeArea && isTokenInArea(position, cells, activeArea, frame)),
    isCutoutOutlined: cutoutOutline.isOn,
    findFreeSpot: () => findFreeCellNear(findViewCentre(), [...heroes.placed, ...creatures.placed].map((token) => token.position), frame),
  };
  const heroes = useHeroTokens({ view, moves, layout, nameMode: heroNames.mode, selection, findDropPosition, isTurned: isQuarterTurned, blocksMove: view.myRole !== "GM" && lights.lighting !== "off" ? wallSight.blocksMove : null });
  const { sight, fading: fadingSight, eyes } = usePartySight({ view, heroes, moves, lights, tokenLights, frame, aspect, walls: wallSight });
  const sightHidesForMe = sight !== null && (view.myRole !== "GM" || isFogPreviewOn);
  const creatureLayout: TokenLayout = {
    ...layout,
    isHidden: (position, cells) => layout.isHidden(position, cells) || (sightHidesForMe && !isTokenSeen(position, cells, sight, frame)),
    revealClassName: sightHidesForMe ? "map-sight-reveal" : undefined,
  };
  const creatures = useMapCreatureTokens({ view, layout: creatureLayout, selection, findDropPosition, isTurned: isQuarterTurned });
  const isEditingObjects = tool === "objects" && canEditScene;
  const objects = useMapObjects({ view, isEditing: isEditingObjects, gridColumns: grid?.columns ?? null, findDropPosition, findViewCentre: () => findViewCentre() });
  const selectedToken = heroes.selected ?? creatures.selected;

  const changeTool = (next: MapTool | null) => {
    if (next !== "area") area.close();
    if (cast) dropAreaCast();
    if (tool === "ruler") ruler.clear();
    if (tool === "grid") gridDraft.dropDraft();
    setIsFogPreview(false);
    selection.select(null);
    objects.choose(null);
    lights.choose(null);
    walls.reset();
    setTool(next);
  };
  const findViewCentre = () => {
    const rect = viewport.viewportRef.current?.getBoundingClientRect();
    const at = rect?.width ? toShare({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }) : null;
    return at ? clampShare(at) : { x: 0.5, y: 0.5 };
  };
  const startArea = (start: AreaStart, earlier?: AreaPlacement) => {
    const myHero = view.members.find((member) => member.userId === view.myUserId && member.persId !== null);
    const heroAt = myHero ? moves.findPosition(myHero) : null;
    const origin = earlier?.origin ?? (start.shape !== "circle" && heroAt ? heroAt : findViewCentre());
    area.setDraft({ id: null, canEdit: true, placement: { ...start, origin: frame ? snapToHalfCell(origin, frame) : origin, angle: earlier?.angle ?? 0 } });
  };
  /// Гравець часто ставить зону інструментом ще до касту: каст бере її місце, а не скидає в центр.
  const findMyEarlierArea = (start: AreaStart): { id: number | null; placement: AreaPlacement } | null => {
    const isSameArea = (placement: AreaPlacement) => placement.shape === start.shape && placement.sizeFeet === start.sizeFeet;
    if (area.draft && isSameArea(area.draft.placement)) return area.draft;
    const saved = [...scene.areas].reverse().find((candidate) => candidate.userId === view.myUserId && isSameArea(candidate));
    return saved ? { id: saved.id, placement: saved } : null;
  };
  const removeArea = (areaId: number | null) => {
    void scene.removeAreas(areaId);
    if (areaId === null || areaId === area.draft?.id) area.close();
  };

  const castState = useAreaCastStore((state) => state.cast);
  const isDiceTrayOpen = useDiceUIStore((state) => state.isOpen);
  const cast = castState?.isPlaced && castState.sessionId === view.id && tool === "area" && area.draft?.id === null ? castState : null;
  const hasFrame = frame !== null;
  const hasImage = aspect !== null;
  useEffect(() => (hasImage ? registerReadyMapBoard(view.id, hasFrame) : undefined), [hasImage, hasFrame, view.id]);
  useEffect(() => {
    const placed = hasFrame && castState && !castState.isPlaced ? placeAreaCast(view.id) : null;
    if (!placed) return;
    setSkippedKeys([]);
    changeTool("area");
    const start = { shape: placed.area.shape, sizeFeet: placed.area.sizeFeet, label: placed.area.name };
    const earlier = findMyEarlierArea(start);
    replacedAreaId.current = earlier?.id ?? null;
    startArea(start, earlier?.placement);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зону ставить лише новий каст, а не кожен рендер мапи
  }, [castState, hasFrame, view.id]);
  const isTargeting = targeting !== null;
  useEffect(() => {
    if (isTargeting) changeTool(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- інструмент закриває лише початок вибору цілі
  }, [isTargeting]);

  const anyGhost = heroes.ghost ?? creatures.ghost;
  const drag = heroes.drag ?? creatures.drag;
  const move = frame && drag?.from && drag.to ? { from: drag.from, to: drag.to, sizeCells: drag.cells } : null;
  const tokensInArea = [...heroes.placed, ...creatures.placed].filter((token) => layout.isHighlighted(token.position, token.cells));
  const castSave = cast ? findPressedTargetSave(cast.roll) : undefined;
  const castTokens = tokensInArea.filter((token) => !skippedKeys.includes(token.key));
  const castTargets = { creatureIds: castTokens.flatMap((token) => (token.creatureId === undefined ? [] : [token.creatureId])), persIds: castTokens.flatMap((token) => (token.persId === undefined ? [] : [token.persId])) };
  const toggleCastTarget = (key: string) => setSkippedKeys((keys) => (keys.includes(key) ? keys.filter((skipped) => skipped !== key) : [...keys, key]));
  const castSpell = () => {
    if (!cast) return;
    if (replacedAreaId.current !== null) void scene.removeAreas(replacedAreaId.current);
    replacedAreaId.current = null;
    void area.share();
    castOnArea(cast, castTargets);
    setTool(null);
    area.close();
  };
  const isToolGesture = gesture !== null;
  const isShiftingGrid = tool === "grid" && gridTool.mode === "shift";
  const areTokensBlocked = isToolGesture && !isShiftingGrid;
  const leaveGridOnToken = isShiftingGrid ? () => changeTool(null) : undefined;
  const canTurn = turn && (turn.isTurned || (aspect ?? 0) > 1) ? turn : null;
  const areaLooks: Array<{ key: string | number; area: AreaPlacement; look: AreaLook }> = scene.areas.filter((saved) => saved.id !== area.draft?.id || tool !== "area").map((saved) => ({ key: saved.id, area: saved, look: "saved" }));
  if (tool === "area" && area.draft) areaLooks.push({ key: "active", area: area.draft.placement, look: area.draft.id === null ? "draft" : "selected" });

  const panel =
    tool === "ruler" ? <RulerPanel hasGrid={frame !== null} distanceFeet={ruler.ruler && frame ? measureGridFeet(ruler.ruler.from, ruler.ruler.to, frame) : null} isGm={canEditScene} onClose={() => changeTool(null)} />
    : tool === "area" ? (
      <AreaPanel
        sessionId={view.id}
        hasGrid={frame !== null}
        isGm={canEditScene}
        draft={area.draft}
        targets={tokensInArea}
        savedCount={scene.areas.length}
        onStart={startArea}
        onChange={(placement) => area.change(placement, true)}
        onShare={() => void area.share()}
        onRemove={removeArea}
        onDone={() => changeTool(null)}
        onClose={() => changeTool(null)}
        cast={castSave ? { save: describeTargetSave(castSave), skippedKeys, onToggle: toggleCastTarget, onCast: castSpell } : undefined}
      />
    )
    : isEditingWalls ? <WallsPanel walls={walls} history={history} onClose={() => changeTool(null)} />
    : isEditingLights ? <LightPanel lights={lights} hasGrid={frame !== null} isPreview={isFogPreviewOn} onPreviewChange={setIsFogPreview} history={history} onClose={() => changeTool(null)} />
    : isEditingObjects ? <ObjectsPanel objects={objects} history={history} onClose={() => changeTool(null)} />
    : tool === "draw" ? <DrawPanel drawings={drawings} isGm={view.myRole === "GM"} history={history} onClose={() => changeTool(null)} />
    : tool === "fog" ? <FogPanel fog={scene.fog} tool={fogTool} history={history} onChange={(change) => void scene.changeFog(change)} isPreview={isFogPreviewOn} onPreviewChange={setIsFogPreview} onClose={() => changeTool(null)} />
    : tool === "grid" ? <GridPanel grid={grid} aspect={aspect} isSaving={gridDraft.isSaving} onChange={gridDraft.changeGrid} tool={gridTool} onClose={() => changeTool(null)} />
    : tool === "view" ? <ViewPanel hasGrid={grid !== null} tokenScale={tokenScale} onTokenScaleChange={onTokenScaleChange} heroNames={heroNames} creatureNames={creatures.names} cutoutOutline={cutoutOutline} partyPortraits={partyPortraits} onClose={() => changeTool(null)} />
    : selectedToken ? (
      <TokenTransformPanel token={selectedToken} onClose={() => selection.select(null)}>
        {lights.lighting !== "off" ? <TokenLightRows target={selectedToken.lightTarget} tokenLights={tokenLights} canSetDarkvision={canEditScene} /> : null}
      </TokenTransformPanel>
    )
    : null;
  const panelSlot = useToolPanelSlot(isFullscreen, () => changeTool(null));
  const localPanel = targeting ? <MapTargetingPanel view={view} targeting={targeting} /> : panelSlot ? null : panel;

  const waitingCount = heroes.waiting.length + creatures.waitingCount;
  const hasTray = waitingCount > 0 || creatures.tray !== null;
  const isMyHeroWaiting = heroes.waiting.some((member) => member.userId === view.myUserId);
  /// Плашка «Поза мапою» закриває кут мапи, тож сама розгортається лише тоді, коли з неї треба щось узяти просто зараз.
  const isTrayNeededNow = !view.isArchived && (canEditScene ? heroes.placed.length === 0 || creatures.waitingCount > 0 || waitingCount === 0 : isMyHeroWaiting);
  const isFocused = Boolean((panel && !panelSlot) || targeting || isDiceTrayOpen);
  const isTaskShown = isTargeting || castState?.sessionId === view.id;
  /// Без картинки мапи портретам нема на чому лежати; увімкнений інструмент стискає їх, щоб не закривали місце, де малюють.
  const isPortraitRowOverMap = isCombatOverMap && !isBroken;
  const portraitRow = (
    <CompactCombatContext.Provider value={isFocused || (isPortraitRowOverMap && (tool !== null || isTaskShown))}>
      <OpenCreatureCardContext.Provider value={creatures.openStatblock}>{combat}</OpenCreatureCardContext.Provider>
    </CompactCombatContext.Provider>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col [container-type:inline-size]">
      <div className={LAYOUT.root}>
        {combat && !isPortraitRowOverMap ? <div className={LAYOUT.combat}>{portraitRow}</div> : null}
        {localPanel ? (
          <div className={LAYOUT.side}>
            <div className={cn(LAYOUT.panel, "shrink-0")}>{localPanel}</div>
          </div>
        ) : null}
        {panel && panelSlot && !targeting ? createPortal(panel, panelSlot) : null}
        {isBroken ? (
          <p role="alert" className={cn(LAYOUT.stage, "m-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100")}>Не вдалося показати мапу. Оновіть сторінку або попросіть майстра завантажити її ще раз.</p>
        ) : (
          <div className={LAYOUT.stage}>
            <div
              ref={viewport.viewportRef}
              className={cn("absolute inset-0 grid touch-none select-none [-webkit-touch-callout:none] items-center justify-items-center overflow-hidden bg-slate-950/40 [container-type:size] [@container(min-width:40rem)]:rounded-xl", viewport.zoom > 1.01 && !isToolGesture && "cursor-grab active:cursor-grabbing")}
              {...viewport.bindViewport}
            >
              <div
                ref={boardRef}
                className={cn("relative mx-auto select-none rounded-xl", !aspect && "bg-white/5", anyGhost && "ring-2", anyGhost && (anyGhost.isOverTarget ? "ring-arcane-300" : "ring-white/20"))}
                style={{ aspectRatio: aspect ?? 4 / 3, width: `min(100%, calc(100cqh * ${aspect ?? 4 / 3}))`, transformOrigin: "0 0" }}
              >
                {aspect ? null : <span className="absolute inset-0 grid place-items-center text-sm text-slate-400">Мапа завантажується…</span>}
                {/* eslint-disable-next-line @next/next/no-img-element -- мапа вже стиснута до webp на сервері, оптимізатор Next її лише повторно перекодував би */}
                <img
                  ref={(image) => {
                    if (image?.complete && image.naturalWidth > 0) setAspect(image.naturalWidth / image.naturalHeight);
                  }}
                  src={mapImageUrl}
                  alt="Мапа сцени"
                  draggable={false}
                  onLoad={(event) => setAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
                  onError={() => setIsBroken(true)}
                  className="absolute inset-0 h-full w-full rounded-xl border border-white/10 object-contain"
                />
                {aspect ? (
                  <>
                    {frame && (frame.grid.isVisible || tool === "grid") ? <MapGridLayer frame={frame} /> : null}
                    {frame && areaLooks.length ? <MapAreasLayer frame={frame} areas={areaLooks} /> : null}
                    {objects.shown.length ? <MapObjectsLayer objects={objects} isEditing={isEditingObjects} /> : null}
                    {drawings.shown.length ? <MapDrawingsLayer drawings={drawings.shown} aspect={aspect} /> : null}
                    {fog && !hidesForMe ? <MapFogLayer fog={fog} aspect={aspect} isVeil /> : null}
                    {sight && !sightHidesForMe ? <MapSight sight={sight} fading={fadingSight} isVeil /> : null}
                    {isEditingWalls ? <MapWallsLayer walls={walls} aspect={aspect} /> : canEditScene ? <MapDoorButtons walls={walls} isActive={tool === null} /> : null}
                  </>
                ) : null}
                <div onPointerDownCapture={leaveGridOnToken} className={cn("pointer-events-none absolute inset-0", areTokensBlocked && "[&>*]:!pointer-events-none")}>{creatures.mapTokens}</div>
                {aspect && fog && hidesForMe ? <MapFogLayer fog={fog} aspect={aspect} isVeil={false} className="z-20" /> : null}
                {sight && sightHidesForMe ? <MapSight sight={sight} fading={fadingSight} isVeil={false} /> : null}
                {sightHidesForMe && !eyes.length ? <p className="pointer-events-none absolute inset-x-4 top-1/2 z-20 -translate-y-1/2 text-center text-sm text-slate-300">{view.myRole === "GM" ? "На сцені немає героїв — гравцям нічого не видно. Перетягніть героя з «Поза мапою»." : "Поставте героя на мапу, щоб бачити"}</p> : null}
                <div onPointerDownCapture={leaveGridOnToken} className={cn("pointer-events-none absolute inset-0", areTokensBlocked && "[&>*]:!pointer-events-none")}>{heroes.mapTokens}</div>
                {targeting ? <MapTargetPicks tokens={[...heroes.placed, ...creatures.placed]} layout={layout} targeting={targeting} /> : null}
                {aspect && isEditingLights ? <MapLightMarkers lights={lights} frame={frame} aspect={aspect} /> : null}
                {aspect ? <MapMeasureLayer frame={frame} aspect={aspect} ruler={tool === "ruler" ? ruler.ruler : null} move={move} rect={tool === "walls" ? walls.rect : tool === "fog" ? fogTool.rect : tool === "grid" ? gridTool.rect : null} /> : null}
                {frame && tool === "ruler" && ruler.ruler ? <MapLabel at={ruler.ruler.to} className="font-rpg-display text-amber-100">{measureGridFeet(ruler.ruler.from, ruler.ruler.to, frame)} фт</MapLabel> : null}
                {move && frame ? <MapLabel at={move.to}>{drag?.isBlocked ? "Стіна" : `${measureGridFeet(move.from, move.to, frame)} фт`}</MapLabel> : null}
                {frame && tool === "area" && area.draft ? <AreaControls draft={area.draft} frame={frame} area={area} /> : null}
                <MapPings view={view} />
              </div>
            </div>
            <div className={cn("pointer-events-none absolute bottom-2 right-2 z-[60] flex flex-col items-end gap-2 [&>*]:pointer-events-auto", isFullscreen ? "top-14" : "top-2")}>
              {targeting || cast ? null : <MapToolRow tool={tool} onToolChange={changeTool} canEditScene={canEditScene} canDraw={!view.isArchived} />}
              <MapZoomControls zoom={viewport.zoom} maxZoom={maxZoom} onZoomIn={viewport.zoomIn} onZoomOut={viewport.zoomOut} onFit={viewport.fit} turn={canTurn} history={history} onFullscreen={onFullscreen} />
            </div>
            {/* Поверх мапи, але не всередині неї: тут працюють звичайні дотики й прокрутка, а не жести мапи. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start gap-2 p-2 pr-16 [&>*]:pointer-events-auto [@container(min-width:40rem)]:pr-[5.5rem]">
              {isTaskShown || tool ? null : stageTop}
              <MapTaskHint view={view} className="max-w-full bg-slate-950/90 shadow-xl shadow-black/50" />
              {combat && isPortraitRowOverMap ? <div className="!pointer-events-none min-w-0 basis-full">{portraitRow}</div> : null}
            </div>
            {hasTray ? (
              <div ref={trayRef} className="absolute bottom-2 left-2 z-10 max-h-[calc(100%-4.5rem)] max-w-[min(18rem,calc(100%-4.5rem))] overflow-y-auto overscroll-contain rounded-2xl shadow-xl shadow-black/50">
                <FoldSection title={waitingCount ? `Поза мапою · ${waitingCount}` : "Поза мапою"} isOpenAtStart={isTrayNeededNow} className="bg-slate-950/90">
                  <div className="space-y-3">
                    <HeroTokenTray view={view} waiting={heroes.waiting}>
                      {heroes.trayTokens}
                    </HeroTokenTray>
                    {creatures.tray}
                  </div>
                </FoldSection>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {heroes.overlay}
      {creatures.overlay}
    </div>
  );
}

/// Слот у бічній колонці є лише на компʼютері з розгорнутою колонкою і не на весь екран. Показ будь-якої бічної вкладки прибирає панель, що її закривала.
function useToolPanelSlot(isFullscreen: boolean | undefined, closeTool: () => void): HTMLElement | null {
  const slot = useContext(ToolPanelSlotContext);
  const panelSlot = isFullscreen ? null : slot;
  const sideShownCount = useRoomTabStore((state) => state.sideShownCount);
  const seenCount = useRef(sideShownCount);
  useEffect(() => {
    if (seenCount.current === sideShownCount) return;
    seenCount.current = sideShownCount;
    if (panelSlot) closeTool();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- закриває лише новий показ вкладки
  }, [sideShownCount]);
  return panelSlot;
}

type AreaTool = ReturnType<typeof useAreaTool>;

function AreaControls({ draft, frame, area }: { draft: NonNullable<AreaTool["draft"]>; frame: MapFrame; area: AreaTool }) {
  const { placement } = draft;
  return (
    <>
      <MapLabel at={placement.origin} className={draft.id === null ? "text-arcane-100" : "text-amber-100"}>
        {placement.label ?? AREA_SHAPE_LABELS[placement.shape]} · {placement.sizeFeet} фт
      </MapLabel>
      {draft.canEdit ? (
        <>
          <MapHandle at={placement.origin} label="Перемістити область" onMove={area.moveOrigin} onEnd={area.commit} />
          {placement.shape !== "circle" ? <MapHandle at={findAreaTip(placement, frame)} label="Напрямок області" variant="aim" onMove={area.aim} onEnd={area.commit} /> : null}
        </>
      ) : null}
    </>
  );
}

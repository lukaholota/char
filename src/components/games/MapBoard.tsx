"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { castOnArea, dropAreaCast, placeAreaCast, registerReadyMapBoard, useAreaCastStore } from "@/lib/components/game/area-cast";
import { describeTargetSave, findPressedTargetSave } from "@/lib/components/dice/roll-contexts";
import { useMapTargetingStore } from "@/lib/components/game/map-targeting";
import { cn } from "@/lib/utils";
import { isPointInArea, isTokenInArea, type AreaPlacement } from "@/rules/game-areas";
import { applyFogChange, isPointHidden, type FogStroke, type SceneFog } from "@/rules/game-fog";
import { findFreeCellNear, measureGridFeet, snapToHalfCell, type MapFrame } from "@/rules/game-grid";
import { findPointSight, isTokenSeen } from "@/rules/game-lighting";
import { findMapShareInRect, findTokenPositionInRect, type TokenPosition } from "@/rules/game-map";
import type { TokenNameMode } from "@/rules/game-map-creatures";
import type { GameSessionView } from "@/server/db/game-sessions";
import { AreaControls, AreaPanel, type AreaStart } from "./AreaToolPanel";
import { useHeroTokens, type TokenMoves } from "./HeroTokens";
import { MapTokenTray } from "./HeroTokenTray";
import { OpenCreatureCardContext, useMapCreatureTokens } from "./MapCreatureTokens";
import { MapTargetingPanel, MapTargetPicks, MapTaskHint } from "./MapTargeting";
import { MapAreasLayer, MapFogLayer, MapGridLayer, MapLabel, MapMeasureLayer, type AreaLook } from "./MapOverlay";
import { findTappedTokenKey, type TokenLayout } from "./MapTokenSlot";
import { MapToolRow, MapZoomControls } from "./MapToolbar";
import { FogPanel, GridPanel, RulerPanel, ViewPanel } from "./MapToolPanels";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { CompactCombatContext } from "./CombatTracker";
import { DrawPanel, MapDrawingsLayer } from "./MapDrawings";
import { LightPanel, MapLightMarkers, MapSight, TokenLightRows } from "./MapLighting";
import { CharacterViewChip } from "./MapDarkvision";
import { MapGroupActions } from "./MapGroupPanel";
import { MapObjectsLayer, ObjectsPanel } from "./MapObjects";
import { FloorsPanel, MapFloorSwitch } from "./MapFloors";
import { useMapFloors } from "./use-map-floors";
import { AtmospherePanel, MapTint, MapWeather, useSceneAtmosphere } from "./MapAtmosphere";
import { useWeatherShown } from "./use-token-scale";
import { SoundsPanel, SoundUnlockButton } from "./MapSounds";
import { MapPings, pingMap } from "./MapPings";
import { MapOpeningButtons } from "./MapOpenings";
import { MapWallsLayer, WallsPanel } from "./MapWalls";
import { useToolPanelSlot } from "./room-tabs";
import { useSharedBoard } from "./shared-board";
import { useMapHistory } from "./map-history";
import { useMapClipboard } from "./map-clipboard";
import { useElementWidth } from "./use-element-width";
import { useMapDrawings } from "./use-map-drawings";
import { useMapLights, useTokenLights } from "./use-map-lights";
import { buildGroupShiftStyle, useBoardGroup } from "./use-map-group";
import { useMapObjects } from "./use-map-objects";
import { useCharacterView, usePartySight, useWallSight } from "./use-map-sight";
import { useMapWalls } from "./use-map-walls";
import { useAreaTool, useFogTool, useGridTool, useRulerTool, type MapTool } from "./use-map-tools";
import { useMapViewport } from "./use-map-viewport";
import { useGridDraft, useSceneTools } from "./use-scene-tools";
import { useTokenSelection } from "./TokenTransformControls";
import { SelectedTokenPanel } from "./SelectedTokenPanel";
import { MapHints } from "./MapHints";

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
  const drawings = useMapDrawings(view, toShare, aspect, frame);
  const [isEditingWalls, isEditingObjects] = [tool === "walls" && canEditScene, tool === "objects" && canEditScene];
  const walls = useMapWalls({ view, toShare, frame, aspect, isEditing: isEditingWalls });
  const gesture = tool === "walls" ? walls.gesture : tool === "ruler" ? ruler.gesture : tool === "draw" ? drawings.gesture : tool === "fog" ? fogTool.gesture : tool === "grid" ? gridTool.gesture : tool === "area" ? area.gesture : null;

  const panelSlot = useToolPanelSlot(isFullscreen, () => changeTool(null));
  const selection = useTokenSelection(!targeting && tool !== "area", tool === null ? null : () => changeTool(null), panelSlot !== null);
  const { group, moveTokenGroup, tokenSelection } = useBoardGroup({ view, toShare, selection, isEditingObjects, findObjects: () => objects, findTokens: () => [...heroes.placed, ...creatures.placed] });
  const clearChoices = () => { group.clear(); selection.select(null); objects.choose(null); lights.choose(null); };
  const openTappedArea = (point: Point) => {
    if (isEditingWalls && walls.mode === "edit") return walls.chooseAt(point);
    clearChoices();
    if (targeting) return;
    const at = toShare(point);
    const hit = frame && at ? [...scene.areas].reverse().find((candidate) => isPointInArea(at, candidate, frame)) : undefined;
    if (hit) {
      area.open(hit, canEditScene || (!view.isArchived && hit.userId === view.myUserId));
      setTool("area");
    } else if (canEditScene && tool === null && objects.chooseTapped(boardRef.current, point)) setTool("objects");
    else if (area.draft && !area.draft.canEdit) area.close();
  };
  const pingHeldPoint = (point: Point) => {
    const at = toShare(point);
    if (at && !view.isArchived && at.x >= 0 && at.x <= 1 && at.y >= 0 && at.y <= 1) pingMap(view, at);
  };
  const maxZoom = grid ? Math.min(12, Math.max(5, grid.columns / 6)) : 5;
  const viewport = useMapViewport({ boardRef, isTurned: isQuarterTurned, maxZoom, gesture, boxGesture: canEditScene && ((tool === null && !targeting) || isEditingObjects) ? group.boxGesture : null, onTap: openTappedArea, onToolTap: tool === "walls" || tool === "area" ? null : (point) => selection.pick(findTappedTokenKey(boardRef.current, point)), onHold: pingHeldPoint });

  const findDropPosition = (point: Point) => {
    const viewportRect = viewport.viewportRef.current?.getBoundingClientRect();
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || (viewportRect && !isInsideRect(point, viewportRect))) return null;
    const trayRect = trayRef.current?.getBoundingClientRect();
    if (trayRect && isInsideRect(point, trayRect)) return null;
    return findTokenPositionInRect(point, rect, isQuarterTurned());
  };
  const atmosphere = useSceneAtmosphere(view);
  const [isWeatherShown, changeWeatherShown] = useWeatherShown(view.id);
  const floors = useMapFloors({ view, aspect, gridColumns: grid?.columns ?? null, findViewCentre: () => findViewCentre() });
  const isEditingLights = tool === "light" && canEditScene;
  const lights = useMapLights({ view, isEditing: isEditingLights, findDropPosition, findViewCentre: () => findViewCentre() });
  const tokenLights = useTokenLights(view);
  const wallSight = useWallSight(walls.shown, aspect);
  const characterView = useCharacterView({ view, scope: boardRef, findSelected: () => heroes.selected, onStart: () => selection.select(null) });
  const seesAsPlayer = view.myRole !== "GM" || (isFogPreview && tool === "fog") || characterView.hero !== null;
  const hidesForMe = fog !== null && seesAsPlayer;
  const activeArea = tool === "area" ? (area.draft?.placement ?? null) : null;
  const layout: TokenLayout = {
    cellPx: grid && boardWidth ? boardWidth / grid.columns : null,
    scale: tokenScale, zoom: viewport.zoom, frame, floors,
    isHidden: (position) => hidesForMe && isPointHidden(position, fog, aspect ?? 1),
    isHighlighted: (position, cells) => Boolean(frame && activeArea && isTokenInArea(position, cells, activeArea, frame)),
    isCutoutOutlined: cutoutOutline.isOn,
    findFreeSpot: () => findFreeCellNear(findViewCentre(), [...heroes.placed, ...creatures.placed].map((token) => token.position), frame),
  };
  const heroes = useHeroTokens({ view, moves, layout, nameMode: heroNames.mode, selection: tokenSelection, group, findDropPosition, isTurned: isQuarterTurned, blocksMove: view.myRole !== "GM" && lights.lighting !== "off" ? wallSight.blocksMove : null });
  const { sight, fading: fadingSight, eyes } = usePartySight({ view, heroes, moves, lights, tokenLights, frame, aspect, walls: wallSight, viewerHeroId: characterView.hero?.heroId ?? null });
  const sightHidesForMe = sight !== null && seesAsPlayer;
  const creatureLayout: TokenLayout = {
    ...layout,
    isHidden: (position, cells) => layout.isHidden(position, cells) || (sightHidesForMe && !isTokenSeen(position, cells, sight, frame)),
    revealClassName: sightHidesForMe ? "map-sight-reveal" : undefined,
  };
  const creatures = useMapCreatureTokens({ view, layout: creatureLayout, selection: tokenSelection, group, findDropPosition, isTurned: isQuarterTurned });
  const objects = useMapObjects({ view, shownFloor: floors.shown, editing: isEditingObjects ? "all" : tool === "floors" && canEditScene ? "shownFloor" : null, gridColumns: grid?.columns ?? null, findDropPosition, findViewCentre: () => findViewCentre(), group });
  const selectedToken = heroes.selected ?? creatures.selected;
  const clipboard = useMapClipboard({ view, canEdit: canEditScene, scope: boardRef, objects, lights, token: selectedToken, group });

  const changeTool = (next: MapTool | null) => {
    if (next !== "area") area.close();
    if (cast) dropAreaCast();
    if (tool === "ruler") ruler.clear();
    if (tool === "grid") gridDraft.dropDraft();
    setIsFogPreview(false);
    clearChoices();
    walls.reset();
    drawings.reset();
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
  const [hasFrame, hasImage] = [frame !== null, aspect !== null];
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
  const isShiftingGrid = tool === "grid" && gridTool.mode === "shift";
  const areTokensBlocked = gesture !== null && !isShiftingGrid;
  const leaveGridOnToken = isShiftingGrid ? () => changeTool(null) : undefined;
  const canTurn = turn && (turn.isTurned || (aspect ?? 0) > 1) ? turn : null;
  const areaLooks: Array<{ key: string | number; area: AreaPlacement; look: AreaLook }> = scene.areas.filter((saved) => saved.id !== area.draft?.id || tool !== "area").map((saved) => ({ key: saved.id, area: saved, look: "saved" }));
  if (tool === "area" && area.draft) areaLooks.push({ key: "active", area: area.draft.placement, look: area.draft.id === null ? "draft" : "selected" });

  const groupPanel = group.findMembers().length > 1 ? <MapGroupActions view={view} group={group} objects={isEditingObjects ? objects : null} findLook={(key) => heroes.findGroupLook(key) ?? creatures.findGroupLook(key)} moveTokenGroup={moveTokenGroup} removeCreature={creatures.remove} onCopy={clipboard.duplicateChosen} /> : null;
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
    : isEditingLights ? <LightPanel view={view} lights={lights} hasGrid={frame !== null} characterView={characterView} history={history} onClose={() => changeTool(null)} />
    : isEditingObjects ? (groupPanel ?? <ObjectsPanel objects={objects} history={history} onClose={() => changeTool(null)} />)
    : tool === "draw" ? <DrawPanel drawings={drawings} isGm={view.myRole === "GM"} history={history} onClose={() => changeTool(null)} />
    : tool === "fog" ? <FogPanel fog={scene.fog} tool={fogTool} history={history} onChange={(change) => void scene.changeFog(change)} isPreview={isFogPreview} onPreviewChange={setIsFogPreview} onClose={() => changeTool(null)} />
    : tool === "floors" && canEditScene ? <FloorsPanel floors={floors} objects={objects} history={history} onClose={() => changeTool(null)} />
    : tool === "atmosphere" && canEditScene ? <AtmospherePanel view={view} onClose={() => changeTool(null)} />
    : tool === "sounds" && canEditScene ? <SoundsPanel view={view} onClose={() => changeTool(null)} />
    : tool === "grid" ? <GridPanel grid={grid} aspect={aspect} isSaving={gridDraft.isSaving} onChange={gridDraft.changeGrid} tool={gridTool} onClose={() => changeTool(null)} />
    : tool === "view" ? <ViewPanel hasGrid={grid !== null} tokenScale={tokenScale} onTokenScaleChange={onTokenScaleChange} heroNames={heroNames} creatureNames={creatures.names} cutoutOutline={cutoutOutline} partyPortraits={partyPortraits} weather={atmosphere.weather === "none" ? null : { isOn: isWeatherShown, onChange: changeWeatherShown }} onClose={() => changeTool(null)} />
    : groupPanel ? groupPanel
    : selectedToken ? <SelectedTokenPanel token={selectedToken} selection={selection} isSide={panelSlot !== null} scope={boardRef} lights={lights.lighting !== "off" ? <TokenLightRows target={selectedToken.lightTarget} tokenLights={tokenLights} characterView={canEditScene ? characterView : null} /> : null} />
    : null;
  const shownPanel = targeting ? <MapTargetingPanel view={view} targeting={targeting} /> : panel;
  const localPanel = panelSlot ? null : shownPanel;

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
        {shownPanel && panelSlot ? createPortal(shownPanel, panelSlot) : null}
        {isBroken ? (
          <p role="alert" className={cn(LAYOUT.stage, "m-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100")}>Не вдалося показати мапу. Оновіть сторінку або попросіть майстра завантажити її ще раз.</p>
        ) : (
          <div className={LAYOUT.stage}>
            <div
              ref={viewport.viewportRef}
              className={cn("absolute inset-0 isolate grid touch-none select-none [-webkit-touch-callout:none] items-center justify-items-center overflow-hidden bg-slate-950/40 [container-type:size] [@container(min-width:40rem)]:rounded-xl", !viewport.isFitted && gesture === null && "cursor-grab active:cursor-grabbing")}
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
                    {objects.shown.length ? <MapObjectsLayer objects={objects} isGrouped={(id) => group.isGrouped(`object-${id}`)} /> : null}
                    {drawings.shown.length ? <MapDrawingsLayer drawings={drawings.shown} selected={drawings.selected} aspect={aspect} /> : null}
                    <MapTint atmosphere={atmosphere} />
                    {fog && !hidesForMe ? <MapFogLayer fog={fog} aspect={aspect} isVeil /> : null}
                    {sight && !sightHidesForMe ? <MapSight sight={sight} fading={fadingSight} isVeil darkvisionLook={lights.darkvisionLook} /> : null}
                    {isEditingWalls ? <MapWallsLayer walls={walls} aspect={aspect} /> : null}
                  </>
                ) : null}
                <div onPointerDownCapture={leaveGridOnToken} style={buildGroupShiftStyle(group, drag)} className={cn("pointer-events-none absolute inset-0", areTokensBlocked && "[&>*]:!pointer-events-none")}>{creatures.mapTokens}</div>
                {aspect && fog && hidesForMe ? <MapFogLayer fog={fog} aspect={aspect} isVeil={false} className="z-20" /> : null}
                {sight && sightHidesForMe ? <MapSight sight={sight} fading={fadingSight} isVeil={false} darkvisionLook={lights.darkvisionLook} /> : null}
                {aspect && !isEditingWalls && !view.isArchived ? <MapOpeningButtons walls={walls} isGm={canEditScene} isActive={tool === null} isSeen={(at) => !layout.isHidden(at, 1) && !(sightHidesForMe && findPointSight(at, sight) === "hidden")} aspect={aspect} /> : null}
                {sightHidesForMe && !eyes.length ? <p className="pointer-events-none absolute inset-x-4 top-1/2 z-20 -translate-y-1/2 text-center text-sm text-slate-300">{characterView.hero ? `${characterView.hero.persName ?? characterView.hero.name} не на мапі` : view.myRole === "GM" ? "На сцені немає героїв — гравцям нічого не видно. Перетягніть героя з «Поза мапою»." : "Поставте героя на мапу, щоб бачити"}</p> : null}
                <div onPointerDownCapture={leaveGridOnToken} style={buildGroupShiftStyle(group, drag)} className={cn("pointer-events-none absolute inset-0", areTokensBlocked && "[&>*]:!pointer-events-none")}>{heroes.mapTokens}</div>
                {targeting ? <MapTargetPicks tokens={[...heroes.placed, ...creatures.placed]} layout={layout} targeting={targeting} /> : null}
                {aspect && isEditingLights ? <MapLightMarkers lights={lights} frame={frame} aspect={aspect} /> : null}
                {aspect ? <MapMeasureLayer frame={frame} aspect={aspect} ruler={tool === "ruler" ? ruler.ruler : null} move={move} rect={tool === "walls" ? walls.rect : tool === "fog" ? fogTool.rect : tool === "grid" ? gridTool.rect : group.rect} /> : null}
                {frame && tool === "ruler" && ruler.ruler ? <MapLabel at={ruler.ruler.to} className="font-rpg-display text-amber-100">{measureGridFeet(ruler.ruler.from, ruler.ruler.to, frame)} фт</MapLabel> : null}
                {move && frame ? <MapLabel at={move.to} liftPx={(drag?.ghostPx ?? 0) / 2}>{drag?.isBlocked ? "Стіна" : `${measureGridFeet(move.from, move.to, frame)} фт`}</MapLabel> : null}
                {frame && tool === "area" && area.draft ? <AreaControls draft={area.draft} frame={frame} area={area} /> : null}
                <MapPings view={view} />
              </div>
            </div>
            {isWeatherShown ? <MapWeather atmosphere={atmosphere} mapRef={boardRef} /> : null}
            <div className={cn("pointer-events-none absolute bottom-2 right-2 z-[60] flex flex-col items-end gap-2 [&>*]:pointer-events-auto", isFullscreen ? "top-14" : "top-2")}>
              {targeting || cast ? null : <MapToolRow tool={tool} onToolChange={changeTool} canEditScene={canEditScene} canDraw={!view.isArchived} />}
              <MapZoomControls zoom={viewport.zoom} minZoom={viewport.minZoom} maxZoom={maxZoom} isFitted={viewport.isFitted} onZoomIn={viewport.zoomIn} onZoomOut={viewport.zoomOut} onFit={viewport.fit} turn={canTurn} history={history} onFullscreen={onFullscreen} />
            </div>
            {/* Поверх мапи, але не всередині неї: тут працюють звичайні дотики й прокрутка, а не жести мапи. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start gap-2 p-2 pr-16 [&>*]:pointer-events-auto [@container(min-width:40rem)]:pr-[5.5rem]">
              <CharacterViewChip characterView={characterView} />{isTaskShown || tool ? null : <>{stageTop}<MapFloorSwitch floors={floors} canEdit={canEditScene} />{view.ambience.length ? <SoundUnlockButton /> : null}</>}
              <MapTaskHint view={view} className="max-w-full bg-slate-950/90 shadow-xl shadow-black/50 [@container(min-width:40rem)]:hidden" />
              {combat && isPortraitRowOverMap ? <div className="!pointer-events-none min-w-0 basis-full">{portraitRow}</div> : null}
            </div>
            {tool === "walls" || tool === "draw" ? null : <MapTokenTray view={view} canEdit={canEditScene} trayRef={trayRef} heroes={{ waiting: heroes.waiting, trayTokens: heroes.trayTokens, placedCount: heroes.placed.length }} creatures={creatures} />}
          </div>
        )}
      </div>
      <MapHints isGm={canEditScene} isArchived={view.isArchived} tool={tool} isGroup={groupPanel !== null} token={selectedToken} tab={selection.tab} isSide={panelSlot !== null} isFullscreen={isFullscreen} />
      {heroes.overlay}
      {creatures.overlay}
    </div>
  );
}

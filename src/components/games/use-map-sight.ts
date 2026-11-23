"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import { toViewPoint, type MapFrame } from "@/rules/game-grid";
import { buildSceneSight, DEFAULT_LIGHT_LOOK, type BuildPolygon, type Eye, type LightSource, type SceneLighting, type SceneSight, type TokenLight } from "@/rules/game-lighting";
import type { TokenPosition } from "@/rules/game-map";
import { collectMoveLines, collectSightLines, collectSightSegments, type WallLine } from "@/rules/game-walls";
import { buildVisibilityPolygon, isMoveBlocked, type ViewPoint } from "@/rules/map-visibility";
import { isTokenHiddenFromViewer } from "@/rules/token-conditions";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import type { TokenMoves, useHeroTokens } from "./HeroTokens";
import type { SelectedToken } from "./TokenTransformControls";
import { useOptimisticReader } from "./optimistic-values";
import type { MapLights, TokenLights } from "./use-map-lights";
import type { TokenLayout } from "./MapTokenSlot";

const POLYGON_CACHE_LIMIT = 200;
const SIGHT_MEASURE = "scene-sight";
const toLightSource = (at: TokenPosition, { brightFeet, dimFeet }: TokenLight, look = DEFAULT_LIGHT_LOOK): LightSource => ({ at, brightFeet, dimFeet, look });

/// Стіни міняються рідко, а світло й очі — щокадру під пальцем: многокутник для тієї ж точки й радіуса не рахуємо вдруге.
/// Зір спиняють стіни, зачинені двері й вікна за шторою; рух — ще й зачинені вікна.
export function useWallSight(walls: WallLine[], aspect: number | null) {
  const wallsKey = JSON.stringify(walls.map(({ kind, isOpen, lock, isCurtained, points }): WallLine => ({ kind, isOpen, lock, isCurtained, points })));
  return useMemo(() => {
    const lines = JSON.parse(wallsKey) as WallLine[];
    const [sightLines, moveLines] = [collectSightLines(lines), collectMoveLines(lines)];
    const segments = aspect ? collectSightSegments(sightLines, aspect) : [];
    const moveSegments = aspect ? collectSightSegments(moveLines, aspect) : [];
    const polygons = new Map<string, ViewPoint[]>();
    const buildPolygon: BuildPolygon = (origin, walls, radius) => {
      const key = `${origin.x},${origin.y},${radius}`;
      if (polygons.size > POLYGON_CACHE_LIMIT) polygons.clear();
      const polygon = polygons.get(key) ?? buildVisibilityPolygon(origin, walls, radius);
      polygons.set(key, polygon);
      return polygon;
    };
    const ratio = aspect ?? 1;
    const blocksMove = (from: TokenPosition, to: TokenPosition) => isMoveBlocked(toViewPoint(from, ratio), toViewPoint(to, ratio), moveSegments);
    return { segments, buildPolygon, blocksMove };
  }, [wallsKey, aspect]);
}

export type WallSight = ReturnType<typeof useWallSight>;
type SightOptions = { lighting: SceneLighting; lights: LightSource[]; eyes: Eye[]; frame: MapFrame | null; aspect: number | null; walls: WallSight };

type PartySightOptions = {
  view: GameSessionView;
  heroes: Pick<ReturnType<typeof useHeroTokens>, "heroes" | "ghost" | "drag">;
  moves: TokenMoves;
  lights: MapLights;
  tokenLights: TokenLights;
  frame: MapFrame | null;
  aspect: number | null;
  walls: WallSight;
  viewerHeroId: number | null;
};

type HeroAt = { member: GameSessionMemberView; at: TokenPosition };

export function findHiddenPreviewHeroes({ viewer, members, moves, layout }: { viewer: GameSessionMemberView | null; members: GameSessionMemberView[]; moves: TokenMoves; layout: TokenLayout }) {
  const hidden = new Set<string>();
  if (!viewer) return hidden;
  for (const member of members) {
    if (member.heroId === viewer.heroId) continue;
    const at = moves.findPosition(member);
    if (!at) continue;
    const isInvisible = isTokenHiddenFromViewer({ userId: viewer.userId, isGm: false }, member, member.conditions.conditions);
    if (isInvisible || layout.isHidden(at, 1) || layout.floors.isOffFloor({ at, floor: moves.findFloor(member) })) hidden.add(`hero-${member.heroId}`);
  }
  return hidden;
}

/// Кожен гравець дивиться очима лише своїх героїв; глядач без героя — очима партії. Майстер бачить усіх або вибраного героя.
function findEyeHeroes(view: GameSessionView, heroesAt: HeroAt[], viewerHeroId: number | null) {
  if (viewerHeroId !== null) return heroesAt.filter(({ member }) => member.heroId === viewerHeroId);
  const isMine = (member: GameSessionMemberView) => member.userId === view.myUserId && member.persId !== null;
  if (view.myRole === "GM" || !view.members.some(isMine)) return heroesAt;
  return heroesAt.filter(({ member }) => isMine(member));
}

/// Очі — герої партії, світло — сцени, героїв та істот. У майстра герой під пальцем дивиться з місця «примари»;
/// гравцю зір міняється лише після ходу, інакше він розвідує мапу, тягаючи героя й повертаючи назад.
export function usePartySight({ view, heroes, moves, lights, tokenLights, frame, aspect, walls, viewerHeroId }: PartySightOptions) {
  const readOptimistic = useOptimisticReader();
  const previewedHeroId = view.myRole === "GM" ? heroes.ghost?.id : undefined;
  const heroesAt = heroes.heroes.flatMap((member) => {
    const at = (previewedHeroId === member.heroId ? heroes.drag?.to : null) ?? moves.findPosition(member);
    return at ? [{ member, at }] : [];
  });
  const eyes: Eye[] = findEyeHeroes(view, heroesAt, viewerHeroId).map(({ member, at }) => ({ at, darkvisionFeet: tokenLights.findDarkvision(member) }));
  const lightSources = [
    ...lights.shown.filter((light) => light.isOn).map((light) => toLightSource(lights.findShownAt(light), light, light.look)),
    ...heroesAt.map(({ member, at }) => toLightSource(at, tokenLights.findLight({ kind: "hero", member }))),
    ...view.creatures.flatMap((creature) => {
      const at = readOptimistic(`creature-removed:${creature.id}`, false) ? null : readOptimistic(`creature-position:${creature.id}`, creature.token);
      return at ? [toLightSource(at, tokenLights.findLight({ kind: "creature", creature }))] : [];
    }),
  ];
  const sight = useSceneSight({ lighting: lights.lighting, lights: lightSources, eyes, frame, aspect, walls });
  const fading = useFadingSight(sight, previewedHeroId !== undefined || lights.ghostId !== null);
  return { sight, fading, eyes };
}

function useSceneSight({ lighting, lights, eyes, frame, aspect, walls }: SightOptions): SceneSight | null {
  const inputKey = JSON.stringify({ lighting, lights, eyes, frame });
  return useMemo(() => {
    if (!aspect) return null;
    const input = JSON.parse(inputKey) as Pick<SightOptions, "lighting" | "lights" | "eyes" | "frame">;
    const startedAt = performance.now();
    const sight = buildSceneSight({ ...input, segments: walls.segments, aspect }, walls.buildPolygon);
    /// Ворота KR52.6: час видно в профілі й у PerformanceObserver на телефоні; буфер не накопичуємо.
    performance.measure(SIGHT_MEASURE, { start: startedAt });
    performance.clearMeasures(SIGHT_MEASURE);
    return sight;
  }, [inputKey, aspect, walls]);
}

/// Чужий рух, двері чи світло: стара картина ще 180 мс гасне зверху. Під власним пальцем — без переходу.
function useFadingSight(sight: SceneSight | null, isLive: boolean) {
  const [shown, setShown] = useState(sight);
  const [fading, setFading] = useState<SceneSight | null>(null);
  if (shown !== sight) {
    setShown(sight);
    setFading(!isLive && shown && sight ? shown : null);
  }
  return { fading, clearFading: () => setFading(null) };
}

export type FadingSight = ReturnType<typeof useFadingSight>;

const isCharacterViewKey = (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === "KeyL";

type CharacterViewOptions = { view: GameSessionView; scope: RefObject<Element | null>; findSelected: () => SelectedToken | null; findPosition: TokenMoves["findPosition"]; onStart: () => void };

/// Майстер дивиться очима вибраного героя (око або Ctrl+L). Вибір знімаємо, щоб рамка не потрапила в запис стріму.
export function useCharacterView({ view, scope, findSelected, findPosition, onStart }: CharacterViewOptions) {
  const [heroId, setHeroId] = useState<number | null>(null);
  const findSelectedHero = () => {
    const selected = findSelected();
    return selected?.lightTarget.kind === "hero" ? selected.lightTarget.member : null;
  };
  const start = (member: GameSessionMemberView) => {
    setHeroId(member.heroId);
    onStart();
  };
  const toggle = () => {
    if (heroId !== null) return setHeroId(null);
    const selectedHero = findSelectedHero();
    if (!selectedHero) return void toast("Виберіть героя на мапі, тоді — око або Ctrl+L");
    start(selectedHero);
  };
  const latestToggle = useRef(toggle);
  latestToggle.current = toggle;
  const canUse = view.myRole === "GM";
  useEffect(() => {
    if (!canUse) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCharacterViewKey(event) || event.defaultPrevented || !scope.current || scope.current.closest('[aria-hidden="true"]')) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      latestToggle.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUse, scope]);
  const hero = canUse && heroId !== null ? (view.members.find((member) => member.heroId === heroId) ?? null) : null;
  const heroesOnMap = canUse ? view.members.filter((member) => member.persId !== null && findPosition(member) !== null) : [];
  return { hero, heroesOnMap, findSelectedHero, start, toggle };
}

export type CharacterView = ReturnType<typeof useCharacterView>;

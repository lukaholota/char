"use client";

import { useMemo, useState } from "react";
import { toViewPoint, type MapFrame } from "@/rules/game-grid";
import { buildSceneSight, type BuildPolygon, type Eye, type LightSource, type SceneLighting, type SceneSight, type TokenLight } from "@/rules/game-lighting";
import type { TokenPosition } from "@/rules/game-map";
import { collectSightSegments } from "@/rules/game-walls";
import { buildVisibilityPolygon, isMoveBlocked, type ViewPoint } from "@/rules/map-visibility";
import type { GameSessionView } from "@/server/db/game-sessions";
import type { TokenMoves, useHeroTokens } from "./HeroTokens";
import { useOptimisticReader } from "./optimistic-values";
import type { MapLights, TokenLights } from "./use-map-lights";

const POLYGON_CACHE_LIMIT = 200;
const SIGHT_MEASURE = "scene-sight";
const toLightSource = (at: TokenPosition, { brightFeet, dimFeet }: TokenLight): LightSource => ({ at, brightFeet, dimFeet });

/// Стіни міняються рідко, а світло й очі — щокадру під пальцем: многокутник для тієї ж точки й радіуса не рахуємо вдруге.
export function useWallSight(lines: TokenPosition[][], aspect: number | null) {
  const linesKey = JSON.stringify(lines);
  return useMemo(() => {
    const segments = aspect ? collectSightSegments(JSON.parse(linesKey) as TokenPosition[][], aspect) : [];
    const polygons = new Map<string, ViewPoint[]>();
    const buildPolygon: BuildPolygon = (origin, walls, radius) => {
      const key = `${origin.x},${origin.y},${radius}`;
      if (polygons.size > POLYGON_CACHE_LIMIT) polygons.clear();
      const polygon = polygons.get(key) ?? buildVisibilityPolygon(origin, walls, radius);
      polygons.set(key, polygon);
      return polygon;
    };
    const ratio = aspect ?? 1;
    const blocksMove = (from: TokenPosition, to: TokenPosition) => isMoveBlocked(toViewPoint(from, ratio), toViewPoint(to, ratio), segments);
    return { segments, buildPolygon, blocksMove };
  }, [linesKey, aspect]);
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
};

/// Очі — герої партії, світло — сцени, героїв та істот. У майстра герой під пальцем дивиться з місця «примари»;
/// гравцю зір міняється лише після ходу, інакше він розвідує мапу, тягаючи героя й повертаючи назад.
export function usePartySight({ view, heroes, moves, lights, tokenLights, frame, aspect, walls }: PartySightOptions) {
  const readOptimistic = useOptimisticReader();
  const previewedHeroId = view.myRole === "GM" ? heroes.ghost?.id : undefined;
  const heroesAt = heroes.heroes.flatMap((member) => {
    const at = (previewedHeroId === member.heroId ? heroes.drag?.to : null) ?? moves.findPosition(member);
    return at ? [{ member, at }] : [];
  });
  const eyes: Eye[] = heroesAt.map(({ member, at }) => ({ at, darkvisionFeet: tokenLights.findDarkvision(member) }));
  const lightSources = [
    ...lights.shown.filter((light) => light.isOn).map((light) => toLightSource(lights.findShownAt(light), light)),
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

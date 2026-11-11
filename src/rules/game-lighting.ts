import { FEET_PER_CELL, MAP_VIEW_WIDTH, findViewUnitsPerFoot, toViewPoint, type MapFrame } from "./game-grid";
import type { TokenPosition } from "./game-map";
import { buildVisibilityPolygon, isPointInPolygon, type SightSegment, type ViewPoint } from "./map-visibility";

export const SCENE_LIGHTINGS = ["off", "bright", "dim", "dark"] as const;
export type SceneLighting = (typeof SCENE_LIGHTINGS)[number];
export type TokenLight = { brightFeet: number; dimFeet: number };
export type LightSource = TokenLight & { at: TokenPosition };
export type SceneLightView = LightSource & { id: number; isOn: boolean };
export type Eye = { at: TokenPosition; darkvisionFeet: number };
export type SightInput = { lighting: SceneLighting; segments: SightSegment[]; lights: LightSource[]; eyes: Eye[]; frame: MapFrame | null; aspect: number };
export type PointSight = "bright" | "dim" | "hidden";

export type LitArea = { at: ViewPoint; polygon: ViewPoint[]; bright: number; reach: number };
export type SeeingEye = { at: ViewPoint; polygon: ViewPoint[]; darkvision: number; ownCell: number };
export type SceneSight = { lighting: Exclude<SceneLighting, "off">; aspect: number; eyes: SeeingEye[]; lights: LitArea[] };

export const LIGHT_LIMITS = { perScene: 40, feet: 300 } as const;
/// Око завжди бачить свою клітинку, щоб у темряві гравець не загубив токен.
export const OWN_CELL_FEET = FEET_PER_CELL;

/// Числа з PHB; «Ліхтар-прожектор» світить конусом — тут колом.
export const LIGHT_PRESETS: Array<TokenLight & { key: string; name: string }> = [
  { key: "candle", name: "Свічка", brightFeet: 5, dimFeet: 5 },
  { key: "torch", name: "Смолоскип", brightFeet: 20, dimFeet: 20 },
  { key: "hooded-lantern", name: "Ліхтар з капюшоном", brightFeet: 30, dimFeet: 30 },
  { key: "bullseye-lantern", name: "Ліхтар-прожектор", brightFeet: 60, dimFeet: 60 },
  { key: "light", name: "Світло", brightFeet: 20, dimFeet: 20 },
  { key: "daylight", name: "Денне світло", brightFeet: 60, dimFeet: 60 },
  { key: "dancing-lights", name: "Мерехтливі вогники", brightFeet: 0, dimFeet: 10 },
];

const isFeet = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= LIGHT_LIMITS.feet;
const isShare = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

export function parseSceneLighting(raw: unknown): SceneLighting | null {
  return SCENE_LIGHTINGS.find((lighting) => lighting === raw) ?? null;
}

export function parseTokenLight(raw: unknown): TokenLight | null {
  if (!raw || typeof raw !== "object") return null;
  const { brightFeet, dimFeet } = raw as Record<string, unknown>;
  return isFeet(brightFeet) && isFeet(dimFeet) ? { brightFeet, dimFeet } : null;
}

export function parseLightSource(raw: unknown): LightSource | null {
  const light = parseTokenLight(raw);
  const at = (raw as { at?: { x?: unknown; y?: unknown } } | null)?.at;
  return light && isShare(at?.x) && isShare(at?.y) ? { ...light, at: { x: at.x, y: at.y } } : null;
}

type SceneLightRow = { id: number; x: number; y: number; brightFeet: number; dimFeet: number; isOn: boolean };

export function buildSceneLightViews(rows: SceneLightRow[], isGm: boolean): SceneLightView[] {
  return rows.filter((row) => isGm || row.isOn).map(({ id, x, y, brightFeet, dimFeet, isOn }) => ({ id, at: { x, y }, brightFeet, dimFeet, isOn }));
}

export const hasLight = (light: TokenLight | null): light is TokenLight => Boolean(light && light.brightFeet + light.dimFeet > 0);

export type BuildPolygon = typeof buildVisibilityPolygon;

/// Усе, що потрібно шару й токенам: многокутники очей і світла пораховані один раз; buildPolygon клієнт кешує між кадрами.
export function buildSceneSight({ lighting, segments, lights, eyes, frame, aspect }: SightInput, buildPolygon: BuildPolygon = buildVisibilityPolygon): SceneSight | null {
  if (lighting === "off") return null;
  const perFoot = frame ? findViewUnitsPerFoot(frame) : 0;
  const mapReach = Math.hypot(MAP_VIEW_WIDTH, MAP_VIEW_WIDTH / aspect);
  return {
    lighting,
    aspect,
    eyes: eyes.map((eye) => {
      const at = toViewPoint(eye.at, aspect);
      return { at, polygon: buildPolygon(at, segments, mapReach), darkvision: eye.darkvisionFeet * perFoot, ownCell: OWN_CELL_FEET * perFoot };
    }),
    lights: perFoot ? lights.filter(hasLight).map((light) => buildLitArea(light, segments, perFoot, aspect, buildPolygon)) : [],
  };
}

function buildLitArea(light: LightSource, segments: SightSegment[], perFoot: number, aspect: number, buildPolygon: BuildPolygon): LitArea {
  const at = toViewPoint(light.at, aspect);
  const reach = (light.brightFeet + light.dimFeet) * perFoot;
  return { at, polygon: buildPolygon(at, segments, reach), bright: light.brightFeet * perFoot, reach };
}

const findDistance = (from: ViewPoint, to: ViewPoint) => Math.hypot(to.x - from.x, to.y - from.y);

/// Точку видно, якщо до неї є пряма лінія від ока і її освітлено, або вона в темнозорі того самого ока.
export function findPointSight(point: TokenPosition, sight: SceneSight): PointSight {
  const at = toViewPoint(point, sight.aspect);
  const seeing = sight.eyes.filter((eye) => isPointInPolygon(at, eye.polygon));
  if (!seeing.length) return "hidden";
  const lit = sight.lights.filter((light) => findDistance(light.at, at) <= light.reach && isPointInPolygon(at, light.polygon));
  const inDarkvision = seeing.some((eye) => findDistance(eye.at, at) <= eye.darkvision);
  if (sight.lighting === "bright" || lit.some((light) => findDistance(light.at, at) <= light.bright) || (sight.lighting === "dim" && inDarkvision)) return "bright";
  if (sight.lighting === "dim" || lit.length || inDarkvision || seeing.some((eye) => findDistance(eye.at, at) <= eye.ownCell)) return "dim";
  return "hidden";
}

/// Велику істоту видно, якщо видно її центр або будь-який кут її квадрата.
export function isTokenSeen(position: TokenPosition, sizeCells: number, sight: SceneSight, frame: MapFrame | null): boolean {
  if (findPointSight(position, sight) !== "hidden") return true;
  if (!frame) return false;
  const half = { x: (sizeCells / frame.grid.columns) * 0.45, y: ((sizeCells / frame.grid.columns) * frame.aspect) * 0.45 };
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].some(([dx, dy]) => findPointSight({ x: position.x + dx * half.x, y: position.y + dy * half.y }, sight) !== "hidden");
}

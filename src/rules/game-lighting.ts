import { FEET_PER_CELL, MAP_VIEW_WIDTH, findViewUnitsPerFoot, toViewPoint, type MapFrame } from "./game-grid";
import type { TokenPosition } from "./game-map";
import { parseHexColor } from "./map-colors";
import { buildVisibilityPolygon, isPointInPolygon, type SightSegment, type ViewPoint } from "./map-visibility";

export const SCENE_LIGHTINGS = ["off", "bright", "dim", "dark"] as const;
export type SceneLighting = (typeof SCENE_LIGHTINGS)[number];
export const LIGHT_EFFECTS = ["steady", "flicker", "pulse"] as const;
export type LightEffect = (typeof LIGHT_EFFECTS)[number];
/// Як темний зір малює неосвітлену темряву: сірим, притемнено-синім чи «тепловізором» (інфразір старих редакцій).
export const DARKVISION_LOOKS = ["grey", "dim", "heat"] as const;
export type DarkvisionLook = (typeof DARKVISION_LOOKS)[number];
export type TokenLight = { brightFeet: number; dimFeet: number };
/// Напрямок — градуси за годинниковою стрілкою від «праворуч»; 360° конуса — звичайне коло. Колір null — тепле світло без барви.
export type LightLook = { color: string | null; coneDegrees: number; directionDegrees: number; effect: LightEffect };
export type LightSource = TokenLight & { at: TokenPosition; look: LightLook };
export type SceneLightView = LightSource & { id: number; isOn: boolean };
export type Eye = { at: TokenPosition; darkvisionFeet: number };
export type SightInput = { lighting: SceneLighting; segments: SightSegment[]; lights: LightSource[]; eyes: Eye[]; frame: MapFrame | null; aspect: number };
export type PointSight = "bright" | "dim" | "hidden";

export type LitArea = { at: ViewPoint; polygon: ViewPoint[]; bright: number; reach: number; look: LightLook };
export type SeeingEye = { at: ViewPoint; polygon: ViewPoint[]; darkvision: number; ownCell: number };
export type SceneSight = { lighting: Exclude<SceneLighting, "off">; aspect: number; eyes: SeeingEye[]; lights: LitArea[] };

export const LIGHT_LIMITS = { perScene: 40, feet: 300, cone: { min: 15, max: 360, step: 15 }, directionStep: 15 } as const;
export const DEFAULT_LIGHT_LOOK: LightLook = { color: null, coneDegrees: 360, directionDegrees: 0, effect: "steady" };
/// Око завжди бачить свою клітинку, щоб у темряві гравець не загубив токен.
export const OWN_CELL_FEET = FEET_PER_CELL;

/// Числа з PHB; конус задано лише «Ліхтарю-прожектору».
export const LIGHT_PRESETS: Array<TokenLight & { key: string; name: string; coneDegrees?: number }> = [
  { key: "candle", name: "Свічка", brightFeet: 5, dimFeet: 5 },
  { key: "torch", name: "Смолоскип", brightFeet: 20, dimFeet: 20 },
  { key: "hooded-lantern", name: "Ліхтар з капюшоном", brightFeet: 30, dimFeet: 30 },
  { key: "bullseye-lantern", name: "Ліхтар-прожектор", brightFeet: 60, dimFeet: 60, coneDegrees: 60 },
  { key: "light", name: "Світло", brightFeet: 20, dimFeet: 20 },
  { key: "daylight", name: "Денне світло", brightFeet: 60, dimFeet: 60 },
  { key: "dancing-lights", name: "Мерехтливі вогники", brightFeet: 0, dimFeet: 10 },
];

const isFeet = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= LIGHT_LIMITS.feet;
const isShare = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const isWhole = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const isLightEffect = (value: unknown): value is LightEffect => LIGHT_EFFECTS.some((effect) => effect === value);

export function parseSceneLighting(raw: unknown): SceneLighting | null {
  return SCENE_LIGHTINGS.find((lighting) => lighting === raw) ?? null;
}

export function parseDarkvisionLook(raw: unknown): DarkvisionLook | null {
  return DARKVISION_LOOKS.find((look) => look === raw) ?? null;
}

export function parseTokenLight(raw: unknown): TokenLight | null {
  if (!raw || typeof raw !== "object") return null;
  const { brightFeet, dimFeet } = raw as Record<string, unknown>;
  return isFeet(brightFeet) && isFeet(dimFeet) ? { brightFeet, dimFeet } : null;
}

/// Світло без вигляду (імпорт UVTT, стара вкладка) — звичайне коло.
export function parseLightLook(raw: unknown): LightLook | null {
  if (raw === undefined) return DEFAULT_LIGHT_LOOK;
  if (!raw || typeof raw !== "object") return null;
  const { color, coneDegrees, directionDegrees, effect } = raw as Record<string, unknown>;
  const hex = parseHexColor(color);
  if ((color !== null && hex === null) || !isWhole(coneDegrees, LIGHT_LIMITS.cone.min, LIGHT_LIMITS.cone.max) || !isWhole(directionDegrees, 0, 359) || !isLightEffect(effect)) return null;
  return { color: hex, coneDegrees, directionDegrees, effect };
}

export function parseLightSource(raw: unknown): LightSource | null {
  const light = parseTokenLight(raw);
  const { at, look: rawLook } = (raw ?? {}) as { at?: { x?: unknown; y?: unknown }; look?: unknown };
  const look = parseLightLook(rawLook);
  return light && look && isShare(at?.x) && isShare(at?.y) ? { ...light, at: { x: at.x, y: at.y }, look } : null;
}

type SceneLightRow = { id: number; x: number; y: number; brightFeet: number; dimFeet: number; isOn: boolean; color: string | null; coneDegrees: number; directionDegrees: number; effect: string };

export function buildSceneLightViews(rows: SceneLightRow[], isGm: boolean): SceneLightView[] {
  return rows
    .filter((row) => isGm || row.isOn)
    .map(({ id, x, y, brightFeet, dimFeet, isOn, color, coneDegrees, directionDegrees, effect }) => ({ id, at: { x, y }, brightFeet, dimFeet, isOn, look: parseLightLook({ color, coneDegrees, directionDegrees, effect }) ?? DEFAULT_LIGHT_LOOK }));
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
  const polygon = buildPolygon(at, segments, reach);
  const { coneDegrees, directionDegrees } = light.look;
  return { at, polygon: coneDegrees < 360 ? clipPolygonToCone(at, polygon, directionDegrees, coneDegrees) : polygon, bright: light.brightFeet * perFoot, reach, look: light.look };
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const findTurn = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/// Многокутник видимості впорядкований за кутом навколо джерела, тож конус — це його вершини всередині кута плюс точки на двох краях.
export function clipPolygonToCone(at: ViewPoint, polygon: ViewPoint[], directionDegrees: number, coneDegrees: number): ViewPoint[] {
  if (polygon.length < 3) return polygon;
  const middle = toRadians(directionDegrees);
  const half = toRadians(coneDegrees) / 2;
  const findOffset = (point: ViewPoint) => findTurn(Math.atan2(point.y - at.y, point.x - at.x) - middle);
  const inside = polygon.filter((point) => Math.abs(findOffset(point)) < half).toSorted((left, right) => findOffset(left) - findOffset(right));
  return [at, castToPolygonEdge(at, middle - half, polygon), ...inside, castToPolygonEdge(at, middle + half, polygon)];
}

function castToPolygonEdge(at: ViewPoint, angle: number, polygon: ViewPoint[]): ViewPoint {
  const ray = { x: Math.cos(angle), y: Math.sin(angle) };
  let nearest = Infinity;
  for (let index = 0; index < polygon.length; index++) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const edge = { x: end.x - start.x, y: end.y - start.y };
    const denominator = ray.x * edge.y - ray.y * edge.x;
    if (Math.abs(denominator) < 1e-12) continue;
    const gap = { x: start.x - at.x, y: start.y - at.y };
    const distance = (gap.x * edge.y - gap.y * edge.x) / denominator;
    const share = (gap.x * ray.y - gap.y * ray.x) / denominator;
    if (distance > 0 && share >= 0 && share <= 1) nearest = Math.min(nearest, distance);
  }
  return Number.isFinite(nearest) ? { x: at.x + ray.x * nearest, y: at.y + ray.y * nearest } : at;
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

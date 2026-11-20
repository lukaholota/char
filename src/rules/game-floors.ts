import type { TokenPosition } from "./game-map";

/// Поверх — шар над основною мапою: id — рівень (1 — над нею, -1 — підвал), null — сама мапа.
export type SceneFloor = { id: number; name: string };
export type FloorId = number | null;
/// Слід поверху складають його видимі обʼєкти: план поверху, меблі на ньому.
export type FloorPiece = {
  floor: FloorId;
  at: TokenPosition;
  widthShare: number;
  aspect: number;
  rotation: number;
};

export const FLOOR_LIMITS = { floors: 6, nameLength: 24, level: 9 } as const;
export const GROUND_FLOOR_NAME = "Основна мапа";

const isLevel = (value: unknown): value is number => Number.isInteger(value) && value !== 0 && Math.abs(value as number) <= FLOOR_LIMITS.level;

export function parseFloorName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  return name && name.length <= FLOOR_LIMITS.nameLength ? name : null;
}

export const parseFloorId = (raw: unknown): FloorId | undefined => (raw === null ? null : isLevel(raw) ? raw : undefined);

/// Згори донизу, як кнопки ліфта.
export function readSceneFloors(raw: unknown): SceneFloor[] {
  if (!Array.isArray(raw)) return [];
  const floors: SceneFloor[] = [];
  for (const item of raw) {
    const { id, name } = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const parsedName = parseFloorName(name);
    if (isLevel(id) && parsedName && !floors.some((floor) => floor.id === id)) floors.push({ id, name: parsedName });
  }
  return floors.slice(0, FLOOR_LIMITS.floors).toSorted((upper, lower) => lower.id - upper.id);
}

export function readShownFloor(raw: unknown, floors: SceneFloor[]): FloorId {
  return floors.some((floor) => floor.id === raw) ? (raw as number) : null;
}

export function addFloor(floors: SceneFloor[], direction: "up" | "down"): { floors: SceneFloor[]; id: number } | null {
  if (floors.length >= FLOOR_LIMITS.floors) return null;
  const levels = floors.map((floor) => floor.id);
  const id = direction === "up" ? Math.max(0, ...levels) + 1 : Math.min(0, ...levels) - 1;
  if (!isLevel(id)) return null;
  return {
    floors: readSceneFloors([...floors, { id, name: buildFloorName(id) }]),
    id,
  };
}

function buildFloorName(id: number): string {
  if (id > 0) return `Поверх ${id + 1}`;
  return id === -1 ? "Підвал" : `Підвал ${-id}`;
}

export function findFloorName(id: FloorId, floors: SceneFloor[]): string {
  return floors.find((floor) => floor.id === id)?.name ?? GROUND_FLOOR_NAME;
}

/// mapAspect — ширина мапи до висоти: поворот обʼєкта рахуємо в квадратних одиницях, а не в частках сторін.
export function isPointOnFloor(point: TokenPosition, floor: FloorId, pieces: FloorPiece[], mapAspect: number): boolean {
  if (floor === null) return false;
  return pieces.some((piece) => piece.floor === floor && isPointInPiece(point, piece, mapAspect));
}

function isPointInPiece(point: TokenPosition, piece: FloorPiece, mapAspect: number): boolean {
  const halfWidth = (piece.widthShare * mapAspect) / 2;
  const halfHeight = halfWidth / piece.aspect;
  const dx = (point.x - piece.at.x) * mapAspect;
  const dy = point.y - piece.at.y;
  const angle = (-piece.rotation * Math.PI) / 180;
  const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
}

/// Токен іншого поверху ховається там, де лежить показаний поверх або його власний; поза будинком його видно з будь-якого.
export function isTokenHiddenByFloor(token: { floor: FloorId; at: TokenPosition }, shown: FloorId, pieces: FloorPiece[], mapAspect: number): boolean {
  if (token.floor === shown) return false;
  return isPointOnFloor(token.at, shown, pieces, mapAspect) || isPointOnFloor(token.at, token.floor, pieces, mapAspect);
}

/// Токен, який поставили там, де його видно, стає на показаний поверх, якщо стоїть на ньому, а поза ним — на основну мапу.
export function findLandingFloor(to: TokenPosition, shown: FloorId, pieces: FloorPiece[], mapAspect: number): FloorId {
  return isPointOnFloor(to, shown, pieces, mapAspect) ? shown : null;
}

export type FloorChange = { kind: "add"; direction: "up" | "down" } | { kind: "rename"; id: number; name: string } | { kind: "remove"; id: number } | { kind: "show"; id: FloorId };
export type FloorState = { floors: SceneFloor[]; shown: FloorId };

export function parseFloorChange(raw: unknown): FloorChange | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { kind, direction, id, name } = raw as Record<string, unknown>;
  if (kind === "add") return direction === "up" || direction === "down" ? { kind, direction } : null;
  if (kind === "show") return id === null || isLevel(id) ? { kind, id } : null;
  if (!isLevel(id)) return null;
  if (kind === "remove") return { kind, id };
  const parsedName = parseFloorName(name);
  return kind === "rename" && parsedName ? { kind, id, name: parsedName } : null;
}

/// Новий поверх одразу показується: майстер додає його, щоб поставити план.
export function applyFloorChange(state: FloorState, change: FloorChange): FloorState | "floor_limit" | "bad_floor" {
  if (change.kind === "add") {
    const added = addFloor(state.floors, change.direction);
    return added ? { floors: added.floors, shown: added.id } : "floor_limit";
  }
  if (change.id !== null && !state.floors.some((floor) => floor.id === change.id)) return "bad_floor";
  if (change.kind === "show") return { ...state, shown: change.id };
  if (change.kind === "rename")
    return {
      ...state,
      floors: state.floors.map((floor) => (floor.id === change.id ? { ...floor, name: change.name } : floor)),
    };
  return {
    floors: state.floors.filter((floor) => floor.id !== change.id),
    shown: state.shown === change.id ? null : state.shown,
  };
}

import type { TokenPosition } from "./game-map";

export const FEET_PER_CELL = 5;
export const GRID_COLUMN_RANGE = { min: 2, max: 300 } as const;
export const GRID_OPACITY_RANGE = { min: 0.1, max: 1, step: 0.05, initial: 0.35 } as const;
/// Ширина мапи в одиницях SVG-шару; висота — MAP_VIEW_WIDTH / aspect, тож коло лишається колом.
export const MAP_VIEW_WIDTH = 100;

/// Сітка — накладна координатна система: скільки клітинок завширшки мапа й зсув першої лінії в частках клітинки.
export type SceneGrid = { columns: number; offsetX: number; offsetY: number; isVisible: boolean; opacity: number };
/// aspect — ширина мапи, поділена на висоту; позиції на мапі — частки ширини й висоти.
export type MapFrame = { aspect: number; grid: SceneGrid };
export type GridCell = { column: number; row: number };

const wrapOffset = (value: number) => ((value % 1) + 1) % 1;

export function parseSceneGrid(raw: unknown): SceneGrid | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { columns, offsetX = 0, offsetY = 0, isVisible = true, opacity = GRID_OPACITY_RANGE.initial } = raw as Record<string, unknown>;
  if (typeof columns !== "number" || !Number.isFinite(columns) || columns < GRID_COLUMN_RANGE.min || columns > GRID_COLUMN_RANGE.max) return null;
  if (typeof offsetX !== "number" || typeof offsetY !== "number" || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null;
  return { columns: Math.round(columns * 100) / 100, offsetX: Math.round(wrapOffset(offsetX) * 1000) / 1000, offsetY: Math.round(wrapOffset(offsetY) * 1000) / 1000, isVisible: isVisible !== false, opacity: clampGridOpacity(opacity) };
}

function clampGridOpacity(raw: unknown): number {
  const opacity = typeof raw === "number" && Number.isFinite(raw) ? raw : GRID_OPACITY_RANGE.initial;
  return Math.round(Math.min(GRID_OPACITY_RANGE.max, Math.max(GRID_OPACITY_RANGE.min, opacity)) * 100) / 100;
}

export function findRowsPerColumn(frame: MapFrame): number {
  return frame.grid.columns / frame.aspect;
}

/// Скільки цілих клітинок видно на мапі й скільки це футів: так майстер звіряє сітку з намальованою.
export function findGridSize(frame: MapFrame): { columns: number; rows: number; widthFeet: number; heightFeet: number } {
  const columns = Math.round(frame.grid.columns);
  const rows = Math.round(findRowsPerColumn(frame));
  return { columns, rows, widthFeet: columns * FEET_PER_CELL, heightFeet: rows * FEET_PER_CELL };
}

export function findCell(point: TokenPosition, frame: MapFrame): GridCell {
  return {
    column: Math.floor(point.x * frame.grid.columns - frame.grid.offsetX),
    row: Math.floor(point.y * findRowsPerColumn(frame) - frame.grid.offsetY),
  };
}

/// Токен непарного розміру стає в центр клітинки, парного (2×2, 4×4) — на перетин ліній: так він закриває цілі клітинки.
export function snapToGrid(point: TokenPosition, frame: MapFrame, sizeCells = 1): TokenPosition {
  const shift = sizeCells % 2 === 1 ? 0.5 : 0;
  const snapAxis = (value: number, cellsAcross: number, offset: number) => {
    const cells = Math.round(value * cellsAcross - offset - shift) + shift + offset;
    return Math.min(1, Math.max(0, cells / cellsAcross));
  };
  return { x: snapAxis(point.x, frame.grid.columns, frame.grid.offsetX), y: snapAxis(point.y, findRowsPerColumn(frame), frame.grid.offsetY) };
}

/// Правило сітки обох редакцій: кожна клітинка, і по діагоналі теж, — 5 футів.
export function measureGridFeet(from: TokenPosition, to: TokenPosition, frame: MapFrame): number {
  const a = findCell(from, frame);
  const b = findCell(to, frame);
  return Math.max(Math.abs(a.column - b.column), Math.abs(a.row - b.row)) * FEET_PER_CELL;
}

/// Вектор у футах; вісь y дивиться вниз, як на екрані.
export function findFeetVector(from: TokenPosition, to: TokenPosition, frame: MapFrame): { x: number; y: number } {
  return { x: (to.x - from.x) * frame.grid.columns * FEET_PER_CELL, y: (to.y - from.y) * findRowsPerColumn(frame) * FEET_PER_CELL };
}

export function moveByFeet(from: TokenPosition, feet: { x: number; y: number }, frame: MapFrame): TokenPosition {
  return { x: from.x + feet.x / (frame.grid.columns * FEET_PER_CELL), y: from.y + feet.y / (findRowsPerColumn(frame) * FEET_PER_CELL) };
}

export function findViewUnitsPerFoot(frame: MapFrame): number {
  return MAP_VIEW_WIDTH / (frame.grid.columns * FEET_PER_CELL);
}

export function toViewPoint(point: TokenPosition, aspect: number): { x: number; y: number } {
  return { x: point.x * MAP_VIEW_WIDTH, y: (point.y * MAP_VIEW_WIDTH) / aspect };
}

/// Лінії сітки одним шляхом SVG у координатах шару 100 × 100/aspect.
export function buildGridLinesPath(frame: MapFrame): string {
  const cell = MAP_VIEW_WIDTH / frame.grid.columns;
  const height = MAP_VIEW_WIDTH / frame.aspect;
  const lines: string[] = [];
  for (let x = frame.grid.offsetX * cell; x <= MAP_VIEW_WIDTH + 1e-6; x += cell) lines.push(`M${x.toFixed(3)} 0V${height.toFixed(3)}`);
  for (let y = frame.grid.offsetY * cell; y <= height + 1e-6; y += cell) lines.push(`M0 ${y.toFixed(3)}H${MAP_VIEW_WIDTH}`);
  return lines.join("");
}

/// Ряди сітки з мапи бібліотеки: стовпців стільки, скільки клітинок намальовано на картинці.
export function buildLibraryGrid(grid: { columns: number; rows: number } | null): SceneGrid | null {
  return grid ? parseSceneGrid({ columns: grid.columns, offsetX: 0, offsetY: 0, isVisible: true }) : null;
}

/// Майстер обводить рамкою cellsAcross × cellsAcross намальованих клітинок; клітинка квадратна, тож беремо середнє двох сторін.
export function buildGridFromCells(rect: { x: number; y: number; width: number; height: number }, cellsAcross: number, aspect: number): SceneGrid | null {
  const meanWidthShare = (Math.abs(rect.width) + Math.abs(rect.height) / aspect) / 2;
  if (!(meanWidthShare > 0) || !(cellsAcross >= 1)) return null;
  const columns = cellsAcross / meanWidthShare;
  const left = Math.min(rect.x, rect.x + rect.width);
  const top = Math.min(rect.y, rect.y + rect.height);
  return parseSceneGrid({ columns, offsetX: left * columns, offsetY: (top * columns) / aspect, isVisible: true });
}

/// Точка області стає на перетин ліній або в центр клітинки — як у правилах сітки й для аури навколо істоти.
export function snapToHalfCell(point: TokenPosition, frame: MapFrame): TokenPosition {
  const halfGrid = { ...frame.grid, columns: frame.grid.columns * 2, offsetX: (frame.grid.offsetX * 2) % 1, offsetY: (frame.grid.offsetY * 2) % 1 };
  return snapToGrid(point, { aspect: frame.aspect, grid: halfGrid }, 2);
}

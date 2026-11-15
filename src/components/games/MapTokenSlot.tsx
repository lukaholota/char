"use client";

import type { CSSProperties, ReactNode } from "react";
import { THUMBNAIL_PX } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { snapToGrid, type MapFrame } from "@/rules/game-grid";
import type { TokenPosition } from "@/rules/game-map";
import type { TokenConditions } from "@/rules/token-conditions";
import type { TokenTransform } from "@/rules/token-transform";
import type { TokenRef } from "./use-token-conditions";
import { SMALLEST_SCALE_WITH_NAMES, TOKEN_SIZE_PX } from "./use-token-scale";

const SMALLEST_TOKEN_ON_SCREEN_PX = 28;
const SMALLEST_TOKEN_WITH_NAMES_PX = 24;
export const COUNTER_ZOOM = "scale(calc(1 / var(--map-zoom, 1)))";

/// cellPx — ширина клітинки на незбільшеній мапі; без сітки токен тримає сталий розмір на екрані за будь-якого масштабу.
export type TokenLayout = {
  cellPx: number | null;
  scale: number;
  zoom: number;
  frame: MapFrame | null;
  isHidden: (position: TokenPosition, cells: number) => boolean;
  revealClassName?: string;
  isHighlighted: (position: TokenPosition, cells: number) => boolean;
  isCutoutOutlined: boolean;
  findFreeSpot: () => TokenPosition;
};

export type TokenOnBoard = { screenPx: number; labelWidth: number; isHighlighted: boolean; isOutlined: boolean; rotation: number };
export type TokenDrag = { key: string; from: TokenPosition | null; to: TokenPosition | null; cells: number; isBlocked?: boolean };
export type TokenGroupBinding = { isGrouped: (key: string) => boolean; moveWith: (key: string, to: TokenPosition) => boolean };
export type GroupTokenLook = { token: TokenRef; conditions: TokenConditions; transform: TokenTransform; showTransform: (transform: TokenTransform) => void; sendTransform: (transform: TokenTransform) => void };
export type PlacedToken = { key: string; name: string; position: TokenPosition; cells: number; creatureId?: number; persId?: number };

export function findBoardTokenSize(layout: TokenLayout, cells: number, sizeScale: number): string {
  if (layout.cellPx) return `max(calc(${(layout.cellPx * cells).toFixed(2)}px * var(--map-zoom, 1)), ${SMALLEST_TOKEN_ON_SCREEN_PX}px)`;
  return `${Math.round(TOKEN_SIZE_PX * layout.scale * sizeScale)}px`;
}

export function findGhostTokenSize(layout: TokenLayout, cells: number, sizeScale: number): number {
  if (layout.cellPx) return Math.round(Math.max(SMALLEST_TOKEN_ON_SCREEN_PX, layout.cellPx * cells * layout.zoom));
  return Math.round(TOKEN_SIZE_PX * layout.scale * sizeScale);
}

export const buildTokenSizeStyle = (size: string | number): CSSProperties => ({ width: size, height: size, "--token-size": typeof size === "number" ? `${size}px` : size }) as CSSProperties;

/// Мініатюра має THUMBNAIL_PX фізичних пікселів; більший токен на екрані з нею розмився б.
export const isAboveThumbnail = (screenPx: number) => screenPx * (typeof window === "undefined" ? 1 : window.devicePixelRatio) > THUMBNAIL_PX;

export function findLabelWidth(layout: TokenLayout, sizeScale: number): number {
  return layout.cellPx ? TOKEN_SIZE_PX : Math.round(TOKEN_SIZE_PX * layout.scale * sizeScale);
}

/// На сітці імʼя має сенс під токеном, видимим на екрані: велика істота підписана й на дрібній клітинці.
export function hasTokenNames(layout: TokenLayout, cells = 1): boolean {
  return layout.cellPx ? layout.cellPx * cells * layout.zoom >= SMALLEST_TOKEN_WITH_NAMES_PX : layout.scale >= SMALLEST_SCALE_WITH_NAMES;
}

/// Велика істота стає кутами на перетини ліній, середня — у центр клітинки.
export function snapTokenPosition(position: TokenPosition, layout: TokenLayout, cells: number): TokenPosition {
  return layout.frame ? snapToGrid(position, layout.frame, Math.max(1, Math.round(cells))) : position;
}

/// size — розмір на екрані: слот знімає масштаб мапи навколо центру обличчя, тож рамки, бейджі й підписи не роздуваються.
/// Центр обличчя стоїть точно в позиції; імʼя і стани висять нижче й не зсувають його.
/// Учасник групи, поки тягнуть іншого, зсувається на крок із --group-dx/--group-dy, які ставить контейнер токенів.
export function MapTokenSlot({ position, size, isGroupFollower = false, className, children }: { position: TokenPosition; size: string; isGroupFollower?: boolean; className?: string; children: ReactNode }) {
  const style: CSSProperties = {
    left: isGroupFollower ? `clamp(0%, calc((${position.x} + var(--group-dx, 0)) * 100%), 100%)` : `${position.x * 100}%`,
    top: isGroupFollower ? `clamp(0%, calc((${position.y} + var(--group-dy, 0)) * 100%), 100%)` : `${position.y * 100}%`,
    transform: `translate(-50%, calc(${size} / -2)) ${COUNTER_ZOOM}`,
    transformOrigin: `50% calc(${size} / 2)`,
  };
  return (
    <div className={cn("pointer-events-auto absolute", className)} style={style}>
      {children}
    </div>
  );
}


export const HIGHLIGHT_RING_CLASS = "outline outline-2 outline-offset-2 outline-amber-300";

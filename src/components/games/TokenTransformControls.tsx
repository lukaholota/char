"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_TOKEN_TRANSFORM, TOKEN_SCALE_RANGE, findDraggedRotation, findDraggedScale, isDefaultTokenTransform, resizeToken, turnToken, type TokenTransform } from "@/rules/token-transform";
import { Stepper, ToolPanel } from "./MapToolbar";

type ScreenPoint = { clientX: number; clientY: number };
type HandleKind = "rotate" | "scale";

export type TokenSelection = ReturnType<typeof useTokenSelection>;

/// Вибраний токен: ручки на мапі показують зміни одразу, а зберігає їх onChange.
export type SelectedToken = {
  key: string;
  name: string;
  transform: TokenTransform;
  openLabel: string;
  onOpen: () => void;
  onPreview: (transform: TokenTransform) => void;
  onChange: (transform: TokenTransform) => void;
};

/// Перший дотик до токена на мапі вибирає його для повороту й розміру, другий — відкриває картку.
/// Поки відкритий інструмент мапи, вибору немає: дотик одразу відкриває картку, як раніше.
export function useTokenSelection(canSelect: boolean) {
  const [chosenKey, select] = useState<string | null>(null);
  const key = canSelect ? chosenKey : null;
  const tap = (tapped: string, open: () => void) => {
    if (key === tapped || !canSelect) open();
    else select(tapped);
  };
  return { key, select, tap };
}

const SCALE_STEP = 10;
const ROTATION_STEP = 15;

export function scaleTokenSize(size: string, transform: TokenTransform): string {
  return transform.scale === 100 ? size : `calc(${size} * ${transform.scale / 100})`;
}

export function scaleGhostSize(size: number, transform: TokenTransform): number {
  return Math.round((size * transform.scale) / 100);
}

export function findTokenRotationStyle(rotation: number) {
  return rotation ? { transform: `rotate(${rotation}deg)` } : undefined;
}

const describeScale = (transform: TokenTransform) => `${transform.scale}%`;
const describeRotation = (transform: TokenTransform) => `${transform.rotation}°`;

/// Рамка повертається разом із портретом, тож ручка повороту завжди над «головою» токена.
export function TokenTransformHandles({ token, onDeselect }: { token: SelectedToken; onDeselect: () => void }) {
  const [readout, setReadout] = useState<string | null>(null);
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10" style={findTokenRotationStyle(token.transform.rotation)}>
        <span aria-hidden className="absolute -inset-1.5 rounded-md border-2 border-dashed border-arcane-200" />
        <span aria-hidden className="absolute bottom-full left-1/2 mb-1.5 h-4 w-0.5 -translate-x-1/2 bg-arcane-200" />
        <TransformHandle kind="rotate" token={token} onReadout={setReadout} onDeselect={onDeselect} />
        <TransformHandle kind="scale" token={token} onReadout={setReadout} onDeselect={onDeselect} />
      </div>
      {readout ? (
        <span aria-hidden className="pointer-events-none absolute right-full top-1/2 z-10 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-950/90 px-1.5 py-0.5 text-xs tabular-nums text-arcane-100 ring-1 ring-arcane-300/60">
          {readout}
        </span>
      ) : null}
    </>
  );
}

const HANDLE_LOOKS: Record<HandleKind, { label: string; style: { left: string; top: string } }> = {
  rotate: { label: "Повернути токен: тягніть по колу або стрілками", style: { left: "50%", top: "-2.25rem" } },
  scale: { label: "Розмір токена: тягніть від центру чи до центру або стрілками", style: { left: "calc(100% + 0.375rem)", top: "calc(100% + 0.375rem)" } },
};

type HandleProps = { kind: HandleKind; token: SelectedToken; onReadout: (text: string | null) => void; onDeselect: () => void };
type HandleDrag = { start: TokenTransform; centre: ScreenPoint; from: ScreenPoint; last: TokenTransform };

function TransformHandle({ kind, token, onReadout, onDeselect }: HandleProps) {
  const drag = useRef<HandleDrag | null>(null);
  const findNext = (current: HandleDrag, point: ScreenPoint): TokenTransform =>
    kind === "rotate"
      ? { ...current.start, rotation: findDraggedRotation(current.start.rotation, current.centre, current.from, point) }
      : { ...current.start, scale: findDraggedScale(current.start.scale, current.centre, current.from, point) };
  const describe = kind === "rotate" ? describeRotation : describeScale;

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const frame = event.currentTarget.parentElement!.getBoundingClientRect();
    const centre = { clientX: frame.left + frame.width / 2, clientY: frame.top + frame.height / 2 };
    drag.current = { start: token.transform, centre, from: { clientX: event.clientX, clientY: event.clientY }, last: token.transform };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const next = findNext(drag.current, { clientX: event.clientX, clientY: event.clientY });
    if (next.rotation === drag.current.last.rotation && next.scale === drag.current.last.scale) return;
    drag.current.last = next;
    token.onPreview(next);
    onReadout(describe(next));
  };
  const finishDrag = () => {
    const finished = drag.current;
    drag.current = null;
    onReadout(null);
    if (finished && (finished.last.rotation !== finished.start.rotation || finished.last.scale !== finished.start.scale)) token.onChange(finished.last);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction = event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : event.key === "ArrowDown" || event.key === "ArrowLeft" ? -1 : 0;
    if (event.key === "Escape") onDeselect();
    else if (direction && kind === "rotate") token.onChange(turnToken(token.transform, direction * ROTATION_STEP));
    else if (direction) token.onChange(resizeToken(token.transform, token.transform.scale + direction * SCALE_STEP));
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const look = HANDLE_LOOKS[kind];
  return (
    <button
      type="button"
      data-map-control
      aria-label={`${look.label}. Зараз ${describe(token.transform)}`}
      className="pointer-events-auto absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-full"
      style={look.style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onKeyDown={onKeyDown}
    >
      {kind === "rotate" ? (
        <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full border-2 border-slate-950 bg-arcane-200 text-slate-950 shadow-lg shadow-black/60">
          <RotateCw className="h-3.5 w-3.5" />
        </span>
      ) : (
        <span aria-hidden className="block h-4 w-4 rounded-sm border-2 border-slate-950 bg-arcane-200 shadow-lg shadow-black/60" />
      )}
    </button>
  );
}

export function TokenTransformPanel({ token, onClose }: { token: SelectedToken; onClose: () => void }) {
  const { transform, onChange } = token;
  return (
    <ToolPanel title={token.name} onClose={onClose}>
      <Stepper
        label="Розмір"
        value={describeScale(transform)}
        onStep={(direction) => onChange(resizeToken(transform, transform.scale + direction * SCALE_STEP))}
        canDecrease={transform.scale > TOKEN_SCALE_RANGE.min}
        canIncrease={transform.scale < TOKEN_SCALE_RANGE.max}
      />
      <div role="group" aria-label="Поворот" className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-sm text-slate-300">Поворот</span>
        <TurnButton label={`Повернути на ${ROTATION_STEP}° проти годинникової`} onClick={() => onChange(turnToken(transform, -ROTATION_STEP))}>
          <RotateCcw className="h-4 w-4" aria-hidden />
        </TurnButton>
        <output aria-live="polite" className="min-w-14 text-center text-base tabular-nums text-slate-100">{describeRotation(transform)}</output>
        <TurnButton label={`Повернути на ${ROTATION_STEP}° за годинниковою`} onClick={() => onChange(turnToken(transform, ROTATION_STEP))}>
          <RotateCw className="h-4 w-4" aria-hidden />
        </TurnButton>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
        <Button type="button" variant="outline" onClick={token.onOpen} className="h-11 px-4">{token.openLabel}</Button>
        <Button type="button" variant="ghost" onClick={() => onChange(DEFAULT_TOKEN_TRANSFORM)} disabled={isDefaultTokenTransform(transform)} className="h-11 px-3 text-slate-400">Скинути</Button>
      </div>
      <p className="text-sm leading-snug text-slate-400">На мапі тягніть верхню ручку, щоб повернути, і кутову, щоб змінити розмір. Дотик до порожнього місця знімає вибір.</p>
    </ToolPanel>
  );
}

function TurnButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-200 hover:bg-white/10">
      {children}
    </button>
  );
}

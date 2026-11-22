"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { RotateCcw, RotateCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_TOKEN_TRANSFORM, TOKEN_SCALE_RANGE, findDraggedRotation, findDraggedScale, isDefaultTokenTransform, resizeToken, turnToken, type ScaleRange, type TokenTransform } from "@/rules/token-transform";
import type { SpotlightStyle } from "@/rules/token-conditions";
import { COUNTER_ZOOM } from "./MapTokenSlot";
import { ToolPanel } from "./MapToolbar";
import { SpotlightAura } from "./combat-turn";
import type { TokenLightTarget } from "./use-map-lights";
import type { SpotlightControl } from "./use-token-conditions";

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
  lightTarget: TokenLightTarget;
  spotlight: SpotlightControl | null;
  sheetLabel: string;
  sheet: ReactNode;
  showRoomSheet: (() => void) | null;
  remove: (() => void) | null;
  settings: ReactNode;
};

export type TokenPanelTab = "sheet" | "token";

/// Перший дотик до токена на мапі вибирає його й закриває відкритий інструмент. Другий на компʼютері перемикає вкладки бічної панелі, на телефоні — відкриває картку.
/// Під час прицілювання й шаблону зони дотик одразу відкриває картку: панель зайнята завданням.
export function useTokenSelection(canSelect: boolean, closeTool: (() => void) | null, hasSidePanel: boolean) {
  const [chosen, setChosen] = useState<{ key: string; tab: TokenPanelTab } | null>(null);
  const key = canSelect && !closeTool ? (chosen?.key ?? null) : null;
  const tab = chosen?.tab ?? "sheet";
  const select = (next: string | null, nextTab: TokenPanelTab = "sheet") => setChosen(next ? { key: next, tab: nextTab } : null);
  const pick = (tapped: string | null) => {
    if (!tapped) return false;
    closeTool?.();
    select(tapped);
    return true;
  };
  const tap = (tapped: string, open: () => void) => {
    if (!canSelect) return open();
    if (key !== tapped) return void pick(tapped);
    if (hasSidePanel) return select(tapped, tab === "sheet" ? "token" : "sheet");
    open();
  };
  return { key, tab, select, pick, tap };
}

const SCALE_STEP = 10;
const SCALE_SLIDER_STEP = 5;
export const ROTATION_STEP = 15;

export function scaleTokenSize(size: string, transform: TokenTransform): string {
  return transform.scale === 100 ? size : `calc(${size} * ${transform.scale / 100})`;
}

export function scaleGhostSize(size: number, transform: TokenTransform): number {
  return Math.round((size * transform.scale) / 100);
}

export function findTokenRotationStyle(rotation: number) {
  return rotation ? { transform: `rotate(${rotation}deg)` } : undefined;
}

export const describeScale = (transform: TokenTransform) => `${transform.scale}%`;
export const describeRotation = (transform: TokenTransform) => `${transform.rotation}°`;

/// Обʼєкт мапи (план поверху) може бути в сотні разів більшим за токен, тож має власні межі й підпис розміру.
/// growsWithMap — обʼєкт мапи масштабується разом із нею, тож ручки протизумлені й лишаються сталими на екрані.
type TransformTarget = Pick<SelectedToken, "transform" | "onPreview" | "onChange"> & Partial<Pick<SelectedToken, "spotlight">> & { scaleRange?: ScaleRange; describeSize?: (transform: TokenTransform) => string; growsWithMap?: boolean };

type ScreenUnits = { px: (value: number) => string; counterZoom: string };
const buildScreenUnits = (growsWithMap = false): ScreenUnits =>
  growsWithMap ? { px: (value) => `calc(${value}px / var(--map-zoom, 1))`, counterZoom: COUNTER_ZOOM } : { px: (value) => `${value}px`, counterZoom: "" };

/// Рамка повертається разом із портретом, тож ручка повороту завжди над «головою» токена. Ручки стоять поза рамкою, щоб дрібний обʼєкт лишався під пальцем для перетягування.
export function TokenTransformHandles({ token, onDeselect }: { token: TransformTarget; onDeselect: () => void }) {
  const [readout, setReadout] = useState<string | null>(null);
  const units = buildScreenUnits(token.growsWithMap);
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10" style={findTokenRotationStyle(token.transform.rotation)}>
        <span aria-hidden className="absolute rounded-md border-dashed border-arcane-200" style={{ inset: units.px(-6), borderWidth: units.px(2) }} />
        <span aria-hidden className="absolute left-1/2 -translate-x-1/2 bg-arcane-200" style={{ bottom: `calc(100% + ${units.px(6)})`, height: units.px(16), width: units.px(2) }} />
        <TransformHandle kind="rotate" token={token} units={units} onReadout={setReadout} onDeselect={onDeselect} />
        <TransformHandle kind="scale" token={token} units={units} onReadout={setReadout} onDeselect={onDeselect} />
        {token.spotlight ? <SpotlightHandle spotlight={token.spotlight} units={units} onDeselect={onDeselect} /> : null}
      </div>
      {readout ? (
        <span aria-hidden className="pointer-events-none absolute right-full top-1/2 z-10 whitespace-nowrap rounded-md bg-slate-950/90 px-1.5 py-0.5 text-xs tabular-nums text-arcane-100 ring-1 ring-arcane-300/60" style={{ marginRight: units.px(12), transform: `translateY(-50%) ${units.counterZoom}`, transformOrigin: "100% 50%" }}>
          {readout}
        </span>
      ) : null}
    </>
  );
}

/// Річ у групі з рамки: та сама пунктирна рамка, що й у вибраної, але без ручок — група крутиться й росте лише поодинці.
export function GroupedTokenFrame({ rotation }: { rotation: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-10" style={findTokenRotationStyle(rotation)}>
      <span className="absolute -inset-1.5 rounded-md border-2 border-dashed border-arcane-200" />
    </span>
  );
}

const HANDLE_PX = 44;
const HANDLE_LABELS: Record<HandleKind, string> = {
  rotate: "Повернути токен: тягніть по колу або стрілками",
  scale: "Розмір токена: тягніть від центру чи до центру або стрілками",
};

/// Кутова ручка простягається лише назовні від кута, тож не перекриває сам токен.
const findHandlePlace = (kind: HandleKind, units: ScreenUnits): CSSProperties =>
  kind === "rotate"
    ? { left: "50%", top: units.px(-36), transform: `translate(-50%, -50%) ${units.counterZoom}` }
    : { left: `calc(100% - ${units.px(2)})`, top: `calc(100% - ${units.px(2)})`, transform: units.counterZoom, transformOrigin: "0 0" };

type HandleProps = { kind: HandleKind; token: TransformTarget; units: ScreenUnits; onReadout: (text: string | null) => void; onDeselect: () => void };
type HandleDrag = { start: TokenTransform; centre: ScreenPoint; from: ScreenPoint; last: TokenTransform };

function TransformHandle({ kind, token, units, onReadout, onDeselect }: HandleProps) {
  const drag = useRef<HandleDrag | null>(null);
  const findNext = (current: HandleDrag, point: ScreenPoint): TokenTransform =>
    kind === "rotate"
      ? { ...current.start, rotation: findDraggedRotation(current.start.rotation, current.centre, current.from, point) }
      : { ...current.start, scale: findDraggedScale(current.start.scale, current.centre, current.from, point, token.scaleRange) };
  const describe = kind === "rotate" ? describeRotation : (token.describeSize ?? describeScale);

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
    else if (direction) token.onChange(resizeToken(token.transform, token.transform.scale + direction * SCALE_STEP, token.scaleRange));
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <button
      type="button"
      data-map-control
      aria-label={`${HANDLE_LABELS[kind]}. Зараз ${describe(token.transform)}`}
      className={cn("pointer-events-auto absolute grid h-11 w-11 touch-none rounded-full", kind === "rotate" ? "place-items-center" : "place-items-start")}
      style={findHandlePlace(kind, units)}
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

const SPOTLIGHT_LABEL = "Підсвітка";

function SpotlightHandle({ spotlight, units, onDeselect }: { spotlight: SpotlightControl; units: ScreenUnits; onDeselect: () => void }) {
  return (
    <button
      type="button"
      data-map-control
      aria-label={SPOTLIGHT_LABEL}
      aria-pressed={spotlight.isOn}
      title={SPOTLIGHT_LABEL}
      className="pointer-events-auto absolute grid h-11 w-11 place-items-end rounded-full"
      style={{ left: `calc(${units.px(4)} - ${HANDLE_PX}px)`, top: `calc(${units.px(4)} - ${HANDLE_PX}px)`, transform: units.counterZoom, transformOrigin: "100% 100%" }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={spotlight.onToggle}
      onKeyDown={(event) => event.key === "Escape" && onDeselect()}
    >
      <span aria-hidden className={cn("grid h-6 w-6 place-items-center rounded-full border-2 shadow-lg shadow-black/60", spotlight.isOn ? "border-slate-950 bg-arcane-300 text-slate-950" : "border-arcane-200 bg-slate-950 text-arcane-200")}>
        <Sparkles className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

const SPOTLIGHT_OPTIONS: Array<{ style: SpotlightStyle; label: string }> = [
  { style: "glow", label: "Сяйво" },
  { style: "fire", label: "Полумʼя" },
  { style: "arcane", label: "Чари" },
  { style: "frost", label: "Іній" },
  { style: "rays", label: "Промені" },
  { style: "shadow", label: "Тінь" },
  { style: "storm", label: "Блискавка" },
];

/// Повторний дотик до вибраного вигляду гасить підсвітку.
export function SpotlightPicker({ spotlight }: { spotlight: SpotlightControl }) {
  return (
    <div role="group" aria-label={SPOTLIGHT_LABEL} className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
      <span className="col-span-full text-sm text-slate-300">{SPOTLIGHT_LABEL}</span>
      {SPOTLIGHT_OPTIONS.map(({ style, label }) => {
        const isChosen = spotlight.style === style;
        return (
          <Button key={style} type="button" variant="outline" aria-pressed={isChosen} onClick={() => spotlight.onChoose(isChosen ? null : style)} className={cn("relative isolate h-11 overflow-hidden px-2.5", style === "glow" && "shadow-[inset_0_0_0.6rem] shadow-arcane-300/60", isChosen && "border-arcane-300 bg-arcane-300/20 text-arcane-100")}>
            <SpotlightAura style={style} isInside />
            <span className="relative">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}

export function TokenTransformPanel({ token, onClose, children }: { token: SelectedToken; onClose: () => void; children?: ReactNode }) {
  return (
    <ToolPanel title={token.name} onClose={onClose}>
      <TokenLookControls token={token} action={<Button type="button" variant="outline" onClick={token.onOpen} className="h-11 px-4">{token.openLabel}</Button>} />
      {children}
      <p className="text-sm leading-snug text-slate-400">На мапі тягніть верхню ручку, щоб повернути, і кутову, щоб змінити розмір. Другий дотик по токену відкриває «{token.openLabel}». Дотик до порожнього місця знімає вибір.</p>
    </ToolPanel>
  );
}

export function TokenLookControls({ token, action }: { token: SelectedToken; action?: ReactNode }) {
  const { transform, onChange } = token;
  return (
    <>
      <TokenLookSteps
        scale={transform.scale}
        size={describeScale(transform)}
        rotation={describeRotation(transform)}
        onPreviewScale={(scale) => token.onPreview(resizeToken(transform, scale))}
        onScale={(scale) => onChange(resizeToken(transform, scale))}
        onTurn={(direction) => onChange(turnToken(transform, direction * ROTATION_STEP))}
      />
      {token.spotlight ? <SpotlightPicker spotlight={token.spotlight} /> : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
        {action}
        <Button type="button" variant="ghost" onClick={() => onChange(DEFAULT_TOKEN_TRANSFORM)} disabled={isDefaultTokenTransform(transform)} className="h-11 px-3 text-slate-400">Скинути</Button>
      </div>
    </>
  );
}

type LookStepsProps = { scale: number; size: string; rotation: string; onPreviewScale: (scale: number) => void; onScale: (scale: number) => void; onTurn: (direction: 1 | -1) => void };

export function TokenLookSteps({ scale, size, rotation, onPreviewScale, onScale, onTurn }: LookStepsProps) {
  return (
    <>
      <TokenSizeSlider scale={scale} shown={size} onPreview={onPreviewScale} onCommit={onScale} />
      <div role="group" aria-label="Поворот" className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-sm text-slate-300">Поворот</span>
        <TurnButton label={`Повернути на ${ROTATION_STEP}° проти годинникової`} onClick={() => onTurn(-1)}>
          <RotateCcw className="h-4 w-4" aria-hidden />
        </TurnButton>
        <output aria-live="polite" className="min-w-14 text-center text-base tabular-nums text-slate-100">{rotation}</output>
        <TurnButton label={`Повернути на ${ROTATION_STEP}° за годинниковою`} onClick={() => onTurn(1)}>
          <RotateCw className="h-4 w-4" aria-hidden />
        </TurnButton>
      </div>
    </>
  );
}

/// Під час руху повзунка розмір лише показується; запит іде, коли його відпустили, — інакше кожен піксель став би запитом.
function TokenSizeSlider({ scale, shown, onPreview, onCommit }: { scale: number; shown: string; onPreview: (scale: number) => void; onCommit: (scale: number) => void }) {
  const pending = useRef<number | null>(null);
  const commit = () => {
    if (pending.current === null) return;
    onCommit(pending.current);
    pending.current = null;
  };
  return (
    <label className="flex items-center gap-3 text-sm text-slate-300">
      <span className="shrink-0">Розмір</span>
      <input
        type="range"
        min={TOKEN_SCALE_RANGE.min}
        max={TOKEN_SCALE_RANGE.max}
        step={SCALE_SLIDER_STEP}
        value={scale}
        aria-valuetext={shown}
        onChange={(event) => {
          pending.current = Number(event.target.value);
          onPreview(pending.current);
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="h-11 min-w-0 flex-1 accent-arcane-300"
      />
      <output aria-hidden className="min-w-14 text-right text-base tabular-nums text-slate-100">{shown}</output>
    </label>
  );
}

function TurnButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-200 hover:bg-white/10">
      {children}
    </button>
  );
}

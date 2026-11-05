"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Maximize2, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { clearGameMapAction, moveGameTokenAction, setGameMapAction } from "@/lib/actions/game-sessions";
import { shrinkScreenshotForUpload } from "@/lib/components/portrait/resize-image";
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { findTokenPositionInRect, shiftTokenPosition, type TokenPosition } from "@/rules/game-map";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import { GameAvatar } from "./GameAvatar";
import { ROOM_CARD } from "./GameRoomSidebar";
import { useTokenDrag, type TokenGhost } from "./use-token-drag";
import { SMALLEST_SCALE_WITH_NAMES, TOKEN_SCALE_RANGE, useTokenScale } from "./use-token-scale";

const FULLSCREEN_MAP =
  "inset-0 left-0 top-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none border-0 bg-slate-950 bg-none p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-none sm:p-6";

const TURNED_MAP = "portrait:left-[100vw] portrait:h-[100vw] portrait:w-[100dvh] portrait:origin-top-left portrait:rotate-90";

type SideLayout = { board: string; map: string; controls: string; slider: string };

const SIDE_LAYOUT: SideLayout = {
  board: "flex-row items-center [--map-footer:0px] [--map-side:15rem]",
  map: "mx-0",
  controls: "mx-0 w-56 shrink-0 flex-col items-stretch",
  slider: "flex-none flex-col items-stretch gap-1",
};

const LANDSCAPE_SIDE_LAYOUT: SideLayout = {
  board: "landscape:flex-row landscape:items-center landscape:[--map-footer:0px] landscape:[--map-side:15rem]",
  map: "landscape:mx-0",
  controls: "landscape:mx-0 landscape:w-56 landscape:shrink-0 landscape:flex-col landscape:items-stretch",
  slider: "landscape:flex-none landscape:flex-col landscape:items-stretch landscape:gap-1",
};

const ARROW_STEPS: Record<string, TokenPosition> = {
  ArrowLeft: { x: -0.02, y: 0 },
  ArrowRight: { x: 0.02, y: 0 },
  ArrowUp: { x: 0, y: -0.02 },
  ArrowDown: { x: 0, y: 0.02 },
};

export function GameRoomMap({ view }: { view: GameSessionView }) {
  const canEditMap = view.myRole === "GM" && !view.isArchived;
  const upload = useMapUpload(view.id);
  const moves = useTokenMoves(view);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tokenScale, changeTokenScale] = useTokenScale(view.id);
  const [isTurned, setIsTurned] = useState(false);
  const changeFullscreen = (isOpen: boolean) => {
    setIsFullscreen(isOpen);
    if (!isOpen) setIsTurned(false);
  };
  if (!view.mapImageUrl) {
    if (!canEditMap) return null;
    return (
      <>
        <button type="button" onClick={upload.pick} disabled={upload.isUploading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 text-sm text-slate-300 hover:border-white/40 hover:text-slate-100 disabled:opacity-60">
          <ImagePlus className="h-4 w-4" aria-hidden />
          {upload.isUploading ? "Завантаження мапи…" : "Додати мапу сцени"}
        </button>
        {upload.input}
      </>
    );
  }
  return (
    <section aria-labelledby="game-room-map" className={ROOM_CARD}>
      <div className="flex items-center gap-1">
        <h2 id="game-room-map" className="flex-1 font-rpg-display text-lg text-slate-100">Мапа</h2>
        <Button type="button" variant="ghost" onClick={() => setIsFullscreen(true)} aria-label="Мапа на весь екран" className="h-10 w-10 p-0 text-slate-300">
          <Maximize2 className="h-4 w-4" aria-hidden />
        </Button>
        {canEditMap ? <MapGmControls sessionId={view.id} upload={upload} /> : null}
      </div>
      <TokenBoard view={view} moves={moves} tokenScale={tokenScale} onTokenScaleChange={changeTokenScale} mapImageUrl={view.mapImageUrl} maxMapHeight="calc(100dvh - 13rem)" onMapClick={() => setIsFullscreen(true)} />
      <Dialog open={isFullscreen} onOpenChange={changeFullscreen}>
        <DialogContent data-safe-dialog={undefined} aria-describedby={undefined} closeLabel="Згорнути мапу" className={cn(FULLSCREEN_MAP, isTurned && TURNED_MAP)}>
          <DialogTitle className="truncate pr-12 normal-case leading-10 tracking-normal">{view.name}</DialogTitle>
          {isFullscreen ? <TokenBoard view={view} moves={moves} tokenScale={tokenScale} onTokenScaleChange={changeTokenScale} mapImageUrl={view.mapImageUrl} maxMapHeight="calc(100cqh - var(--map-footer))" isFullscreen turn={{ isTurned, toggle: () => setIsTurned(!isTurned) }} /> : null}
        </DialogContent>
      </Dialog>
      {upload.input}
    </section>
  );
}

function MapGmControls({ sessionId, upload }: { sessionId: number; upload: ReturnType<typeof useMapUpload> }) {
  const router = useModeRouter();
  const [isClearing, setIsClearing] = useState(false);
  const clear = async () => {
    if (!window.confirm("Прибрати мапу? Токени повернуться в ряд під мапою.")) return;
    setIsClearing(true);
    const result = await clearGameMapAction(sessionId);
    setIsClearing(false);
    if (!result.ok) return void toast.error(result.error);
    captureGameEvent("game_map_changed", { has_map: false });
    router.refresh();
  };
  return (
    <>
      <Button type="button" variant="ghost" onClick={upload.pick} disabled={upload.isUploading} className="h-10 gap-1.5 px-2.5 text-slate-300">
        <ImagePlus className="h-4 w-4" aria-hidden />
        {upload.isUploading ? "Завантаження…" : "Змінити"}
      </Button>
      <Button type="button" variant="ghost" onClick={clear} disabled={isClearing} aria-label="Прибрати мапу" className="h-10 w-10 p-0 text-slate-400">
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </>
  );
}

function useMapUpload(sessionId: number) {
  const router = useModeRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function upload(file: File) {
    setIsUploading(true);
    try {
      const shrunk = await shrinkScreenshotForUpload(file);
      if (shrunk.size > MAX_IMAGE_UPLOAD_BYTES) return void toast.error("Картинка завелика навіть після стискання");
      const formData = new FormData();
      formData.append("file", shrunk, "map.webp");
      const result = await setGameMapAction(sessionId, formData);
      if (!result.ok) return void toast.error(result.error);
      captureGameEvent("game_map_changed", { has_map: true });
      router.refresh();
    } catch {
      toast.error("Не вдалося прочитати картинку");
    } finally {
      setIsUploading(false);
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_IMAGE_MIME_TYPES}
      className="hidden"
      aria-label="Картинка мапи"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void upload(file);
      }}
    />
  );
  return { isUploading, input, pick: () => inputRef.current?.click() };
}

type TokenBoardProps = {
  view: GameSessionView;
  moves: TokenMoves;
  tokenScale: number;
  onTokenScaleChange: (scale: number) => void;
  mapImageUrl: string;
  maxMapHeight: string;
  isFullscreen?: boolean;
  turn?: { isTurned: boolean; toggle: () => void };
  onMapClick?: () => void;
};

function TokenBoard({ view, moves, tokenScale, onTokenScaleChange, mapImageUrl, maxMapHeight, isFullscreen = false, turn, onMapClick }: TokenBoardProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isBroken, setIsBroken] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const canMove = (member: GameSessionMemberView) => !view.isArchived && (view.myRole === "GM" || member.userId === view.myUserId);
  const isQuarterTurned = () => Boolean(turn?.isTurned) && window.matchMedia("(orientation: portrait)").matches;
  const findDropPosition = (point: { clientX: number; clientY: number }) => {
    const rect = mapRef.current?.getBoundingClientRect();
    return rect ? findTokenPositionInRect(point, rect, isQuarterTurned()) : null;
  };
  const { ghost, bindToken } = useTokenDrag((userId, point) => {
    const position = findDropPosition(point);
    const member = view.members.find((candidate) => candidate.userId === userId);
    if (member && (position || moves.findPosition(member))) void moves.sendPosition(userId, position);
  }, (point) => findDropPosition(point) !== null);
  const readAspectRatio = (image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth > 0) setAspectRatio(image.naturalWidth / image.naturalHeight);
  };
  const heroes = view.members.filter((member) => member.persId !== null);
  const draggedMember = ghost ? view.members.find((member) => member.userId === ghost.userId) : undefined;
  const waiting = heroes.filter((member) => !moves.findPosition(member));
  const hasPlacedTokens = waiting.length < heroes.length;
  const canTurn = turn && (turn.isTurned || (aspectRatio ?? 0) > 1);
  const side = isFullscreen ? (turn?.isTurned ? SIDE_LAYOUT : LANDSCAPE_SIDE_LAYOUT) : null;

  const renderToken = (member: GameSessionMemberView, scale = 1) => {
    const isMovable = canMove(member);
    const isPlaced = moves.findPosition(member) !== null;
    const onKeyDown = (event: KeyboardEvent) => {
      const step = ARROW_STEPS[event.key];
      if (step && isPlaced) moves.showPosition(member.userId, shiftTokenPosition(moves.findPosition(member), step));
      else if ((event.key === "Enter" || event.key === " ") && !isPlaced) void moves.sendPosition(member.userId, shiftTokenPosition(null, { x: 0, y: 0 }));
      else if ((event.key === "Delete" || event.key === "Backspace") && isPlaced) void moves.sendPosition(member.userId, null);
      else return;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (ARROW_STEPS[event.key] && isPlaced) void moves.sendPosition(member.userId, moves.findPosition(member));
    };
    return (
      <TokenFace member={member} isMine={member.userId === view.myUserId} isDimmed={ghost?.userId === member.userId} scale={scale}>
        {isMovable ? (
          <button
            type="button"
            aria-label={`Токен «${member.persName ?? member.name}». ${isPlaced ? "Тягніть або рухайте стрілками; Delete — прибрати з мапи" : "Перетягніть на мапу або натисніть Enter"}`}
            className="absolute inset-0 cursor-grab touch-none rounded-full active:cursor-grabbing"
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            {...bindToken(member.userId)}
          />
        ) : null}
      </TokenFace>
    );
  };

  return (
    <div className={cn("space-y-3", isFullscreen && "flex min-h-0 flex-1 flex-col space-y-0 gap-3")}>
      <TokenTray view={view} waiting={waiting} hasHeroes={heroes.length > 0} isFullscreen={isFullscreen}>
        {waiting.map((member) => <li key={member.userId}>{renderToken(member)}</li>)}
      </TokenTray>
      {isBroken ? (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">Не вдалося показати мапу. Оновіть сторінку або попросіть майстра завантажити її ще раз.</p>
      ) : (
        <div className={cn("space-y-3", isFullscreen && "flex min-h-0 flex-1 flex-col justify-center gap-3 space-y-0 [--map-footer:3.5rem] [--map-side:0px] [container-type:size]", side?.board)}>
          <div
            ref={mapRef}
            className={cn(
              "relative mx-auto select-none rounded-xl",
              !aspectRatio && "bg-white/5",
              ghost && "ring-2",
              ghost && (ghost.isOverTarget ? "ring-arcane-300" : "ring-white/20"),
              side?.map,
            )}
            style={{ aspectRatio: aspectRatio ?? 4 / 3, width: `min(100% - var(--map-side, 0px), calc(${maxMapHeight} * ${aspectRatio ?? 4 / 3}))` }}
          >
            {aspectRatio ? null : <span className="absolute inset-0 grid place-items-center text-sm text-slate-400">Мапа завантажується…</span>}
            {/* eslint-disable-next-line @next/next/no-img-element -- мапа вже стиснута до webp на сервері, оптимізатор Next її лише повторно перекодував би */}
            <img
              ref={readAspectRatio}
              src={mapImageUrl}
              alt="Мапа сцени"
              draggable={false}
              onLoad={(event) => readAspectRatio(event.currentTarget)}
              onError={() => setIsBroken(true)}
              onClick={onMapClick}
              className={cn("absolute inset-0 h-full w-full rounded-xl border border-white/10 object-contain", onMapClick && "cursor-zoom-in")}
            />
            {heroes.map((member) => {
              const position = moves.findPosition(member);
              return position ? (
                <div key={member.userId} className={cn("absolute -translate-x-1/2 -translate-y-1/2", member.userId === view.myUserId ? "z-20" : canMove(member) && "z-10")} style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}>
                  {renderToken(member, tokenScale)}
                </div>
              ) : null;
            })}
          </div>
          {hasPlacedTokens || canTurn ? (
            <div className={cn("mx-auto flex w-full max-w-md items-center justify-center gap-3", side?.controls)}>
              {hasPlacedTokens ? <TokenScaleSlider scale={tokenScale} onChange={onTokenScaleChange} className={side?.slider} /> : null}
              {canTurn ? (
                <Button type="button" variant="outline" onClick={turn.toggle} aria-pressed={turn.isTurned} aria-label="Повернути мапу горизонтально" className="hidden h-11 shrink-0 gap-2 px-3 portrait:flex">
                  <RotateCw className="h-4 w-4" aria-hidden />
                  {turn.isTurned ? "Повернути назад" : "Повернути"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      {ghost && draggedMember ? <DraggedToken ghost={ghost} member={draggedMember} isMine={ghost.userId === view.myUserId} isTurned={isQuarterTurned()} isLeavingMap={!ghost.isOverTarget && moves.findPosition(draggedMember) !== null} /> : null}
    </div>
  );
}

function TokenTray({ view, waiting, hasHeroes, isFullscreen, children }: { view: GameSessionView; waiting: GameSessionMemberView[]; hasHeroes: boolean; isFullscreen: boolean; children: ReactNode }) {
  const hint = isFullscreen && !waiting.length ? null : findTrayHint(view, waiting, hasHeroes);
  if (!hint && !waiting.length) return null;
  return (
    <div className="space-y-2">
      {hint ? <p className="text-sm text-slate-400">{hint}</p> : null}
      {waiting.length ? <ul className="flex flex-wrap gap-3">{children}</ul> : null}
    </div>
  );
}

function findTrayHint(view: GameSessionView, waiting: GameSessionMemberView[], hasHeroes: boolean): string | null {
  if (view.isArchived) return waiting.length ? "Ще не на мапі:" : null;
  if (view.myRole === "PLAYER" && view.myPersId === null) return "Оберіть персонажа — і на мапі зʼявиться ваш токен.";
  if (!hasHeroes) return "Токени зʼявляться, коли гравці оберуть персонажів.";
  if (!waiting.length) return "Витягніть токен за межі мапи, щоб прибрати його.";
  const canPlace = view.myRole === "GM" || waiting.some((member) => member.userId === view.myUserId);
  return canPlace ? "Перетягніть токен на мапу." : "Ще не на мапі:";
}

function TokenScaleSlider({ scale, onChange, className }: { scale: number; onChange: (scale: number) => void; className?: string }) {
  return (
    <label className={cn("flex min-w-0 flex-1 items-center gap-3 text-sm text-slate-400", className)}>
      <span className="shrink-0">Розмір токенів</span>
      <input
        type="range"
        min={TOKEN_SCALE_RANGE.min}
        max={TOKEN_SCALE_RANGE.max}
        step={TOKEN_SCALE_RANGE.step}
        value={scale}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full accent-arcane-300"
      />
    </label>
  );
}

const AVATAR_SIZE_PX = 44;

function TokenFace({ member, isMine, isDimmed, scale = 1, children }: { member: GameSessionMemberView; isMine: boolean; isDimmed?: boolean; scale?: number; children?: ReactNode }) {
  const name = member.persName ?? member.name;
  const avatarSize = Math.round(AVATAR_SIZE_PX * scale);
  return (
    <div className={cn("flex flex-col items-center", !children && "pointer-events-none", isDimmed && "opacity-40")} title={name}>
      <div className="relative" style={{ width: avatarSize, height: avatarSize }}>
        <GameAvatar src={member.avatarUrl} name={name} className={cn("h-full w-full border-2 shadow-lg shadow-black/50 ring-2 ring-slate-950/80", isMine ? "border-arcane-300" : "border-white/70")} />
        {children}
      </div>
      {scale >= SMALLEST_SCALE_WITH_NAMES ? <span className="mt-0.5 max-w-16 truncate rounded bg-slate-950/80 px-1 text-xs leading-4 text-slate-100">{name}</span> : null}
    </div>
  );
}

function DraggedToken({ ghost, member, isMine, isTurned, isLeavingMap }: { ghost: TokenGhost; member: GameSessionMemberView; isMine: boolean; isTurned: boolean; isLeavingMap: boolean }) {
  return createPortal(
    <div className={cn("pointer-events-none fixed z-[10000] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center", isTurned && "rotate-90")} style={{ left: ghost.clientX, top: ghost.clientY }} aria-hidden>
      <TokenFace member={member} isMine={isMine} />
      {isLeavingMap ? <span className="mt-1 whitespace-nowrap rounded-full bg-rose-950/90 px-2 py-0.5 text-xs text-rose-100 shadow-lg shadow-black/50">Прибрати з мапи</span> : null}
    </div>,
    document.body,
  );
}

type TokenMoves = ReturnType<typeof useTokenMoves>;
type SentMoves = { members: GameSessionMemberView[]; positions: Map<number, TokenPosition | null> };

/// Надісланий рух видно одразу; щойно потік кімнати принесе новий склад, правдою знову стає сервер.
function useTokenMoves(view: GameSessionView) {
  const [sent, setSent] = useState<SentMoves | null>(null);
  const pending = sent?.members === view.members ? sent.positions : null;
  const findPosition = (member: GameSessionMemberView) => (pending?.has(member.userId) ? (pending.get(member.userId) ?? null) : member.token);

  const showPosition = (userId: number, position: TokenPosition | null) =>
    setSent((previous) => ({ members: view.members, positions: new Map(previous?.members === view.members ? previous.positions : []).set(userId, position) }));

  const sendPosition = async (userId: number, position: TokenPosition | null) => {
    showPosition(userId, position);
    const result = await moveGameTokenAction(view.id, userId, position);
    if (!result.ok) {
      setSent(null);
      return void toast.error(result.error);
    }
    captureGameEvent("game_token_moved", { is_own: userId === view.myUserId, is_on_map: position !== null });
  };

  return { findPosition, showPosition, sendPosition };
}

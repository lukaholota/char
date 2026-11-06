"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { moveMapCreatureAction, removeMapCreaturesAction, setCreatureNameModeAction, setMapCreatureSizeAction } from "@/lib/actions/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { TOKEN_ARROW_STEPS, shiftTokenPosition, type TokenPosition } from "@/rules/game-map";
import { CREATURE_TOKEN_SIZE_SCALES, buildCreatureInitials, type CreatureTokenSize, type MapCreatureView, type TokenNameMode } from "@/rules/game-map-creatures";
import type { GameSessionView } from "@/server/db/game-sessions";
import { AddMapCreaturesDialog } from "./AddMapCreaturesDialog";
import { MapCreatureStatblockDialog } from "./MapCreatureStatblockDialog";
import { useTokenDrag, type TokenGhost } from "./use-token-drag";
import { TokenName, TokenNameModePicker } from "./TokenName";
import { SMALLEST_SCALE_WITH_NAMES, TOKEN_SIZE_PX } from "./use-token-scale";

type Point = { clientX: number; clientY: number };

type CreatureTokensInput = { view: GameSessionView; tokenScale: number; findDropPosition: (point: Point) => TokenPosition | null; isTurned: () => boolean };

/// Істот рухає й прибирає лише майстер; дотик без руху відкриває статблок усім.
export function useMapCreatureTokens({ view, tokenScale, findDropPosition, isTurned }: CreatureTokensInput) {
  const canEdit = view.myRole === "GM" && !view.isArchived;
  const moves = useCreatureMoves(view);
  const looks = useCreatureLooks(view);
  const nameMode = tokenScale >= SMALLEST_SCALE_WITH_NAMES ? looks.nameMode : null;
  const [openId, setOpenId] = useState<number | null>(null);
  const openStatblock = (id: number) => {
    setOpenId(id);
    captureGameEvent("game_creature_statblock_opened", { is_gm: view.myRole === "GM" });
  };
  const { ghost, bindToken } = useTokenDrag<number>(
    (id, point) => {
      const creature = view.creatures.find((candidate) => candidate.id === id);
      const position = findDropPosition(point);
      if (creature && (position || moves.findPosition(creature))) void moves.send(id, position);
    },
    (point) => findDropPosition(point) !== null,
    openStatblock,
  );
  const removeFromStatblock = (id: number) => {
    setOpenId(null);
    void moves.send(id, null);
  };
  const shown = view.creatures.filter((creature) => !moves.isRemoved(creature));
  const waiting = shown.filter((creature) => !moves.findPosition(creature));
  const dragged = ghost ? shown.find((creature) => creature.id === ghost.id) : undefined;
  const openCreature = shown.find((creature) => creature.id === openId) ?? null;

  const renderToken = (creature: MapCreatureView, size: number, shownName: TokenNameMode | null) => {
    const position = moves.findPosition(creature);
    const onKeyDown = (event: KeyboardEvent) => {
      const step = TOKEN_ARROW_STEPS[event.key];
      if (step && position) moves.show(creature.id, shiftTokenPosition(position, step));
      else if ((event.key === "Enter" || event.key === " ") && position) openStatblock(creature.id);
      else if (event.key === "Enter" || event.key === " ") void moves.send(creature.id, shiftTokenPosition(null, { x: 0, y: 0 }));
      else if (event.key === "Delete" || event.key === "Backspace") void moves.send(creature.id, null);
      else return;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (TOKEN_ARROW_STEPS[event.key] && position) void moves.send(creature.id, position);
    };
    const hint = canEdit ? (position ? "Дотик — статблок, тягніть або рухайте стрілками; Delete — прибрати" : "Перетягніть на мапу або натисніть Enter") : "Відкрити статблок";
    return (
      <CreatureTokenFace creature={creature} size={size} nameMode={shownName} isDimmed={ghost?.id === creature.id}>
        <button
          type="button"
          aria-label={`${creature.isAlly ? "Союзник" : "Ворог"} «${creature.label}». ${hint}`}
          className={cn("absolute inset-0 rounded-full", canEdit && "cursor-grab touch-none active:cursor-grabbing")}
          {...(canEdit ? { onKeyDown, onKeyUp, ...bindToken(creature.id) } : { onClick: () => openStatblock(creature.id) })}
        />
      </CreatureTokenFace>
    );
  };

  return {
    ghost,
    hasPlaced: waiting.length < shown.length,
    tray: canEdit ? (
      <CreatureTray sessionId={view.id} hasCreatures={shown.length > 0} hasWaiting={waiting.length > 0} names={looks}>
        {waiting.map((creature) => <li key={creature.id}>{renderToken(creature, TOKEN_SIZE_PX, "short")}</li>)}
      </CreatureTray>
    ) : null,
    mapTokens: shown.map((creature) => {
      const position = moves.findPosition(creature);
      return position ? (
        <div key={creature.id} className={cn("absolute -translate-x-1/2 -translate-y-1/2", canEdit && "z-10")} style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}>
          {renderToken(creature, Math.round(TOKEN_SIZE_PX * tokenScale * CREATURE_TOKEN_SIZE_SCALES[looks.findSize(creature)]), nameMode)}
        </div>
      ) : null;
    }),
    overlay: (
      <>
        {ghost && dragged ? <CreatureGhost ghost={ghost} creature={dragged} nameMode={looks.nameMode} isTurned={isTurned()} isLeavingMap={!ghost.isOverTarget && moves.findPosition(dragged) !== null} /> : null}
        <MapCreatureStatblockDialog
          creature={openCreature}
          onClose={() => setOpenId(null)}
          onRemove={canEdit && openCreature ? () => removeFromStatblock(openCreature.id) : null}
          size={canEdit && openCreature ? { value: looks.findSize(openCreature), onChange: (size) => void looks.sendSize(openCreature.id, size) } : null}
        />
      </>
    ),
  };
}

type TrayProps = { sessionId: number; hasCreatures: boolean; hasWaiting: boolean; names: { nameMode: TokenNameMode; sendNameMode: (mode: TokenNameMode) => void }; children: ReactNode };

function CreatureTray({ sessionId, hasCreatures, hasWaiting, names, children }: TrayProps) {
  const router = useModeRouter();
  const [isClearing, setIsClearing] = useState(false);
  const clearAll = async () => {
    if (!window.confirm("Прибрати всіх істот з мапи й з ряду?")) return;
    setIsClearing(true);
    const result = await removeMapCreaturesAction(sessionId, null);
    setIsClearing(false);
    if (!result.ok) return void toast.error(result.error);
    router.refresh();
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <AddMapCreaturesDialog sessionId={sessionId} />
        {hasWaiting ? <ul aria-label="Істоти поза мапою" className="flex flex-wrap gap-3">{children}</ul> : null}
        {hasCreatures ? <TokenNameModePicker label="Імена істот" mode={names.nameMode} onChange={names.sendNameMode} /> : null}
        {hasCreatures ? (
          <Button type="button" variant="ghost" onClick={clearAll} disabled={isClearing} className="ml-auto h-11 px-3 text-slate-400">
            Прибрати всіх
          </Button>
        ) : null}
      </div>
      {hasWaiting ? <p className="text-sm text-slate-400">Перетягніть істоту на мапу. Дотик відкриває статблок.</p> : null}
    </div>
  );
}

type FaceProps = { creature: MapCreatureView; size?: number; nameMode: TokenNameMode | null; isDimmed?: boolean; children?: ReactNode };

export function CreatureTokenFace({ creature, size = TOKEN_SIZE_PX, nameMode, isDimmed, children }: FaceProps) {
  const isArtHidden = useIsArtHidden(creature.imageUrl, "manual");
  const src = isArtHidden ? null : creature.imageUrl;
  return (
    <div className={cn("flex flex-col items-center", !children && "pointer-events-none", isDimmed && "opacity-40")} title={creature.label}>
      <div className="relative" style={{ width: size, height: size }}>
        <div className={cn("relative h-full w-full overflow-hidden rounded-full border-2 bg-slate-900 shadow-lg shadow-black/50 ring-2 ring-slate-950/80", creature.isAlly ? "border-emerald-400" : "border-rose-500")}>
          {src ? (
            <ContentImage src={src} alt="" provenance="manual" fill sizes="128px" draggable={false} className={creature.isRoundImage ? "object-contain" : "object-cover object-top"} />
          ) : (
            <span aria-hidden className="grid h-full w-full place-items-center font-rpg-display text-slate-100" style={{ fontSize: Math.max(12, Math.round(size * 0.34)) }}>
              {buildCreatureInitials(creature.label)}
            </span>
          )}
        </div>
        {creature.badge !== null ? (
          <span aria-hidden className={cn("absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-slate-950 px-1 text-xs leading-none text-slate-100 ring-1", creature.isAlly ? "ring-emerald-400" : "ring-rose-500")}>
            {creature.badge}
          </span>
        ) : null}
        {children}
      </div>
      {nameMode ? <TokenName name={creature.label} mode={nameMode} tokenSize={size} /> : null}
    </div>
  );
}

function CreatureGhost({ ghost, creature, nameMode, isTurned, isLeavingMap }: { ghost: TokenGhost<number>; creature: MapCreatureView; nameMode: TokenNameMode; isTurned: boolean; isLeavingMap: boolean }) {
  return createPortal(
    <div className={cn("pointer-events-none fixed z-[10000] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center", isTurned && "rotate-90")} style={{ left: ghost.clientX, top: ghost.clientY }} aria-hidden>
      <CreatureTokenFace creature={creature} nameMode={nameMode} />
      {isLeavingMap ? <span className="mt-1 whitespace-nowrap rounded-full bg-rose-950/90 px-2 py-0.5 text-xs text-rose-100 shadow-lg shadow-black/50">Прибрати з мапи</span> : null}
    </div>,
    document.body,
  );
}

type SentMoves = { creatures: MapCreatureView[]; positions: Map<number, TokenPosition | null> };

/// position null — істоту прибрано: майстер витягнув її з мапи.
function useCreatureMoves(view: GameSessionView) {
  const [sent, setSent] = useState<SentMoves | null>(null);
  const pending = sent?.creatures === view.creatures ? sent.positions : null;
  const findPosition = (creature: MapCreatureView) => (pending?.has(creature.id) ? (pending.get(creature.id) ?? null) : creature.token);
  const isRemoved = (creature: MapCreatureView) => pending?.has(creature.id) === true && pending.get(creature.id) === null;

  const show = (id: number, position: TokenPosition | null) =>
    setSent((previous) => ({ creatures: view.creatures, positions: new Map(previous?.creatures === view.creatures ? previous.positions : []).set(id, position) }));

  const send = async (id: number, position: TokenPosition | null) => {
    show(id, position);
    const result = position ? await moveMapCreatureAction(view.id, id, position) : await removeMapCreaturesAction(view.id, id);
    if (!result.ok) {
      setSent(null);
      return void toast.error(result.error);
    }
    captureGameEvent("game_creature_moved", { is_on_map: position !== null });
  };

  return { findPosition, isRemoved, show, send };
}

type SentLooks = { view: GameSessionView; sizes: Map<number, CreatureTokenSize>; nameMode: TokenNameMode | null };

/// Розмір і показ імен майстер бачить одразу; правдою їх робить наступний стан кімнати з сервера.
function useCreatureLooks(view: GameSessionView) {
  const router = useModeRouter();
  const [sent, setSent] = useState<SentLooks | null>(null);
  const pending = sent?.view === view ? sent : null;
  const show = (change: Partial<Omit<SentLooks, "view">>) =>
    setSent((previous) => ({ view, sizes: previous?.view === view ? previous.sizes : new Map(), nameMode: previous?.view === view ? previous.nameMode : null, ...change }));
  const finish = (result: { ok: true } | { ok: false; error: string }) => {
    if (!result.ok) {
      setSent(null);
      return void toast.error(result.error);
    }
    router.refresh();
  };

  const sendSize = async (id: number, size: CreatureTokenSize) => {
    show({ sizes: new Map(pending?.sizes ?? []).set(id, size) });
    finish(await setMapCreatureSizeAction(view.id, id, size));
  };
  const sendNameMode = async (mode: TokenNameMode) => {
    show({ nameMode: mode });
    finish(await setCreatureNameModeAction(view.id, mode));
  };

  return {
    nameMode: pending?.nameMode ?? view.creatureNameMode,
    findSize: (creature: MapCreatureView) => pending?.sizes.get(creature.id) ?? creature.tokenSize,
    sendSize,
    sendNameMode,
  };
}

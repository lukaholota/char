"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { Pencil, X } from "lucide-react";
import { useDiceUIStore, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { cn } from "@/lib/utils";
import { DiceRollPanel } from "./DiceRollPanel";
import { FreeDicePanel } from "./FreeDicePanel";
import { D20Icon } from "@/lib/components/icons/D20Icon";
import { useDiceRolls } from "./useDiceRolls";
import { DICE_TRAY_HEIGHT_VAR, DICE_TRAY_Z_INDEX, holdTrayResize, requestTrayResize, waitForAnimationFrames } from "./dice-tray-layout";

const DISMISS_DRAG_PX = 80;
const DISMISS_VELOCITY = 600;

export function DiceTray() {
  const { isOpen, mode, rollContext, close } = useDiceUIStore();
  const isRollMode = mode === "roll" && rollContext !== null;
  const layoutKey = describeLayout(mode, rollContext);
  const [settledLayoutKey, setSettledLayoutKey] = useState<string | null>(null);
  const isLayoutSettled = isOpen && settledLayoutKey === layoutKey;
  const rolls = useDiceRolls(isOpen, rollContext, isLayoutSettled);
  const onEdit = rollContext?.onEdit;
  const handleEdit = onEdit
    ? () => {
        close();
        onEdit();
      }
    : undefined;

  return (
    <AnimatePresence>
      {isOpen ? (
        <TraySheet
          title={isRollMode ? rollContext.title : "Кубики"}
          subtitle={isRollMode ? rollContext.subtitle : undefined}
          layoutKey={layoutKey}
          isRolling={rolls.isRolling}
          hasDiceOnTable={rolls.pool.length > 0}
          onLayoutSettled={setSettledLayoutKey}
          onClose={close}
          onEdit={handleEdit}
        >
          {isRollMode ? (
            <DiceRollPanel
              context={rollContext}
              activeActionKey={rolls.activeActionKey}
              isReady={rolls.isReady}
              isRolling={rolls.isRolling}
              outcome={rolls.outcome}
              onRoll={rolls.rollAction}
            />
          ) : (
            <FreeDicePanel
              isReady={rolls.isReady}
              isRolling={rolls.isRolling}
              pool={rolls.pool}
              onAdd={rolls.addFreeDie}
              onRemove={rolls.removeFreeDie}
              onReroll={rolls.rerollPool}
              onClear={rolls.clearPool}
            />
          )}
        </TraySheet>
      ) : null}
    </AnimatePresence>
  );
}

function describeLayout(mode: string, rollContext: DiceRollContext | null): string {
  if (!rollContext) return mode;
  return [mode, rollContext.title, rollContext.subtitle ?? "", rollContext.actions.length].join("|");
}

type TraySheetProps = {
  title: string;
  subtitle?: string;
  layoutKey: string;
  isRolling: boolean;
  hasDiceOnTable: boolean;
  onLayoutSettled: (layoutKey: string | null) => void;
  onClose: () => void;
  onEdit?: () => void;
  children: ReactNode;
};

function TraySheet({ title, subtitle, layoutKey, isRolling, hasDiceOnTable, onLayoutSettled, onClose, onEdit, children }: TraySheetProps) {
  const { ref, settleLayout } = useTrayLayout(layoutKey, isRolling, hasDiceOnTable, onLayoutSettled);
  const dragControls = useDragControls();

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_DRAG_PX || info.velocity.y > DISMISS_VELOCITY) onClose();
  };

  return (
    <motion.section
      ref={ref}
      role="dialog"
      aria-label={title}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      onAnimationComplete={settleLayout}
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={handleDragEnd}
      style={{ zIndex: DICE_TRAY_Z_INDEX }}
      className={cn(
        "fixed inset-x-0 bottom-0 rounded-t-3xl border border-white/10 bg-slate-950/90 shadow-2xl shadow-black/50 backdrop-blur-xl",
        "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]",
        "md:inset-x-auto md:bottom-6 md:right-6 md:w-[26rem] md:rounded-3xl",
      )}
    >
      <header
        onPointerDown={(event) => dragControls.start(event)}
        className="cursor-grab touch-none select-none pt-2 active:cursor-grabbing"
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/20 md:hidden" />
        <div className="flex items-center gap-2 px-4 pb-3">
          <D20Icon className="h-5 w-5 text-amber-300" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-slate-50">{title}</div>
            {subtitle ? <div className="truncate text-xs text-slate-300/80">{subtitle}</div> : null}
          </div>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Редагувати"
              title="Редагувати"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити кубики"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>
      {children}
    </motion.section>
  );
}

/// Кубики летять у полі над листом, і бібліотека перебудовує це поле на кожен `resize` — кидок,
/// що летів у цей момент, ніколи не завершується. Тому розмір поля публікується лише між кидками,
/// а кидок чекає, поки лист сяде на місце. Коли на столі вже лежать кубики, сам `resize`
/// притримується до наступного кидка — див. `holdTrayResize`.
function useTrayLayout(
  layoutKey: string,
  isRolling: boolean,
  hasDiceOnTable: boolean,
  onLayoutSettled: (layoutKey: string | null) => void,
) {
  const ref = useRef<HTMLElement>(null);
  const isRollingRef = useRef(isRolling);
  const publishedHeightRef = useRef<number | null>(null);
  const hasPendingPublishRef = useRef(false);
  const hasEnteredRef = useRef(false);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isRollingRef.current = isRolling;
  }, [isRolling]);

  const publishHeight = useCallback((): boolean => {
    const node = ref.current;
    if (!node || !hasEnteredRef.current) return false;
    if (isRollingRef.current) {
      hasPendingPublishRef.current = true;
      return false;
    }
    hasPendingPublishRef.current = false;
    const coveredHeight = Math.round(Math.max(0, window.innerHeight - node.getBoundingClientRect().top));
    if (coveredHeight === publishedHeightRef.current) return false;
    publishedHeightRef.current = coveredHeight;
    document.documentElement.style.setProperty(DICE_TRAY_HEIGHT_VAR, `${coveredHeight}px`);
    return requestTrayResize() === "dispatched";
  }, []);

  /// Обробник resize у бібліотеці чекає кадру, тож кидок, пущений одразу після публікації,
  /// встиг би вилетіти в старе поле й зникнути з перебудовою.
  const settleLayout = useCallback(() => {
    hasEnteredRef.current = true;
    const didResize = publishHeight();
    const markSettled = () => {
      if (!isUnmountedRef.current) onLayoutSettled(layoutKey);
    };
    if (didResize) void waitForAnimationFrames(2).then(markSettled);
    else markSettled();
  }, [layoutKey, onLayoutSettled, publishHeight]);

  useLayoutEffect(() => {
    if (hasEnteredRef.current) settleLayout();
  }, [settleLayout]);

  useLayoutEffect(() => {
    holdTrayResize(hasDiceOnTable);
    return () => holdTrayResize(false);
  }, [hasDiceOnTable]);

  useEffect(() => {
    if (!isRolling && hasPendingPublishRef.current) publishHeight();
  }, [isRolling, publishHeight]);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(publishHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [publishHeight]);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty(DICE_TRAY_HEIGHT_VAR);
      window.dispatchEvent(new Event("resize"));
      onLayoutSettled(null);
    },
    [onLayoutSettled],
  );

  return { ref, settleLayout };
}

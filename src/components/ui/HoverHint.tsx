"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const HINT_WIDTH_PX = 288;
const HINT_HEIGHT_ESTIMATE_PX = 110;
const VIEWPORT_MARGIN_PX = 8;
const ANCHOR_GAP_PX = 10;
const EXIT_DURATION_MS = 120;

type HintPlacement = { left: number; arrowLeft: number; edge: { top: number } | { bottom: number }; isAbove: boolean };

export function HoverHint({ text, children }: { text: string | undefined; children: ReactNode }) {
  const hintId = useId();
  const [placement, setPlacement] = useState<HintPlacement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const exitTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  if (!text) return <>{children}</>;

  const show = (target: HTMLElement) => {
    window.clearTimeout(exitTimer.current);
    setIsClosing(false);
    setPlacement(findHintPlacement(target.getBoundingClientRect()));
  };
  const hide = () => {
    setIsClosing(true);
    exitTimer.current = window.setTimeout(() => setPlacement(null), EXIT_DURATION_MS);
  };

  return (
    <span
      className="inline-flex"
      aria-describedby={placement ? hintId : undefined}
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={hide}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={hide}
    >
      {children}
      {placement && createPortal(<HintBubble id={hintId} text={text} placement={placement} isClosing={isClosing} />, document.body)}
    </span>
  );
}

function HintBubble({ id, text, placement, isClosing }: { id: string; text: string; placement: HintPlacement; isClosing: boolean }) {
  return (
    <span
      id={id}
      role="tooltip"
      data-state={isClosing ? "closed" : "open"}
      style={{ left: placement.left, width: HINT_WIDTH_PX, transformOrigin: `${placement.arrowLeft}px ${placement.isAbove ? "100%" : "0"}`, ...placement.edge }}
      className="pointer-events-none fixed z-[10000] max-w-[calc(100vw-1rem)] rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-sm font-normal leading-relaxed text-slate-100 shadow-2xl duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
    >
      {text}
      <span
        aria-hidden
        style={{ left: placement.arrowLeft }}
        className={cn(
          "absolute h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-white/15 bg-slate-900",
          placement.isAbove ? "-bottom-[6px] border-b border-r" : "-top-[6px] border-l border-t",
        )}
      />
    </span>
  );
}

function findHintPlacement(anchor: DOMRect): HintPlacement {
  const centerX = anchor.left + anchor.width / 2;
  const maxLeft = window.innerWidth - HINT_WIDTH_PX - VIEWPORT_MARGIN_PX;
  const left = Math.max(VIEWPORT_MARGIN_PX, Math.min(centerX - HINT_WIDTH_PX / 2, maxLeft));
  const hasRoomBelow = anchor.bottom + ANCHOR_GAP_PX + HINT_HEIGHT_ESTIMATE_PX < window.innerHeight;
  return {
    left,
    arrowLeft: centerX - left,
    isAbove: !hasRoomBelow,
    edge: hasRoomBelow ? { top: anchor.bottom + ANCHOR_GAP_PX } : { bottom: window.innerHeight - anchor.top + ANCHOR_GAP_PX },
  };
}

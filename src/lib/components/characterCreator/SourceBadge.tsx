"use client";

import clsx from "clsx";
import { KeyboardEvent, SyntheticEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sourceTranslations, sourceTranslationsEng } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";

interface SourceBadgeProps {
  code?: string | null;
  active?: boolean;
  className?: string;
  englishTitle?: string;
  inline?: boolean;
}

const getTranslation = (code?: string | null) => {
  if (!code) return { ua: undefined, en: undefined };

  const ua = Object.prototype.hasOwnProperty.call(sourceTranslations, code)
    ? (sourceTranslations as Record<string, string>)[code]
    : undefined;
  const en = Object.prototype.hasOwnProperty.call(sourceTranslationsEng, code)
    ? (sourceTranslationsEng as Record<string, string>)[code]
    : undefined;

  return { ua, en };
};

const buildBadgeLabel = (code?: string | null) => (code ? code.replace(/_/g, " ") : "—");

const SCREEN_MARGIN = 8;
const ARROW_INSET = 10;
const MAX_HINT_WIDTH = 240;

const findHintCenter = (anchorCenter: number, hintWidth: number) => {
  const edge = hintWidth / 2 + SCREEN_MARGIN;
  return Math.min(Math.max(anchorCenter, edge), window.innerWidth - edge);
};

const findArrowOffset = (anchorCenter: number, hintCenter: number, hintWidth: number) => {
  const limit = Math.max(0, hintWidth / 2 - ARROW_INSET);
  return Math.min(Math.max(anchorCenter - hintCenter, -limit), limit);
};

export const SourceBadge = ({ code, active, className, englishTitle, inline }: SourceBadgeProps) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [hintWidth, setHintWidth] = useState(MAX_HINT_WIDTH);

  const { ua, en } = useMemo(() => getTranslation(code), [code]);
  const label = buildBadgeLabel(code);
  const english = en || englishTitle;
  const hintPrimary = ua || english || "Невідоме джерело";
  const hintSecondary = ua && english ? english : code ? label : "";

  useEffect(() => setOpen(false), [code]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setAnchorRect(null);
      return;
    }

    const update = () => {
      const rect = badgeRef.current?.getBoundingClientRect();
      setAnchorRect(rect ?? null);
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (anchorRect && hintRef.current) setHintWidth(hintRef.current.offsetWidth);
  }, [anchorRect, hintPrimary, hintSecondary]);

  const toggle = (event?: SyntheticEvent) => {
    event?.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(event);
    }
  };

  const Wrapper = inline ? "span" : "div";
  const anchorCenter = anchorRect ? anchorRect.left + anchorRect.width / 2 : 0;
  const hintCenter = anchorRect ? findHintCenter(anchorCenter, hintWidth) : 0;

  return (
    <Wrapper
      ref={(node: HTMLElement | null) => { wrapperRef.current = node; }}
      data-stop-card-click
      className={clsx("relative", inline && "inline-flex align-middle", className)}
    >
      <span ref={badgeRef} className="inline-flex">
        <span
          role="button"
          tabIndex={0}
          className={cn(
            badgeVariants({ variant: "outline" }),
            "cursor-pointer select-none border-white/15 bg-white/5 text-slate-200",
            inline && "px-1.5 py-0",
            "hover:bg-white/7 hover:text-white",
            active && "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100",
            className
          )}
          onClick={toggle}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {label}
        </span>
      </span>

      {open && anchorRect
        ? createPortal(
            <div
              className="fixed z-[9999]"
              style={{
                left: hintCenter,
                top: Math.max(8, anchorRect.top - 8),
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
              }}
              data-stop-card-click
            >
              <div className="flex -translate-x-1/2 -translate-y-full flex-col items-center">
                <div ref={hintRef} className="relative w-max max-w-[240px] rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 pr-9 text-xs font-semibold text-slate-50 backdrop-blur">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7 text-slate-300 hover:bg-white/10 hover:text-white"
                    aria-label="Закрити"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(false);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <span>{hintPrimary}</span>
                  {hintSecondary ? (
                    <span className="ml-1 text-[11px] font-normal text-slate-400">({hintSecondary})</span>
                  ) : null}
                </div>
                <div
                  className="h-2 w-2 border-b border-r border-white/10 bg-slate-900/95"
                  style={{ transform: `translateX(${findArrowOffset(anchorCenter, hintCenter, hintWidth)}px) rotate(45deg)` }}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </Wrapper>
  );
};

export default SourceBadge;

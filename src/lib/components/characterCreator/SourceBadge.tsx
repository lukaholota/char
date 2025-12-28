"use client";

import clsx from "clsx";
import { KeyboardEvent, SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sourceTranslations, sourceTranslationsEng } from "@/lib/refs/translation";

interface SourceBadgeProps {
  code?: string | null;
  active?: boolean;
  className?: string;
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

export const SourceBadge = ({ code, active, className }: SourceBadgeProps) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const { ua, en } = useMemo(() => getTranslation(code), [code]);
  const label = code || "—";
  const hintPrimary = ua || "Невідоме джерело";
  const hintSecondary = en || (code ? code : "");

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

  const toggle = (event?: SyntheticEvent) => {
    event?.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(event);
    }
  };

  return (
    <div ref={wrapperRef} data-stop-card-click className={clsx("relative", className)}>
      <span ref={badgeRef} className="inline-flex">
        <Badge
          role="button"
          tabIndex={0}
          variant="outline"
          className={clsx(
            "cursor-pointer select-none border-white/15 bg-white/5 text-slate-200",
            "hover:bg-white/7 hover:text-white",
            active && "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100",
            className
          )}
          onClick={toggle}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {label}
        </Badge>
      </span>

      {open && anchorRect
        ? createPortal(
            <div
              className="fixed z-[9999]"
              style={{
                left: anchorRect.left + anchorRect.width / 2,
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
                <div className="relative max-w-[240px] rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 pr-9 text-xs font-semibold text-slate-50 backdrop-blur">
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
                <div className="h-2 w-2 rotate-45 border-b border-r border-white/10 bg-slate-900/95" />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default SourceBadge;

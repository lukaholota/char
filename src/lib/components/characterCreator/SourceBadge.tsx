"use client";

import clsx from "clsx";
import { KeyboardEvent, SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
    <div ref={wrapperRef} className={clsx("relative", className)}>
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

      {open ? (
        <div
          className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-3 flex-col items-center"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="glass-panel border-gradient-rpg rounded-lg px-3 py-2 text-xs font-semibold text-slate-50">
            <span>{hintPrimary}</span>
            {hintSecondary ? (
              <span className="ml-1 text-[11px] font-normal text-slate-400">
                ({hintSecondary})
              </span>
            ) : null}
          </div>
          <div className="h-2 w-2 rotate-45 border-b border-r border-white/10 bg-white/5" />
        </div>
      ) : null}
    </div>
  );
};

export default SourceBadge;

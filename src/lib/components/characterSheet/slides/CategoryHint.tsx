"use client";

import { useRef, useState } from "react";
import { Info } from "lucide-react";
import { useCloseOnOutsidePress, useKeepInsideViewport } from "@/components/ui/GlossaryTerm";
import { MENU_PANEL } from "@/components/ui/menu-panel";
import { cn } from "@/lib/utils";

export function CategoryHint({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [nudge, setNudge] = useState(0);
  const wrapper = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const lastPointerType = useRef<string | null>(null);

  useCloseOnOutsidePress(isOpen, wrapper, () => setIsOpen(false));
  useKeepInsideViewport(isOpen, bubble, setNudge);

  return (
    <span ref={wrapper} className="relative inline-flex">
      <span
        role="button"
        tabIndex={0}
        aria-label={text}
        aria-expanded={isOpen}
        onPointerEnter={(event) => event.pointerType === "mouse" && setIsOpen(true)}
        onPointerLeave={(event) => event.pointerType === "mouse" && setIsOpen(false)}
        onPointerDown={(event) => {
          lastPointerType.current = event.pointerType;
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (lastPointerType.current === "mouse") return;
          setIsOpen((wasOpen) => !wasOpen);
        }}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") return setIsOpen(false);
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((wasOpen) => !wasOpen);
        }}
        className="flex h-6 w-6 cursor-help items-center justify-center rounded-full text-slate-400 outline-none hover:text-slate-200 focus-visible:text-slate-200"
      >
        <Info className="h-3.5 w-3.5" />
      </span>

      {isOpen && (
        <span
          ref={bubble}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${nudge}px))` }}
          className={cn(
            MENU_PANEL,
            "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 block w-max",
            "max-w-[min(18rem,80vw)] px-2.5 py-1.5 text-left text-xs normal-case leading-snug tracking-normal text-slate-200"
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}

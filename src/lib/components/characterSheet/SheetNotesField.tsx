"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLLAPSED_SCREEN_SHARE = 0.6;

export function SheetNotesField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTallerThanCap, setIsTallerThanCap] = useState(false);
  const isClipped = isTallerThanCap && !isExpanded;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) setIsTallerThanCap(textarea.scrollHeight > window.innerHeight * COLLAPSED_SCREEN_SHARE);
  }, [value]);

  function expandNotes() {
    setIsExpanded(true);
  }

  function toggleNotes() {
    // iOS keeps focus in the field when a button is tapped, and a clipped field must not stay editable.
    if (isExpanded) textareaRef.current?.blur();
    setIsExpanded(!isExpanded);
  }

  return (
    <div className="space-y-1">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-xs font-semibold text-slate-200">
          Нотатки
        </label>
        {isTallerThanCap && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-expanded={isExpanded}
            aria-controls={fieldId}
            onClick={toggleNotes}
            className="text-slate-300"
          >
            {isExpanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            {isExpanded ? "Згорнути" : "Розгорнути"}
          </Button>
        )}
      </div>
      <div className="relative">
        <textarea
          id={fieldId}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={expandNotes}
          style={{ fieldSizing: "content" }}
          className={cn(
            "block w-full min-h-28 rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20",
            !isExpanded && "max-h-[60vh] resize-none overflow-hidden",
            isClipped && "pointer-events-none [mask-image:linear-gradient(to_bottom,black_calc(100%-7rem),transparent)]",
          )}
        />
        {isClipped && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={expandNotes}
            className="absolute inset-0 flex items-end justify-center pb-1"
          >
            <span className={cn(buttonVariants({ variant: "secondary" }), "pointer-events-none min-h-11")}>
              <ChevronDown aria-hidden />
              Розгорнути
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

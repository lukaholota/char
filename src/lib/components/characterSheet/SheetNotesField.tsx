"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLLAPSED_SCREEN_SHARE = 0.6;

export function SheetNotesField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTallerThanCap, setIsTallerThanCap] = useState(false);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) setIsTallerThanCap(textarea.scrollHeight > window.innerHeight * COLLAPSED_SCREEN_SHARE);
  }, [value]);

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
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="text-slate-300"
          >
            {isExpanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            {isExpanded ? "Згорнути" : "Розгорнути"}
          </Button>
        )}
      </div>
      <textarea
        id={fieldId}
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fieldSizing: "content" }}
        className={cn(
          "w-full min-h-28 rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20",
          !isExpanded && "max-h-[60vh] overflow-y-auto",
        )}
      />
    </div>
  );
}

"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_OBJECT_APPEARANCE, OBJECT_APPEARANCE_LIMITS, type ObjectAppearance } from "@/rules/game-objects";
import { FoldSection } from "./MapToolbar";

const APPEARANCE_LABELS = { brightness: "Яскравість", contrast: "Контрастність", hue: "Відтінок", opacity: "Непрозорість" } satisfies Record<keyof ObjectAppearance, string>;
const APPEARANCE_FIELDS = Object.keys(APPEARANCE_LABELS) as Array<keyof ObjectAppearance>;

export function MapObjectAppearance({ value, onPreview, onCommit }: { value: ObjectAppearance | undefined; onPreview: (value: ObjectAppearance) => void; onCommit: (value: ObjectAppearance) => void }) {
  const appearance = value ?? DEFAULT_OBJECT_APPEARANCE;
  const pending = useRef<ObjectAppearance | null>(null);
  const commit = () => {
    if (!pending.current) return;
    onCommit(pending.current);
    pending.current = null;
  };

  return (
    <FoldSection title="Вигляд об’єкта" isOpenAtStart={false}>
      {APPEARANCE_FIELDS.map((field) => {
        const shown = `${appearance[field]}${field === "hue" ? "°" : "%"}`;
        return (
          <label key={field} className="grid min-h-11 grid-cols-[1fr_auto] items-center gap-x-3 text-sm text-slate-300">
            <span>{APPEARANCE_LABELS[field]}</span>
            <output aria-hidden className="tabular-nums">{shown}</output>
            <input type="range" {...OBJECT_APPEARANCE_LIMITS[field]} value={appearance[field]} aria-label={APPEARANCE_LABELS[field]} aria-valuetext={shown} className="col-span-2 h-8 w-full accent-arcane-300" onChange={(event) => {
              const next = { ...(pending.current ?? appearance), [field]: Number(event.target.value) };
              pending.current = next;
              onPreview(next);
            }} onPointerUp={commit} onPointerCancel={commit} onKeyUp={commit} onBlur={commit} />
          </label>
        );
      })}
      <Button type="button" variant="ghost" disabled={APPEARANCE_FIELDS.every((field) => appearance[field] === DEFAULT_OBJECT_APPEARANCE[field])} onClick={() => onCommit(DEFAULT_OBJECT_APPEARANCE)} className="min-h-10 w-full">Скинути вигляд</Button>
    </FoldSection>
  );
}

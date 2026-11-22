"use client";

import { cn } from "@/lib/utils";
import { DRAWING_FONTS, DRAWING_LIMITS, findDrawingHex, findTextFontSize, type DrawingFont, type DrawingTextSize, type SceneDrawingView, type TextEffect } from "@/rules/game-drawings";
import { toViewPoint } from "@/rules/game-grid";
import { isLightColor } from "@/rules/map-colors";
import { tileLook } from "./ColorSpectrumPicker";
import { Segmented } from "./MapToolbar";
import type { MapDrawings } from "./use-map-drawings";

const FONT_LOOKS: Record<DrawingFont, { label: string; family: string }> = {
  plain: { label: "Звичайний", family: "var(--font-inter), system-ui, sans-serif" },
  antique: { label: "Старовинний", family: "var(--font-rpg-display), Georgia, serif" },
  hand: { label: "Рукописний", family: "var(--font-map-hand), cursive" },
  ornate: { label: "Вʼязь", family: "var(--font-map-ornate), var(--font-rpg-display), serif" },
};
const EFFECT_OPTIONS: Array<{ value: TextEffect; label: string }> = [{ value: "none", label: "Без" }, { value: "outline", label: "Контур" }, { value: "shadow", label: "Тінь" }, { value: "glow", label: "Сяйво" }];
const SIZE_OPTIONS: Array<{ value: DrawingTextSize; label: string }> = [{ value: "small", label: "Малий" }, { value: "medium", label: "Середній" }, { value: "large", label: "Великий" }];
const FIRST_BASELINE = 0.9;
const LINE_HEIGHT = 1.2;

export type TextFilterIds = Record<"shadow" | "glow", string>;

/// Розмиття в одиницях шару (100 завширшки): тінь і сяйво однакові для будь-якого кольору тексту.
export function TextEffectFilters({ ids }: { ids: TextFilterIds }) {
  return (
    <defs>
      <filter id={ids.shadow} x="-10%" y="-20%" width="120%" height="160%">
        <feDropShadow dx="0" dy="0.25" stdDeviation="0.25" floodColor="#000" floodOpacity="0.9" />
      </filter>
      <filter id={ids.glow} x="-20%" y="-40%" width="140%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export function DrawingTextShape({ drawing, aspect, filterIds }: { drawing: SceneDrawingView; aspect: number; filterIds: TextFilterIds }) {
  if (!drawing.label) return null;
  const { text, font, effect } = drawing.label;
  const size = findTextFontSize(drawing.points, aspect);
  const corner = toViewPoint(drawing.points[0], aspect);
  const hex = findDrawingHex(drawing.color);
  const outline = effect === "outline" ? { stroke: isLightColor(hex) ? "#0f172a" : "#f8fafc", strokeWidth: size * 0.14, strokeLinejoin: "round" as const, paintOrder: "stroke" } : {};
  return (
    <text fontSize={size} fill={hex} style={{ fontFamily: FONT_LOOKS[font].family }} filter={effect === "shadow" || effect === "glow" ? `url(#${filterIds[effect]})` : undefined} {...outline}>
      {text.split("\n").map((line, index) => (
        <tspan key={index} x={corner.x} y={corner.y + size * (FIRST_BASELINE + index * LINE_HEIGHT)}>{line}</tspan>
      ))}
    </text>
  );
}

export function DrawTextOptions({ drawings }: { drawings: MapDrawings }) {
  return (
    <>
      <textarea
        value={drawings.text}
        onChange={(event) => drawings.setText(event.target.value)}
        rows={2}
        maxLength={DRAWING_LIMITS.textLength}
        placeholder="Текст для мапи"
        aria-label="Текст для мапи"
        className="block max-h-32 min-h-11 w-full resize-none rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 [field-sizing:content] focus:border-arcane-400/60 focus:outline-none"
      />
      <div role="radiogroup" aria-label="Шрифт" className="grid grid-cols-2 gap-1">
        {DRAWING_FONTS.map((font) => (
          <button key={font} type="button" role="radio" aria-checked={drawings.font === font} onClick={() => drawings.setFont(font)} className={cn(tileLook(drawings.font === font), "px-2 text-lg text-slate-100")} style={{ fontFamily: FONT_LOOKS[font].family }}>
            {FONT_LOOKS[font].label}
          </button>
        ))}
      </div>
      <Segmented label="Ефект тексту" value={drawings.effect} onChange={drawings.setEffect} options={EFFECT_OPTIONS} />
      <Segmented label="Розмір тексту" value={drawings.textSize} onChange={drawings.setTextSize} options={SIZE_OPTIONS} />
    </>
  );
}

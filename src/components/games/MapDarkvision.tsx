"use client";

import { Eye, EyeOff } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MAP_VIEW_WIDTH } from "@/rules/game-grid";
import type { DarkvisionLook, SceneSight } from "@/rules/game-lighting";
import type { ViewPoint } from "@/rules/map-visibility";
import { Segmented } from "./MapToolbar";
import type { CharacterView } from "./use-map-sight";

const DARKVISION_OPTIONS: Array<{ value: DarkvisionLook; label: string }> = [{ value: "grey", label: "Сірий" }, { value: "dim", label: "Тьмяний" }, { value: "heat", label: "Тепловізор" }];
const DARKVISION_FILTERS: Record<DarkvisionLook, string> = {
  grey: "grayscale(1) brightness(0.8)",
  dim: "saturate(0.4) sepia(0.3) hue-rotate(190deg) brightness(0.55)",
  heat: "grayscale(1) contrast(1.4) sepia(1) saturate(5) hue-rotate(-35deg)",
};

const round = (value: number) => Math.round(value * 100) / 100;
const toPoints = (polygon: ViewPoint[]) => polygon.map((point) => `${round(point.x)},${round(point.y)}`).join(" ");
const buildDisc = (id: string, at: ViewPoint, radius: number, color: string) =>
  `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${round(at.x)}" cy="${round(at.y)}" r="${round(radius)}"><stop offset="0" stop-color="${color}"/><stop offset="0.85" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

/// Маска «темний зір мінус освітлене»: там, де світить факел, кольори справжні.
export function buildDarkvisionMask(sight: SceneSight): string | null {
  const eyes = sight.eyes.filter((eye) => eye.darkvision > 0);
  if (sight.lighting !== "dark" || !eyes.length) return null;
  const height = round(MAP_VIEW_WIDTH / sight.aspect);
  const gradients = [...eyes.map((eye, index) => buildDisc(`e${index}`, eye.at, eye.darkvision, "#fff")), ...sight.lights.map((light, index) => buildDisc(`l${index}`, light.at, light.reach, "#000"))].join("");
  const lit = sight.lights.map((light, index) => `<polygon points="${toPoints(light.polygon)}" fill="url(#l${index})"/>`).join("");
  const seen = eyes.map((eye, index) => `<polygon points="${toPoints(eye.polygon)}" fill="url(#e${index})"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_VIEW_WIDTH} ${height}" preserveAspectRatio="none"><defs>${gradients}<mask id="lit" maskUnits="userSpaceOnUse" x="0" y="0" width="${MAP_VIEW_WIDTH}" height="${height}"><rect width="${MAP_VIEW_WIDTH}" height="${height}" fill="#fff"/>${lit}</mask></defs><g mask="url(#lit)">${seen}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/// Фільтр лягає на все під темрявою — мапу, поверхи, малюнки й істот — лише в неосвітленій частині темного зору.
export function DarkvisionTint({ sight, look, className }: { sight: SceneSight; look: DarkvisionLook; className?: string }) {
  const mask = useMemo(() => buildDarkvisionMask(sight), [sight]);
  if (!mask) return null;
  const filter = DARKVISION_FILTERS[look];
  return <div aria-hidden data-darkvision={look} className={`pointer-events-none absolute inset-0 ${className ?? ""}`} style={{ backdropFilter: filter, WebkitBackdropFilter: filter, maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />;
}

export function DarkvisionLookRows({ look, onChange }: { look: DarkvisionLook; onChange: (look: DarkvisionLook) => void }) {
  return (
    <div className="space-y-2 border-t border-white/10 pt-2">
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-slate-200">Вигляд темного зору</h4>
        <p className="text-sm leading-snug text-slate-400">Для всієї кампанії. У режимі «Очима героя» ефект видно на неосвітлених ділянках у межах темного зору.</p>
      </div>
      <Segmented label="Вигляд темного зору" value={look} options={DARKVISION_OPTIONS} onChange={onChange} />
    </div>
  );
}

/// Око: майстер бачить сцену так, як її бачить вибраний герой. Ctrl+L — те саме з клавіатури.
export function CharacterViewButton({ characterView }: { characterView: CharacterView }) {
  const { hero, toggle } = characterView;
  const selectedHero = characterView.findSelectedHero();
  const shown = hero ?? selectedHero;
  const name = shown ? (shown.persName ?? shown.name) : null;
  const Icon = hero ? EyeOff : Eye;
  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" aria-pressed={hero !== null} disabled={!hero && !selectedHero} onClick={toggle} className="h-11 w-full justify-start gap-2">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{hero ? `Вийти з погляду: ${name}` : name ? `Очима: ${name}` : "Очима героя"}</span>
        <kbd className="hidden text-xs text-slate-400 [@media(hover:hover)]:inline">Ctrl+L</kbd>
      </Button>
      {!hero && !selectedHero ? <p className="text-sm leading-snug text-slate-400">Виберіть героя на мапі — побачите те, що бачить він.</p> : null}
    </div>
  );
}

export function CharacterViewChip({ characterView }: { characterView: CharacterView }) {
  const { hero, toggle } = characterView;
  if (!hero) return null;
  return (
    <button type="button" onClick={toggle} className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-amber-200/30 bg-slate-950/90 px-3 text-sm text-amber-100 hover:bg-slate-900">
      <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">Очима: {hero.persName ?? hero.name} · вийти</span>
    </button>
  );
}

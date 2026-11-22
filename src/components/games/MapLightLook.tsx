"use client";

import { ArrowRight } from "lucide-react";
import { DEFAULT_LIGHT_LOOK, LIGHT_LIMITS, type LightEffect, type LightLook, type SceneSight } from "@/rules/game-lighting";
import type { ViewPoint } from "@/rules/map-visibility";
import { ColorSpectrumPicker } from "./ColorSpectrumPicker";
import { Segmented, Stepper } from "./MapToolbar";

const EFFECT_OPTIONS: Array<{ value: LightEffect; label: string }> = [{ value: "steady", label: "Рівне" }, { value: "flicker", label: "Мерехтить" }, { value: "pulse", label: "Пульсує" }];
const EFFECT_CLASSES: Record<LightEffect, string | undefined> = { steady: undefined, flicker: "map-light-flicker", pulse: "map-light-pulse" };
const WARM_GLOW = "#ffcc66";
const { cone: CONE, directionStep: DIRECTION_STEP } = LIGHT_LIMITS;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toPoints = (polygon: ViewPoint[]) => polygon.map((point) => `${point.x},${point.y}`).join(" ");
const hasGlow = (look: LightLook) => look.color !== null || look.effect !== "steady";

/// Сектор від джерела: кути йдуть за годинниковою стрілкою, як і напрямок світла.
export function buildConePath(at: ViewPoint, radius: number, { directionDegrees, coneDegrees }: LightLook): string {
  const pointAt = (degrees: number) => ({ x: at.x + Math.cos(toRadians(degrees)) * radius, y: at.y + Math.sin(toRadians(degrees)) * radius });
  const start = pointAt(directionDegrees - coneDegrees / 2);
  const end = pointAt(directionDegrees + coneDegrees / 2);
  return `M ${at.x} ${at.y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${coneDegrees > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
}

/// Барвисте сяйво лягає під темряву: де світла не видно, його закриває та сама маска.
export function LightGlows({ sight, idPrefix }: { sight: SceneSight; idPrefix: string }) {
  const glowing = sight.lights.map((light, index) => ({ light, id: `${idPrefix}glow-${index}` })).filter(({ light }) => hasGlow(light.look) && light.reach > 0);
  if (!glowing.length) return null;
  return (
    <g aria-hidden>
      <defs>
        {glowing.map(({ light, id }) => (
          <radialGradient key={id} id={id} gradientUnits="userSpaceOnUse" cx={light.at.x} cy={light.at.y} r={light.reach}>
            <stop offset={0} stopColor={light.look.color ?? WARM_GLOW} stopOpacity={0.5} />
            <stop offset={light.bright / light.reach} stopColor={light.look.color ?? WARM_GLOW} stopOpacity={0.3} />
            <stop offset={1} stopColor={light.look.color ?? WARM_GLOW} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>
      {glowing.map(({ light, id }) => <polygon key={id} points={toPoints(light.polygon)} fill={`url(#${CSS.escape(id)})`} className={EFFECT_CLASSES[light.look.effect]} />)}
    </g>
  );
}

export function LightLookRows({ look, onChange }: { look: LightLook; onChange: (look: LightLook) => void }) {
  const change = (patch: Partial<LightLook>) => onChange({ ...look, ...patch });
  const { coneDegrees, directionDegrees } = look;
  return (
    <>
      <ColorSpectrumPicker label="Колір світла" value={look.color} onChange={(color) => change({ color })} natural={{ label: "Тепле", onChoose: () => change({ color: DEFAULT_LIGHT_LOOK.color }) }} />
      <Segmented label="Як світить" value={look.effect} options={EFFECT_OPTIONS} onChange={(effect) => change({ effect })} />
      <Stepper label="Конус" value={coneDegrees >= CONE.max ? "Коло" : `${coneDegrees}°`} onStep={(direction) => change({ coneDegrees: coneDegrees + direction * CONE.step })} canDecrease={coneDegrees > CONE.min} canIncrease={coneDegrees < CONE.max} />
      {coneDegrees < CONE.max ? (
        <Stepper label="Напрямок" value={`${directionDegrees}°`} onStep={(direction) => change({ directionDegrees: (directionDegrees + direction * DIRECTION_STEP + 360) % 360 })}>
          <output aria-live="polite" className="flex min-w-14 items-center justify-center gap-1 text-base tabular-nums text-slate-100">
            <ArrowRight aria-hidden className="h-4 w-4 text-amber-200" style={{ transform: `rotate(${directionDegrees}deg)` }} />
            {directionDegrees}°
          </output>
        </Stepper>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { setSceneAtmosphereAction } from "@/lib/actions/game-scene-atmosphere";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { ATMOSPHERE_LIMITS, type SceneAtmosphere, type SceneTint, type SceneWeather } from "@/rules/game-atmosphere";
import type { GameSessionView } from "@/server/db/game-sessions";
import { ColorSpectrumPicker } from "./ColorSpectrumPicker";
import { Segmented, Stepper, ToolPanel } from "./MapToolbar";
import { Hint } from "./MapToolPanels";
import { sendOptimistic, useOptimistic } from "./optimistic-values";
import { drawWeatherFrame, fitWeatherToMap, makeWeatherParticles, type WeatherParticles } from "./weather-particles";

const WEATHER_OPTIONS: Array<{ value: SceneWeather; label: string }> = [
  { value: "none", label: "Ясно" },
  { value: "rain", label: "Дощ" },
  { value: "storm", label: "Гроза" },
  { value: "snow", label: "Сніг" },
  { value: "blizzard", label: "Хуртовина" },
  { value: "fog", label: "Імла" },
];

const TINT_OPTIONS: Array<{ value: SceneTint; label: string }> = [
  { value: "none", label: "Звичайне" },
  { value: "sunset", label: "Захід сонця" },
  { value: "night", label: "Ніч" },
  { value: "ethereal", label: "Етерний план" },
  { value: "feywild", label: "Фейвайлд" },
  { value: "shadowfell", label: "Царство тіней" },
  { value: "infernal", label: "Пекло" },
  { value: "custom", label: "Свій колір" },
];

type TintLook = { rgb: string; alpha: number; blend: CSSProperties["mixBlendMode"] };
const TINT_LOOKS: Record<Exclude<SceneTint, "none" | "custom">, TintLook> = {
  sunset: { rgb: "255 120 50", alpha: 0.45, blend: "multiply" },
  night: { rgb: "25 35 90", alpha: 0.65, blend: "multiply" },
  ethereal: { rgb: "60 255 180", alpha: 0.4, blend: "color" },
  feywild: { rgb: "190 80 255", alpha: 0.45, blend: "overlay" },
  shadowfell: { rgb: "70 75 90", alpha: 0.8, blend: "saturation" },
  infernal: { rgb: "255 40 20", alpha: 0.45, blend: "multiply" },
};
const CUSTOM_TINT_ALPHA = 0.5;
const MAX_TINT_ALPHA = 0.95;
const toRgb = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(" ");

function findTintLook({ tint, tintColor, tintStrength }: SceneAtmosphere): TintLook | null {
  if (tint === "none") return null;
  const look = tint === "custom" ? (tintColor ? { rgb: toRgb(tintColor), alpha: CUSTOM_TINT_ALPHA, blend: "multiply" as const } : null) : TINT_LOOKS[tint];
  return look && { ...look, alpha: Math.min(MAX_TINT_ALPHA, (look.alpha * tintStrength) / 100) };
}

export const findAtmosphereKey = (sceneId: number | null) => `atmosphere:${sceneId}`;
export const useSceneAtmosphere = (view: GameSessionView) => useOptimistic<SceneAtmosphere>(findAtmosphereKey(view.viewedSceneId), view.atmosphere);

function useAtmosphereChange(view: GameSessionView) {
  const atmosphere = useSceneAtmosphere(view);
  const change = (patch: Partial<SceneAtmosphere>) => {
    const sceneId = view.viewedSceneId;
    if (sceneId === null) return;
    const next = { ...atmosphere, ...patch };
    void sendOptimistic(findAtmosphereKey(sceneId), next, () => setSceneAtmosphereAction(view.id, sceneId, next)).then((result) => {
      if (result.ok) captureGameEvent("game_atmosphere_changed", { weather: next.weather, tint: next.tint });
    });
  };
  return { atmosphere, change };
}

/// Відтінок лежить на мапі під токенами: світло змінює місце, а героїв і істот видно як завжди.
export function MapTint({ atmosphere }: { atmosphere: SceneAtmosphere }) {
  const look = findTintLook(atmosphere);
  if (!look) return null;
  return <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl" style={{ backgroundColor: `rgb(${look.rgb} / ${look.alpha})`, mixBlendMode: look.blend }} />;
}

/// Погода падає лише над мапою й їде разом із нею, але частинки лишаються екранного розміру: при наближенні сніг не росте.
export function MapWeather({ atmosphere, mapRef }: { atmosphere: SceneAtmosphere; mapRef: RefObject<HTMLElement | null> }) {
  const { weather, weatherColor } = atmosphere;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(atmosphere.weatherSpeed / 100);
  useEffect(() => {
    speedRef.current = atmosphere.weatherSpeed / 100;
  }, [atmosphere.weatherSpeed]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || weather === "none") return;
    const isStill = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let particles: WeatherParticles | null = null;
    let frame = 0;
    let last = performance.now();
    const readMap = () => {
      const map = mapRef.current?.getBoundingClientRect();
      const own = canvas.getBoundingClientRect();
      return map ? { x: map.left - own.left, y: map.top - own.top, width: map.width, height: map.height } : { x: 0, y: 0, width: own.width, height: own.height };
    };
    const fit = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round(canvas.clientHeight * ratio);
      if (particles && width === canvas.width && height === canvas.height) return;
      canvas.width = width;
      canvas.height = height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = makeWeatherParticles(weather, canvas.clientWidth, canvas.clientHeight, readMap(), weatherColor);
      if (isStill) drawWeatherFrame(context, particles, 0, last, false);
    };
    const step = (now: number) => {
      const hasMoved = particles ? fitWeatherToMap(particles, readMap()) : false;
      if (particles && (!isStill || hasMoved)) drawWeatherFrame(context, particles, isStill ? 0 : Math.min(0.05, (now - last) / 1000) * speedRef.current, now, !isStill);
      last = now;
      frame = requestAnimationFrame(step);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    fit();
    frame = requestAnimationFrame(step);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [weather, weatherColor, mapRef]);
  if (weather === "none") return null;
  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-[5] h-full w-full [@container(min-width:40rem)]:rounded-xl" />;
}

const { weatherSpeed: SPEED, tintStrength: STRENGTH } = ATMOSPHERE_LIMITS;

export function AtmospherePanel({ view, onClose }: { view: GameSessionView; onClose: () => void }) {
  const { atmosphere, change } = useAtmosphereChange(view);
  const { weather, weatherSpeed, weatherColor } = atmosphere;
  return (
    <ToolPanel title="Погода" onClose={onClose}>
      <Segmented label="Погода" value={weather} options={WEATHER_OPTIONS} onChange={(next) => change({ weather: next })} isTwoRows />
      {weather === "none" ? null : (
        <>
          <Stepper label="Швидкість" value={`${weatherSpeed}%`} onStep={(direction) => change({ weatherSpeed: weatherSpeed + direction * SPEED.step })} canDecrease={weatherSpeed > SPEED.min} canIncrease={weatherSpeed < SPEED.max} />
          <ColorSpectrumPicker label="Колір погоди" value={weatherColor} onChange={(hex) => change({ weatherColor: hex })} natural={{ label: "Природний", onChoose: () => change({ weatherColor: null }) }} />
        </>
      )}
      <Hint>Гравці бачать зміни одразу. Кожен може сховати погоду в себе: «Вигляд» → «Показувати погоду в мене». Відтінок мапи — у «Світлі».</Hint>
    </ToolPanel>
  );
}

const FIRST_CUSTOM_TINT = "#8b5cf6";

/// Відтінок мапи живе в «Світлі»: це настрій освітлення сцени, а не погода.
export function MapTintRows({ view }: { view: GameSessionView }) {
  const { atmosphere, change } = useAtmosphereChange(view);
  const { tint, tintColor, tintStrength } = atmosphere;
  return (
    <div className="space-y-2 border-t border-white/10 pt-2">
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-slate-200">Відтінок мапи</h4>
        <p className="text-sm leading-snug text-slate-400">Змінює кольори мапи в цій сцені.</p>
      </div>
      <Segmented label="Відтінок мапи" value={tint} options={TINT_OPTIONS} onChange={(next) => change({ tint: next, tintColor: next === "custom" ? (tintColor ?? FIRST_CUSTOM_TINT) : tintColor })} isTwoRows />
      {tint === "custom" ? <ColorSpectrumPicker label="Колір відтінку" value={tintColor} onChange={(hex) => change({ tintColor: hex })} /> : null}
      {tint === "none" ? null : <Stepper label="Інтенсивність" value={`${tintStrength}%`} onStep={(direction) => change({ tintStrength: tintStrength + direction * STRENGTH.step })} canDecrease={tintStrength > STRENGTH.min} canIncrease={tintStrength < STRENGTH.max} />}
    </div>
  );
}

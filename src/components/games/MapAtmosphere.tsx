"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { setSceneAtmosphereAction } from "@/lib/actions/game-scene-atmosphere";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import type { SceneAtmosphere, SceneTint, SceneWeather } from "@/rules/game-atmosphere";
import type { GameSessionView } from "@/server/db/game-sessions";
import { Segmented, ToolPanel } from "./MapToolbar";
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
];

const TINT_STYLES: Record<Exclude<SceneTint, "none">, CSSProperties> = {
  sunset: {
    backgroundColor: "rgb(255 120 50 / 0.45)",
    mixBlendMode: "multiply",
  },
  night: { backgroundColor: "rgb(25 35 90 / 0.65)", mixBlendMode: "multiply" },
  ethereal: { backgroundColor: "rgb(60 255 180 / 0.4)", mixBlendMode: "color" },
  feywild: {
    backgroundColor: "rgb(190 80 255 / 0.45)",
    mixBlendMode: "overlay",
  },
  shadowfell: {
    backgroundColor: "rgb(70 75 90 / 0.8)",
    mixBlendMode: "saturation",
  },
  infernal: {
    backgroundColor: "rgb(255 40 20 / 0.45)",
    mixBlendMode: "multiply",
  },
};

export const findAtmosphereKey = (sceneId: number | null) => `atmosphere:${sceneId}`;
export const useSceneAtmosphere = (view: GameSessionView) => useOptimistic<SceneAtmosphere>(findAtmosphereKey(view.viewedSceneId), view.atmosphere);

/// Відтінок лежить на мапі під токенами: світло змінює місце, а героїв і істот видно як завжди.
export function MapTint({ tint }: { tint: SceneTint }) {
  if (tint === "none") return null;
  return <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl" style={TINT_STYLES[tint]} />;
}

/// Погода падає лише над мапою й їде разом із нею, але частинки лишаються екранного розміру: при наближенні сніг не росте.
export function MapWeather({ weather, mapRef }: { weather: SceneWeather; mapRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
      particles = makeWeatherParticles(weather, canvas.clientWidth, canvas.clientHeight, readMap());
      if (isStill) drawWeatherFrame(context, particles, 0, last, false);
    };
    const step = (now: number) => {
      const hasMoved = particles ? fitWeatherToMap(particles, readMap()) : false;
      if (particles && (!isStill || hasMoved)) drawWeatherFrame(context, particles, isStill ? 0 : Math.min(0.05, (now - last) / 1000), now, !isStill);
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
  }, [weather, mapRef]);
  if (weather === "none") return null;
  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-[5] h-full w-full [@container(min-width:40rem)]:rounded-xl" />;
}

export function AtmospherePanel({ view, onClose }: { view: GameSessionView; onClose: () => void }) {
  const atmosphere = useSceneAtmosphere(view);
  const change = (next: SceneAtmosphere) => {
    const sceneId = view.viewedSceneId;
    if (sceneId === null) return;
    void sendOptimistic(findAtmosphereKey(sceneId), next, () => setSceneAtmosphereAction(view.id, sceneId, next)).then((result) => {
      if (result.ok) captureGameEvent("game_atmosphere_changed", next);
    });
  };
  return (
    <ToolPanel title="Погода" onClose={onClose}>
      <Segmented label="Погода" value={atmosphere.weather} options={WEATHER_OPTIONS} onChange={(weather) => change({ ...atmosphere, weather })} isTwoRows />
      <div className="space-y-1.5">
        <p className="text-sm text-slate-300">Відтінок мапи</p>
        <Segmented label="Відтінок мапи" value={atmosphere.tint} options={TINT_OPTIONS} onChange={(tint) => change({ ...atmosphere, tint })} isTwoRows />
      </div>
      <Hint>Гравці бачать зміни одразу. Кожен може сховати погоду в себе: «Вигляд» → «Показувати погоду в мене».</Hint>
    </ToolPanel>
  );
}

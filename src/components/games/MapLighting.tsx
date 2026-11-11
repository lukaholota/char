"use client";

import { Lightbulb, LightbulbOff, Trash2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MAP_VIEW_WIDTH, findViewUnitsPerFoot, toViewPoint, type MapFrame } from "@/rules/game-grid";
import { LIGHT_LIMITS, LIGHT_PRESETS, type SceneLighting, type SceneSight, type TokenLight } from "@/rules/game-lighting";
import type { ViewPoint } from "@/rules/map-visibility";
import type { MapHistory } from "./map-history";
import { MapSvg } from "./MapOverlay";
import { HistoryButtons, Segmented, Stepper, ToolPanel } from "./MapToolbar";
import { COUNTER_ZOOM } from "./MapTokenSlot";
import type { MapLights, TokenLights, TokenLightTarget } from "./use-map-lights";
import type { FadingSight } from "./use-map-sight";

const LIGHTINGS: Array<{ value: SceneLighting; label: string; hint: string }> = [
  { value: "off", label: "Вимкнено", hint: "Мапа як завжди: гравці бачать усе, крім туману." },
  { value: "bright", label: "Яскраве", hint: "Гравці бачать усе, що бачать герої; стіни закривають огляд." },
  { value: "dim", label: "Тьмяне", hint: "Огляд героїв притемнений; темний зір бачить як при яскравому світлі." },
  { value: "dark", label: "Темрява", hint: "Видно лише освітлене, темний зір і клітинку самого героя." },
];
const FEET_STEP = 5;
const DARKVISION_STEP = 30;
/// Маска: білий лишає темряву, сірий — тьмяне світло, чорний — яскраве.
const DIM_SHADE = "#666";
const BRIGHT_SHADE = "#000";
const NO_LIGHT_KEY = "none";

const toPoints = (polygon: ViewPoint[]) => polygon.map((point) => `${point.x},${point.y}`).join(" ");
const describeFeet = (light: TokenLight) => `${light.brightFeet}/${light.dimFeet} фт`;
const toPercent = (at: { x: number; y: number }) => ({ left: `${at.x * 100}%`, top: `${at.y * 100}%` });

/// Пляма світла: суцільна майже до краю, далі мʼяко гасне; поза радіусом — нічого.
function SoftDisc({ id, at, radius, shade }: { id: string; at: ViewPoint; radius: number; shade: string }) {
  return (
    <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={at.x} cy={at.y} r={radius}>
      <stop offset={0} stopColor={shade} />
      <stop offset={0.85} stopColor={shade} />
      <stop offset={1} stopColor={shade} stopOpacity={0} />
    </radialGradient>
  );
}

type Patch = { key: string; polygon: ViewPoint[]; at: ViewPoint; radius: number; shade: string };

/// Спершу тьмяні плями, потім яскраві: сіре не притемнює чуже яскраве.
function collectPatches(sight: SceneSight): Patch[] {
  const darkvisionShade = sight.lighting === "dim" ? BRIGHT_SHADE : DIM_SHADE;
  const dim: Patch[] = [
    ...sight.lights.map((light, index) => ({ key: `light-dim-${index}`, polygon: light.polygon, at: light.at, radius: light.reach, shade: DIM_SHADE })),
    ...(sight.lighting === "dark" ? sight.eyes.map((eye, index) => ({ key: `eye-cell-${index}`, polygon: eye.polygon, at: eye.at, radius: eye.ownCell, shade: DIM_SHADE })) : []),
  ];
  const bright: Patch[] = sight.lights.map((light, index) => ({ key: `light-bright-${index}`, polygon: light.polygon, at: light.at, radius: light.bright, shade: BRIGHT_SHADE }));
  const darkvision: Patch[] = sight.eyes.map((eye, index) => ({ key: `eye-darkvision-${index}`, polygon: eye.polygon, at: eye.at, radius: eye.darkvision, shade: darkvisionShade }));
  const ordered = darkvisionShade === DIM_SHADE ? [...dim, ...darkvision, ...bright] : [...dim, ...bright, ...darkvision];
  return ordered.filter((patch) => patch.radius > 0);
}

/// Темрява поверх мапи. Гравцю — непрозора, майстрові — вуаль, як у тумані.
export function MapSightLayer({ sight, isVeil, className }: { sight: SceneSight; isVeil: boolean; className?: string }) {
  const id = useId();
  const findUrl = (name: string) => `url(#${CSS.escape(`${id}${name}`)})`;
  const height = MAP_VIEW_WIDTH / sight.aspect;
  const patches = collectPatches(sight);
  return (
    <MapSvg aspect={sight.aspect} className={className}>
      <defs>
        <clipPath id={`${id}eyes`}>
          {sight.eyes.map((eye, index) => <polygon key={index} points={toPoints(eye.polygon)} />)}
        </clipPath>
        {patches.map((patch) => <SoftDisc key={patch.key} id={`${id}${patch.key}`} at={patch.at} radius={patch.radius} shade={patch.shade} />)}
        <mask id={`${id}mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={MAP_VIEW_WIDTH} height={height}>
          <rect width={MAP_VIEW_WIDTH} height={height} fill="white" />
          <g clipPath={findUrl("eyes")}>
            {sight.lighting === "dark" ? null : <rect width={MAP_VIEW_WIDTH} height={height} fill={sight.lighting === "bright" ? BRIGHT_SHADE : DIM_SHADE} />}
            {sight.lighting === "bright" ? null : patches.map((patch) => <polygon key={patch.key} points={toPoints(patch.polygon)} fill={findUrl(patch.key)} />)}
          </g>
        </mask>
      </defs>
      <rect width={MAP_VIEW_WIDTH} height={height} mask={findUrl("mask")} className={isVeil ? "fill-slate-950/55" : "fill-slate-950"} />
    </MapSvg>
  );
}

/// Гравцю темрява лягає між істотами й героями, як туман; стара картина ще гасне зверху.
export function MapSight({ sight, fading, isVeil }: { sight: SceneSight; fading: FadingSight; isVeil: boolean }) {
  const layer = isVeil ? undefined : "z-20";
  return (
    <>
      <MapSightLayer sight={sight} isVeil={isVeil} className={layer} />
      {fading.fading ? (
        <div className={cn("map-sight-fade pointer-events-none absolute inset-0", layer)} onAnimationEnd={fading.clearFading}>
          <MapSightLayer sight={fading.fading} isVeil={isVeil} />
        </div>
      ) : null}
    </>
  );
}

/// Джерела сцени під інструментом «Світло»: дотик вибирає, перетягування пересуває; кола показують яскраве й тьмяне.
export function MapLightMarkers({ lights, frame, aspect }: { lights: MapLights; frame: MapFrame | null; aspect: number }) {
  const perFoot = frame ? findViewUnitsPerFoot(frame) : 0;
  return (
    <div className="pointer-events-none absolute inset-0 z-[34]">
      {perFoot ? (
        <MapSvg aspect={aspect} className="overflow-hidden">
          {lights.shown.map((light) => {
            const at = toViewPoint(lights.findShownAt(light), aspect);
            const stroke = light.isOn ? "stroke-amber-200" : "stroke-slate-400";
            return (
              <g key={light.id} fill="none" vectorEffect="non-scaling-stroke" strokeDasharray={light.isOn ? undefined : "4 4"}>
                {light.brightFeet ? <circle cx={at.x} cy={at.y} r={light.brightFeet * perFoot} strokeWidth={1.5} vectorEffect="non-scaling-stroke" className={stroke} /> : null}
                <circle cx={at.x} cy={at.y} r={(light.brightFeet + light.dimFeet) * perFoot} strokeWidth={1} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" className={stroke} />
              </g>
            );
          })}
        </MapSvg>
      ) : null}
      {lights.shown.map((light) => {
        const Icon = light.isOn ? Lightbulb : LightbulbOff;
        const isChosen = lights.chosen?.id === light.id;
        return (
          <button
            key={light.id}
            type="button"
            data-map-control
            aria-label={`Джерело світла ${describeFeet(light)}${light.isOn ? "" : ", згасле"}. Дотик — вибрати, тягніть — пересунути`}
            aria-pressed={isChosen}
            className={cn("pointer-events-auto absolute grid h-11 w-11 touch-none place-items-center rounded-full", lights.ghostId === light.id && "opacity-70")}
            style={{ ...toPercent(lights.findShownAt(light)), transform: `translate(-50%, -50%) ${COUNTER_ZOOM}` }}
            {...lights.bindLight(light.id)}
          >
            <span aria-hidden className={cn("grid h-7 w-7 place-items-center rounded-full border shadow-lg shadow-black/60", light.isOn ? "border-amber-200 bg-amber-950/90 text-amber-100" : "border-slate-400 bg-slate-950/90 text-slate-300", isChosen && "ring-2 ring-arcane-200")}>
              <Icon className="h-4 w-4" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

type LightPanelProps = { lights: MapLights; hasGrid: boolean; isPreview: boolean; onPreviewChange: (isOn: boolean) => void; history: MapHistory; onClose: () => void };

export function LightPanel({ lights, hasGrid, isPreview, onPreviewChange, history, onClose }: LightPanelProps) {
  const chosen = lights.chosen;
  const hint = LIGHTINGS.find((option) => option.value === lights.lighting)?.hint;
  return (
    <ToolPanel title="Світло" onClose={onClose} aside={<HistoryButtons history={history} />}>
      <Segmented label="Освітлення сцени" value={lights.lighting} options={LIGHTINGS} onChange={lights.setLighting} isTwoRows />
      <p className="text-sm leading-snug text-slate-400">{hint}</p>
      {chosen ? (
        <div className="space-y-2 border-t border-white/10 pt-2">
          <Stepper label="Яскраве" value={`${chosen.brightFeet} фт`} onStep={(direction) => lights.change(chosen.id, { ...chosen, brightFeet: chosen.brightFeet + direction * FEET_STEP })} canDecrease={chosen.brightFeet > 0} canIncrease={chosen.brightFeet < LIGHT_LIMITS.feet} />
          <Stepper label="Тьмяне понад нього" value={`${chosen.dimFeet} фт`} onStep={(direction) => lights.change(chosen.id, { ...chosen, dimFeet: chosen.dimFeet + direction * FEET_STEP })} canDecrease={chosen.dimFeet > 0} canIncrease={chosen.dimFeet < LIGHT_LIMITS.feet} />
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm text-slate-300">
            Горить
            <Switch checked={chosen.isOn} onCheckedChange={(isOn) => lights.change(chosen.id, { ...chosen, isOn })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => lights.remove(chosen.id)} className="h-11 gap-2 text-rose-200"><Trash2 className="h-4 w-4" aria-hidden />Видалити</Button>
            <Button type="button" variant="ghost" onClick={() => lights.choose(null)} className="h-11 text-slate-300">Готово</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 border-t border-white/10 pt-2">
          <p className="text-sm leading-snug text-slate-400">{hasGrid ? (lights.isFull ? `На сцені вже ${LIGHT_LIMITS.perScene} джерел — приберіть зайві.` : "Джерело стане в центр видимої частини мапи. Дотик до нього — змінити, тягніть — пересунути.") : "Спершу підженіть сітку — світло міряється футами."}</p>
          <div className="grid grid-cols-2 gap-2">
            {LIGHT_PRESETS.map((preset) => (
              <Button key={preset.key} type="button" variant="outline" disabled={!hasGrid || lights.isFull} onClick={() => void lights.placePreset(preset)} className="h-auto min-h-11 flex-col items-start gap-0 px-3 py-1.5 text-left">
                <span className="w-full truncate">{preset.name}</span>
                <span className="text-xs tabular-nums text-slate-400">{describeFeet(preset)}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-white/10 pt-2 text-sm text-slate-300">
        Як бачать гравці
        <Switch checked={isPreview} onCheckedChange={onPreviewChange} />
      </label>
    </ToolPanel>
  );
}

const findPresetKey = (light: TokenLight) => (light.brightFeet + light.dimFeet === 0 ? NO_LIGHT_KEY : (LIGHT_PRESETS.find((preset) => preset.brightFeet === light.brightFeet && preset.dimFeet === light.dimFeet)?.key ?? `custom`));

/// Рядки в панелі вибраного токена, поки на сцені ввімкнено освітлення.
export function TokenLightRows({ target, tokenLights, canSetDarkvision }: { target: TokenLightTarget; tokenLights: TokenLights; canSetDarkvision: boolean }) {
  const light = tokenLights.findLight(target);
  const presetKey = findPresetKey(light);
  const choose = (key: string) => {
    const preset = LIGHT_PRESETS.find((candidate) => candidate.key === key);
    tokenLights.setLight(target, preset ? { brightFeet: preset.brightFeet, dimFeet: preset.dimFeet } : { brightFeet: 0, dimFeet: 0 }, key);
  };
  const member = target.kind === "hero" ? target.member : null;
  const darkvision = member ? tokenLights.findDarkvision(member) : 0;
  return (
    <div className="space-y-2 border-t border-white/10 pt-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-sm text-slate-300">Світло</span>
        <Select value={presetKey} onValueChange={choose}>
          <SelectTrigger aria-label="Світло, яке несе токен" className="h-11 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_LIGHT_KEY}>Немає</SelectItem>
            {presetKey === "custom" ? <SelectItem value="custom" disabled>{`Своє: ${describeFeet(light)}`}</SelectItem> : null}
            {LIGHT_PRESETS.map((preset) => <SelectItem key={preset.key} value={preset.key}>{`${preset.name} · ${describeFeet(preset)}`}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {member && canSetDarkvision ? (
        <>
          <Stepper label="Темний зір" value={`${darkvision} фт`} onStep={(direction) => tokenLights.sendDarkvision(member, Math.max(0, darkvision + direction * DARKVISION_STEP))} canDecrease={darkvision > 0} canIncrease={darkvision + DARKVISION_STEP <= LIGHT_LIMITS.feet} />
          <Button type="button" variant="ghost" onClick={() => tokenLights.sendDarkvision(member, null)} className="h-11 w-full text-slate-300">Темний зір як у листі героя</Button>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { setSceneAmbienceAction } from "@/lib/actions/game-scene-atmosphere";
import { findAudioContext } from "@/lib/components/game/play-roll-chime";
import { playSoundEffect } from "@/lib/components/game/scene-sounds";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { cn } from "@/lib/utils";
import { AMBIENCE_LIMITS, AMBIENT_SOUNDS, isOwnSoundKey, SOUND_EFFECTS, toggleAmbienceLayer, type AmbienceLayer, type AmbientSoundKey, type OwnSoundKey, type SoundEffectKey } from "@/rules/game-atmosphere";
import type { GameSessionView } from "@/server/db/game-sessions";
import { Segmented, ToolPanel } from "./MapToolbar";
import { Hint } from "./MapToolPanels";
import { CHIP, CHIP_OFF, CHIP_ON, findOwnSoundName, OwnSoundsSection, useOwnSounds } from "./OwnSounds";
import { sendOptimistic } from "./optimistic-values";
import { findAmbienceKey, useAmbienceLayers, useIsAudioLocked } from "./use-scene-ambience";

const EFFECT_NAMES: Record<SoundEffectKey, string> = {
  explosion: "Вибух",
  thunder: "Грім",
  shot: "Постріл",
  horn: "Бойовий ріг",
  fah: "FAHH",
};
const AMBIENT_NAMES: Record<AmbientSoundKey, string> = {
  rain: "Дощ",
  fire: "Вогнище",
  tavern: "Таверна",
  cave: "Печера",
  sea: "Море",
  battle: "Битва",
};
const LAYER_LEVELS = [
  { value: "25", label: "Тихо" },
  { value: "60", label: "Середньо" },
  { value: "100", label: "Гучно" },
] as const;
type LayerLevel = (typeof LAYER_LEVELS)[number]["value"];
const findLayerLevel = (volume: number): LayerLevel => (volume < 45 ? "25" : volume < 80 ? "60" : "100");

/// Ефект майстер чує одразу, решта — щойно сигнал дійде; втрачений сигнал нічого не ламає, тож без повторів.
function playForRoom(view: GameSessionView, key: SoundEffectKey | OwnSoundKey, name: string) {
  playSoundEffect(key, useGameSessionStore.getState().sceneVolume / 100);
  toast(`${name} — для всіх на сцені`, {
    id: "scene-sound",
    duration: 1500,
  });
  captureGameEvent("game_sound_played", { key: isOwnSoundKey(key) ? "own" : key });
  void fetch(`/api/game-sessions/${view.id}/sound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
    keepalive: true,
  })
    .then((response) => {
      if (response.status === 429) toast.error("Забагато звуків поспіль — зачекайте кілька секунд");
      if (response.status === 404) toast.error("Цього звуку вже немає в бібліотеці");
    })
    .catch(() => undefined);
}

export function SoundsPanel({ view, onClose }: { view: GameSessionView; onClose: () => void }) {
  const layers = useAmbienceLayers(view);
  const library = useOwnSounds();
  const findLayerName = (key: AmbienceLayer["key"]) => (isOwnSoundKey(key) ? findOwnSoundName(library.sounds, key) : AMBIENT_NAMES[key]);
  const changeLayers = (next: AmbienceLayer[]) => {
    const sceneId = view.viewedSceneId;
    if (sceneId === null) return;
    void sendOptimistic(findAmbienceKey(sceneId), next, () => setSceneAmbienceAction(view.id, sceneId, next)).then((result) => {
      if (result.ok) captureGameEvent("game_ambience_changed", { layer_count: next.length });
    });
  };
  const isFull = layers.length >= AMBIENCE_LIMITS.layers;
  return (
    <ToolPanel title="Звуки" onClose={onClose}>
      <SoundUnlockButton />
      <section aria-label="Ефекти" className="space-y-1.5">
        <p className="text-sm text-slate-300">Ефект — один раз для всіх на сцені</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SOUND_EFFECTS.map((key) => (
            <button key={key} type="button" onClick={() => playForRoom(view, key, EFFECT_NAMES[key])} className={cn(CHIP, CHIP_OFF)}>
              <span className="truncate">{EFFECT_NAMES[key]}</span>
            </button>
          ))}
        </div>
      </section>
      <section aria-label="Фон сцени" className="space-y-1.5">
        <p className="text-sm text-slate-300">Фон сцени — грає, доки не вимкнете</p>
        <div className="grid grid-cols-2 gap-1.5">
          {AMBIENT_SOUNDS.map((key) => {
            const isOn = layers.some((layer) => layer.key === key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isOn}
                disabled={!isOn && isFull}
                onClick={() => changeLayers(toggleAmbienceLayer(layers, key))}
                className={cn(CHIP, isOn ? CHIP_ON : CHIP_OFF, "disabled:opacity-40")}
              >
                <span className="truncate">{AMBIENT_NAMES[key]}</span>
              </button>
            );
          })}
        </div>
        {layers.map((layer) => (
          <div key={layer.key} className="flex items-center gap-2">
            <span className="w-20 shrink-0 truncate text-sm text-slate-400">{findLayerName(layer.key)}</span>
            <div className="min-w-0 flex-1">
              <Segmented<LayerLevel>
                label={`Гучність: ${findLayerName(layer.key)}`}
                value={findLayerLevel(layer.volume)}
                options={[...LAYER_LEVELS]}
                onChange={(level) => changeLayers(layers.map((other) => (other.key === layer.key ? { ...other, volume: Number(level) } : other)))}
              />
            </div>
          </div>
        ))}
        {isFull ? <Hint>Одночасно грає до {AMBIENCE_LIMITS.layers} фонів — вимкніть один, щоб додати інший.</Hint> : null}
      </section>
      <OwnSoundsSection library={library} layers={layers} isAmbienceFull={isFull} onPlay={(sound) => playForRoom(view, sound.key, sound.name)} onToggleLayer={(key) => changeLayers(toggleAmbienceLayer(layers, key))} />
      <SceneVolumeSlider />
    </ToolPanel>
  );
}

export function SceneVolumeSlider() {
  const volume = useGameSessionStore((state) => state.sceneVolume);
  return (
    <label className="flex w-full min-w-0 items-center gap-3 text-sm text-slate-400">
      <span className="shrink-0">Гучність на цьому пристрої</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={volume}
        onChange={(event) => useGameSessionStore.getState().setSceneVolume(Number(event.target.value))}
        className="h-11 w-full accent-arcane-300"
      />
    </label>
  );
}

/// Тап по кнопці сам і є жестом, який розблоковує звук.
export function SoundUnlockButton({ className }: { className?: string }) {
  const isLocked = useIsAudioLocked();
  const volume = useGameSessionStore((state) => state.sceneVolume);
  if (!isLocked || volume === 0) return null;
  return (
    <button
      type="button"
      onClick={() => void findAudioContext()?.resume()}
      className={cn("flex h-10 items-center gap-2 rounded-xl border border-amber-200/30 bg-slate-950/90 px-3 text-sm text-amber-100 hover:bg-slate-900", className)}
    >
      <Volume2 className="h-4 w-4 shrink-0" aria-hidden />
      Торкніться, щоб чути звуки сцени
    </button>
  );
}

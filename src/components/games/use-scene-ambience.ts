"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { findAudioContext } from "@/lib/components/game/play-roll-chime";
import { startAmbientLayer, type AmbientLayer } from "@/lib/components/game/scene-sounds";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import type { AmbienceLayer } from "@/rules/game-atmosphere";
import type { GameSessionView } from "@/server/db/game-sessions";
import { useOptimistic } from "./optimistic-values";

export const findAmbienceKey = (sceneId: number | null) => `ambience:${sceneId}`;
export const useAmbienceLayers = (view: GameSessionView) => useOptimistic<AmbienceLayer[]>(findAmbienceKey(view.viewedSceneId), view.ambience);

/// Фон сцени грає, поки відкрита кімната, на будь-якій вкладці; перемикання сцени міняє його плавно.
/// Окремий компонент: повзунок гучності перемальовує лише його, а не всю кімнату.
export function SceneAmbience({ view }: { view: GameSessionView }) {
  const layers = useAmbienceLayers(view);
  const volume = useGameSessionStore((state) => state.sceneVolume) / 100;
  const playing = useRef(new Map<AmbienceLayer["key"], AmbientLayer>());
  useEffect(() => {
    const wanted = new Map(volume > 0 ? layers.map((layer) => [layer.key, (layer.volume / 100) * volume] as const) : []);
    for (const [key, layer] of playing.current) {
      if (wanted.has(key)) continue;
      layer.stop();
      playing.current.delete(key);
    }
    for (const [key, level] of wanted) {
      const running = playing.current.get(key);
      if (running) running.setVolume(level);
      else {
        const started = startAmbientLayer(key, level);
        if (started) playing.current.set(key, started);
      }
    }
  }, [layers, volume]);
  useEffect(() => {
    const running = playing.current;
    return () => {
      running.forEach((layer) => layer.stop());
      running.clear();
    };
  }, []);
  return null;
}

function subscribeToAudio(onChange: () => void) {
  const audio = findAudioContext();
  audio?.addEventListener("statechange", onChange);
  return () => audio?.removeEventListener("statechange", onChange);
}

/// Браузер не грає звук до першого дотику; поки так, кнопка підказує, чому тихо.
export const useIsAudioLocked = () => useSyncExternalStore(subscribeToAudio, isAudioLocked, () => false);

function isAudioLocked() {
  const audio = findAudioContext();
  return audio !== null && audio.state !== "running";
}

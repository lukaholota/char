import { findOwnSoundFile, isOwnSoundKey, type AmbienceLayer, type OwnSoundKey, type SoundEffectKey } from "@/rules/game-atmosphere";
import { findAudioContext } from "./play-roll-chime";

export type AmbientLayer = { setVolume: (volume: number) => void; stop: () => void };

const SILENCE = 0.0001;
const SHORT_SOUND_SECONDS = 15;
const CACHED_SHORT_SOUNDS = 16;
const decoded = new Map<string, Promise<AudioBuffer | null>>();

const findEffectUrl = (key: SoundEffectKey | OwnSoundKey) => (isOwnSoundKey(key) ? `/${findOwnSoundFile(key)}` : `/sounds/effects/${key}.mp3`);
const findLayerUrl = (key: AmbienceLayer["key"]) => (isOwnSoundKey(key) ? `/${findOwnSoundFile(key)}` : `/sounds/ambience/${key}.mp3`);

export const playSoundEffect = (key: SoundEffectKey | OwnSoundKey, volume: number) => playSoundFile(findEffectUrl(key), volume);
export const startAmbientLayer = (key: AmbienceLayer["key"], volume: number) => startLoopedSound(findLayerUrl(key), volume);

/// Розкодовану хвилину фону (~20 МБ) не тримаємо в памʼяті після вимкнення: на iPhone вкладка від цього перезавантажується.
function loadSound(audio: AudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = decoded.get(url);
  if (cached) return cached;
  const loading = fetch(url)
    .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
    .then((bytes) => audio.decodeAudioData(bytes))
    .then((buffer) => {
      if (buffer.duration > SHORT_SOUND_SECONDS) decoded.delete(url);
      return buffer;
    })
    .catch(() => {
      decoded.delete(url);
      return null;
    });
  decoded.set(url, loading);
  if (decoded.size > CACHED_SHORT_SOUNDS) decoded.delete(decoded.keys().next().value!);
  return loading;
}

function playSoundFile(url: string, volume: number) {
  const audio = findAudioContext();
  if (!audio || audio.state !== "running" || volume <= 0) return;
  void loadSound(audio, url).then((buffer) => {
    if (!buffer) return;
    const out = audio.createGain();
    out.gain.value = volume;
    out.connect(audio.destination);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(out);
    source.onended = () => out.disconnect();
    source.start();
  });
}

function startLoopedSound(url: string, volume: number): AmbientLayer | null {
  const audio = findAudioContext();
  if (!audio) return null;
  const out = audio.createGain();
  out.gain.setValueAtTime(SILENCE, audio.currentTime);
  out.connect(audio.destination);
  let level = volume;
  let source: AudioBufferSourceNode | null = null;
  let isStopped = false;
  void loadSound(audio, url).then((buffer) => {
    if (!buffer || isStopped) return;
    source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(out);
    source.start(0, Math.random() * buffer.duration);
    out.gain.linearRampToValueAtTime(level, audio.currentTime + 1.5);
  });
  return {
    setVolume: (next) => {
      level = next;
      if (source) out.gain.setTargetAtTime(next, audio.currentTime, 0.2);
    },
    stop: () => {
      isStopped = true;
      out.gain.cancelScheduledValues(audio.currentTime);
      out.gain.setTargetAtTime(SILENCE, audio.currentTime, 0.3);
      source?.stop(audio.currentTime + 1.5);
      setTimeout(() => out.disconnect(), 1800);
    },
  };
}

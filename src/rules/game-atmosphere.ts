export const SCENE_WEATHERS = ["none", "rain", "storm", "snow", "blizzard", "fog"] as const;
export const SCENE_TINTS = ["none", "sunset", "night", "ethereal", "feywild", "shadowfell", "infernal"] as const;
/// Файли лежать у public/sounds/effects і public/sounds/ambience під цими ж назвами.
export const SOUND_EFFECTS = ["explosion", "thunder", "shot", "horn", "fah"] as const;
export const AMBIENT_SOUNDS = ["rain", "fire", "tavern", "cave", "sea", "battle"] as const;

export type SceneWeather = (typeof SCENE_WEATHERS)[number];
export type SceneTint = (typeof SCENE_TINTS)[number];
export type SoundEffectKey = (typeof SOUND_EFFECTS)[number];
export type AmbientSoundKey = (typeof AMBIENT_SOUNDS)[number];
export type SceneAtmosphere = { weather: SceneWeather; tint: SceneTint };
/// Свій звук майстра: uuid файлу в R2, тож гравцям не треба питати бібліотеку майстра, щоб його зіграти.
export type OwnSoundKey = `own:${string}`;
export type AmbienceLayer = { key: AmbientSoundKey | OwnSoundKey; volume: number };

export const AMBIENCE_LIMITS = {
  layers: 6,
  volume: { min: 5, max: 100 },
} as const;
export const OWN_SOUND_LIMITS = { perUser: 20, bytes: 5 * 1024 * 1024, nameLength: 40 } as const;
const OWN_SOUND_KEY = /^own:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const DEFAULT_LAYER_VOLUME = 60;

const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T => typeof value === "string" && (options as readonly string[]).includes(value);

export function parseSceneAtmosphere(raw: unknown): SceneAtmosphere | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { weather, tint } = raw as Record<string, unknown>;
  return isOneOf(SCENE_WEATHERS, weather) && isOneOf(SCENE_TINTS, tint) ? { weather, tint } : null;
}

export const readSceneWeather = (raw: unknown): SceneWeather => (isOneOf(SCENE_WEATHERS, raw) ? raw : "none");
export const readSceneTint = (raw: unknown): SceneTint => (isOneOf(SCENE_TINTS, raw) ? raw : "none");

export const isAmbientSoundKey = (raw: unknown): raw is AmbientSoundKey => isOneOf(AMBIENT_SOUNDS, raw);
export const isSoundEffectKey = (raw: unknown): raw is SoundEffectKey => isOneOf(SOUND_EFFECTS, raw);
export const isOwnSoundKey = (raw: unknown): raw is OwnSoundKey => typeof raw === "string" && OWN_SOUND_KEY.test(raw);
export const isSceneSoundKey = (raw: unknown): raw is SoundEffectKey | OwnSoundKey => isSoundEffectKey(raw) || isOwnSoundKey(raw);
export const buildOwnSoundKey = (fileId: string) => `own:${fileId}` as OwnSoundKey;
export const findOwnSoundFile = (key: OwnSoundKey) => `scene-sounds/${key.slice("own:".length)}`;
export const findOwnSoundKeys = (layers: AmbienceLayer[]) => layers.map((layer) => layer.key).filter(isOwnSoundKey);

export function readOwnSoundName(fileName: string): string {
  const name = fileName.replace(/\.[^.]*$/, "").replace(/[_-]+/g, " ").trim().slice(0, OWN_SOUND_LIMITS.nameLength).trim();
  return name || "Свій звук";
}

/// Зіпсований або застарілий шар просто випадає: фон не має ламати сцену.
export function readAmbience(raw: unknown): AmbienceLayer[] {
  if (!Array.isArray(raw)) return [];
  const layers: AmbienceLayer[] = [];
  for (const item of raw) {
    const layer = parseAmbienceLayer(item);
    if (layer && !layers.some((existing) => existing.key === layer.key)) layers.push(layer);
  }
  return layers.slice(0, AMBIENCE_LIMITS.layers);
}

export function parseAmbience(raw: unknown): AmbienceLayer[] | null {
  if (!Array.isArray(raw) || raw.length > AMBIENCE_LIMITS.layers) return null;
  const layers = readAmbience(raw);
  return layers.length === raw.length ? layers : null;
}

function parseAmbienceLayer(raw: unknown): AmbienceLayer | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { key, volume } = raw as Record<string, unknown>;
  if (!(isAmbientSoundKey(key) || isOwnSoundKey(key)) || typeof volume !== "number" || !Number.isFinite(volume)) return null;
  return {
    key,
    volume: Math.round(Math.min(AMBIENCE_LIMITS.volume.max, Math.max(AMBIENCE_LIMITS.volume.min, volume))),
  };
}

export function toggleAmbienceLayer(layers: AmbienceLayer[], key: AmbienceLayer["key"]): AmbienceLayer[] {
  if (layers.some((layer) => layer.key === key)) return layers.filter((layer) => layer.key !== key);
  return layers.length >= AMBIENCE_LIMITS.layers ? layers : [...layers, { key, volume: DEFAULT_LAYER_VOLUME }];
}

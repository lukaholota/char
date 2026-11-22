import { describe, expect, it } from "vitest";
import { buildOwnSoundKey, DEFAULT_ATMOSPHERE, findOwnSoundFile, findOwnSoundKeys, isAmbientSoundKey, isOwnSoundKey, isSceneSoundKey, isSoundEffectKey, parseAmbience, parseSceneAtmosphere, readAmbience, readOwnSoundName, readSceneAtmosphere, toggleAmbienceLayer } from "@/rules/game-atmosphere";

const FILE_ID = "0b6f3c1e-8a2d-4c4e-9f00-1234567890ab";

describe("атмосфера сцени", () => {
  it("приймає лише відомі погоду й відтінок", () => {
    const snowy = { ...DEFAULT_ATMOSPHERE, weather: "snow", tint: "ethereal" };
    expect(parseSceneAtmosphere(snowy)).toEqual(snowy);
    expect(parseSceneAtmosphere({ ...DEFAULT_ATMOSPHERE, weather: "hail" })).toBeNull();
    expect(parseSceneAtmosphere({ weather: "none", tint: "none" })).toBeNull();
    expect(parseSceneAtmosphere(null)).toBeNull();
  });

  it("швидкість і сила — цілі відсотки в межах, колір — hex", () => {
    const tinted = { ...DEFAULT_ATMOSPHERE, weather: "rain", weatherSpeed: 300, weatherColor: "#3B82F6", tint: "custom", tintColor: "#ff0000", tintStrength: 20 };
    expect(parseSceneAtmosphere(tinted)).toEqual({ ...tinted, weatherColor: "#3b82f6" });
    expect(parseSceneAtmosphere({ ...tinted, weatherSpeed: 325 })).toBeNull();
    expect(parseSceneAtmosphere({ ...tinted, weatherSpeed: 12.5 })).toBeNull();
    expect(parseSceneAtmosphere({ ...tinted, tintStrength: 10 })).toBeNull();
    expect(parseSceneAtmosphere({ ...tinted, weatherColor: "blue" })).toBeNull();
    expect(parseSceneAtmosphere({ ...tinted, tintColor: null })).toBeNull();
  });

  it("зіпсований рядок сцени читається як ясна погода без відтінку", () => {
    expect(readSceneAtmosphere(undefined)).toEqual(DEFAULT_ATMOSPHERE);
    expect(readSceneAtmosphere({ ...DEFAULT_ATMOSPHERE, tint: "acid" })).toEqual(DEFAULT_ATMOSPHERE);
    expect(readSceneAtmosphere({ ...DEFAULT_ATMOSPHERE, weather: "blizzard" }).weather).toBe("blizzard");
  });

  it("ефект і фон беруться лише з вбудованих переліків", () => {
    expect(isSoundEffectKey("thunder")).toBe(true);
    expect(isSoundEffectKey("rain")).toBe(false);
    expect(isSoundEffectKey("own:12")).toBe(false);
    expect(isAmbientSoundKey("rain")).toBe(true);
    expect(isAmbientSoundKey("thunder")).toBe(false);
  });

  it("свій звук — це uuid файлу, а не довільний рядок", () => {
    const key = buildOwnSoundKey(FILE_ID);
    expect(isOwnSoundKey(key)).toBe(true);
    expect(isSceneSoundKey(key)).toBe(true);
    expect(isSceneSoundKey("thunder")).toBe(true);
    expect(isOwnSoundKey("own:12")).toBe(false);
    expect(isOwnSoundKey(`own:${FILE_ID}/../x`)).toBe(false);
    expect(isSceneSoundKey("rain")).toBe(false);
    expect(findOwnSoundFile(key)).toBe(`scene-sounds/${FILE_ID}`);
    expect(findOwnSoundKeys([{ key: "rain", volume: 50 }, { key, volume: 50 }])).toEqual([key]);
  });

  it("назва свого звуку береться з імені файлу", () => {
    expect(readOwnSoundName("tavern_music-loop.mp3")).toBe("tavern music loop");
    expect(readOwnSoundName(".mp3")).toBe("Свій звук");
    expect(readOwnSoundName(`${"д".repeat(60)}.wav`)).toHaveLength(40);
  });

  it("фон читається без дублів і зіпсованих шарів, гучність тримається в межах", () => {
    expect(readAmbience([{ key: "rain", volume: 300 }, { key: "rain", volume: 10 }, { key: "sea", volume: 1 }, { key: "own:3", volume: 50 }, { key: "thunder", volume: 50 }, "x"])).toEqual([{ key: "rain", volume: 100 }, { key: "sea", volume: 5 }]);
    expect(parseAmbience([{ key: `own:${FILE_ID}`, volume: 30 }])).toEqual([{ key: `own:${FILE_ID}`, volume: 30 }]);
    expect(readAmbience("rain")).toEqual([]);
    expect(parseAmbience([{ key: "sea", volume: 40.4 }])).toEqual([{ key: "sea", volume: 40 }]);
    expect(parseAmbience([{ key: "sea", volume: 40 }, { key: "boom", volume: 40 }])).toBeNull();
    expect(parseAmbience(Array.from({ length: 7 }, () => ({ key: "sea", volume: 40 })))).toBeNull();
  });

  it("перемикач додає шар із типовою гучністю, прибирає наявний і не перевищує межу", () => {
    const one = toggleAmbienceLayer([], "fire");
    expect(one).toEqual([{ key: "fire", volume: 60 }]);
    expect(toggleAmbienceLayer(one, "fire")).toEqual([]);
    const full = ["rain", "battle", "fire", "tavern", "cave", "sea"].map((key) => ({ key, volume: 50 }));
    expect(toggleAmbienceLayer(full, "forest")).toBe(full);
  });
});

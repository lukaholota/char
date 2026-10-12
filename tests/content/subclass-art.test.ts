import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import classesJson from "@/lib/generated/classes.json";
import subclassArtManifest from "@/lib/assets/subclass-art-manifest.json";
import { findImageProvenance, findVisibleImageSrc } from "@/lib/assets/asset-provenance";
import { getSubclassImagePath } from "@/lib/assets/image-manifest";
import { getAllClasses } from "@/lib/classesData";

const publicDir = path.resolve(process.cwd(), "public");
const readyBuildsDir = path.resolve(process.cwd(), "data/rpgbot/ready-builds");
const ART_WIDTH = 1672;
const ART_HEIGHT = 941;
const SIZE_TOLERANCE_PX = 1;

function readWebpSize(publicRelativePath: string): { width: number; height: number } {
  const buffer = fs.readFileSync(path.join(publicDir, publicRelativePath.replace(/^\//, "")));
  if (buffer.subarray(12, 16).toString("ascii") !== "VP8 ") throw new Error(`${publicRelativePath}: очікувався lossy webp`);
  return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
}

function expectWideArt(publicRelativePath: string) {
  const { width, height } = readWebpSize(publicRelativePath);
  expect(Math.abs(width - ART_WIDTH)).toBeLessThanOrEqual(SIZE_TOLERANCE_PX);
  expect(Math.abs(height - ART_HEIGHT)).toBeLessThanOrEqual(SIZE_TOLERANCE_PX);
}

function collectSubclassKeys(): Set<string> {
  const keys = new Set<string>();
  for (const characterClass of classesJson as Array<{ subclasses: Array<{ key: string }> }>) {
    for (const subclass of characterClass.subclasses) keys.add(subclass.key);
  }
  return keys;
}

describe("арт підкласів", () => {
  const manifestEntries = Object.entries(subclassArtManifest);

  it("мапа не порожня", () => {
    expect(manifestEntries.length).toBeGreaterThan(0);
  });

  it.each(manifestEntries)("ключ %s веде до наявного 16:9 webp", (key, src) => {
    expect(collectSubclassKeys().has(key)).toBe(true);
    expect(src.startsWith("/images/subclasses/")).toBe(true);
    expectWideArt(src);
  });

  it("позначений як згенерований і зникає в режимі без ШІ", () => {
    const [, src] = manifestEntries[0];
    expect(findImageProvenance(src)).toBe("ai");
    expect(findVisibleImageSrc({ src, isNoAiMode: true })).toBeNull();
    expect(findVisibleImageSrc({ src, isNoAiMode: false })).toBe(src);
  });

  it("каталог класів віддає арт підкласу в обох редакціях і лишає порожнім, де його немає", () => {
    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      const subclasses = getAllClasses(ruleset).flatMap((characterClass) => characterClass.subclasses);
      const withArt = subclasses.filter((subclass) => subclass.imageSrc);
      expect(withArt.length).toBeGreaterThan(0);
      for (const subclass of withArt) expect(subclass.imageSrc).toBe(getSubclassImagePath(subclass.key));
    }
    const chronurgy = getAllClasses("RULES_2014").flatMap((characterClass) => characterClass.subclasses).find((subclass) => subclass.key === "SCHOOL_OF_CHRONURGY");
    expect(chronurgy?.imageSrc).toBe("/images/subclasses/wizard-chronurgy.webp");
  });

  it("шукає за ключем без огляду на регістр і не вигадує арт для невідомого", () => {
    expect(getSubclassImagePath("battle_master")).toBe("/images/subclasses/fighter-battle-master.webp");
    expect(getSubclassImagePath("NO_SUCH_SUBCLASS")).toBeNull();
    expect(getSubclassImagePath(null)).toBeNull();
  });
});

describe("портрети готових персонажів", () => {
  const presetFiles = fs.readdirSync(readyBuildsDir).filter((name) => name.endsWith(".json"));

  it.each(presetFiles)("%s: portraitSrc, якщо заданий, веде до наявного 16:9 webp", (fileName) => {
    const preset = JSON.parse(fs.readFileSync(path.join(readyBuildsDir, fileName), "utf8")) as { portraitSrc?: string | null };
    if (!preset.portraitSrc) return;
    expectWideArt(preset.portraitSrc);
    expect(findImageProvenance(preset.portraitSrc)).toBe("ai");
  });
});

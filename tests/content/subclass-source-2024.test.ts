import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { readSubclassSources } from "../../scripts/2024/parse-subclasses";

it("інвентар містить усі посилання на підкласи зі знімків сторінок класів", () => {
  const classes: Array<{ url: string; localPath: string; sha256: string }> = JSON.parse(
    readFileSync("data/2024/source/class-subclass-index.json", "utf8"),
  );
  const inventory: Array<{ url: string; localPath: string; sha256: string }> = JSON.parse(
    readFileSync("data/2024/source/subclass-inventory.json", "utf8"),
  );
  const linkedSubclasses = new Set<string>();
  for (const entry of classes) {
    const html = readFileSync(entry.localPath, "utf8");
    expect(createHash("sha256").update(html).digest("hex"), entry.url).toBe(entry.sha256);
    const classKey = new URL(entry.url).pathname.split(":")[0];
    for (const link of html.matchAll(/<td>\s*<a href="([^"]+)"/g)) {
      if (link[1].startsWith(`${classKey}:`) && !link[1].endsWith(":spell-list")) {
        linkedSubclasses.add(new URL(link[1], entry.url).href);
      }
    }
  }
  expect([...linkedSubclasses].sort()).toEqual(inventory.map(entry => entry.url).sort());
  for (const entry of inventory) {
    expect(createHash("sha256").update(readFileSync(entry.localPath)).digest("hex"), entry.url).toBe(entry.sha256);
  }
});

it("KR31.2 — кожен підклас інвентарю доходить до парсера незалежно від книги", () => {
  const inventory: Array<{ url: string }> = JSON.parse(readFileSync("data/2024/source/subclass-inventory.json", "utf8"));
  const subclasses = readSubclassSources();
  expect(subclasses.map(subclass => subclass.url).sort()).toEqual(inventory.map(entry => entry.url).sort());
  expect(new Set(subclasses.map(subclass => subclass.source))).toEqual(new Set([
    "Player's Handbook", "Eberron - Forge of the Artificer", "Ravenloft - The Horrors Within",
    "Forgotten Realms - Heroes of Faerun", "Arcana Unleashed",
  ]));
});

it("зберігає структуру рис усіх уже нормалізованих PHB-підкласів", () => {
  const existing: Array<{ className: string; engName: string; featuresEng: Array<{ level: number; name: string }> }> =
    JSON.parse(readFileSync("data/2024/normalized/subclasses.json", "utf8"));
  const subclasses = readSubclassSources();
  for (const subclass of existing) {
    const parsed = subclasses.find(entry => entry.className === subclass.className && entry.engName === subclass.engName);
    expect(parsed?.featuresEng.map(({ level, name }) => ({ level, name })), subclass.engName)
      .toEqual(subclass.featuresEng.map(({ level, name }) => ({ level, name })));
  }
});

it("не губить таблицю експериментальних еліксирів у тілі риси Алхіміка", () => {
  const alchemist = readSubclassSources().find(subclass => subclass.engName === "Alchemist");
  const elixir = alchemist?.featuresEng.find(feature => feature.name === "Experimental Elixir");
  expect(elixir?.descriptionEng).toContain("| 1 |");
  expect(elixir?.descriptionEng).toContain("| 6 |");
  expect(elixir?.descriptionEng).toContain("Healing");
});

it("усі підкласи Винахідника мають переклад кожної риси та власну книгу", () => {
  const normalized: Array<{
    className: string; engName: string; source: string;
    featuresEng: Array<{ level: number; name: string }>;
    features: Array<{ level: number; name: string; description: string }>;
  }> = JSON.parse(readFileSync("data/2024/normalized/subclasses.json", "utf8"));
  for (const source of readSubclassSources().filter(entry => entry.className === "Artificer")) {
    const subclass = normalized.find(entry => entry.className === source.className && entry.engName === source.engName);
    expect(subclass, source.engName).toBeDefined();
    expect(subclass!.source).toBe(source.source === "Eberron - Forge of the Artificer" ? "EFA" : "RHW");
    expect(subclass!.featuresEng).toEqual(source.featuresEng.map(({ level, name }) => ({ level, name })));
    expect(subclass!.features.map(feature => feature.level)).toEqual(source.featuresEng.map(feature => feature.level));
    for (const feature of subclass!.features) {
      expect(feature.name).toMatch(/[А-Яа-яІіЇїЄє]/);
      expect(feature.description).toMatch(/[А-Яа-яІіЇїЄє]/);
      expect(feature.description).not.toMatch(/__SPELL|TODO|TBD/);
    }
  }
});

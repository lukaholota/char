import { expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { parseArticleDocument } from "@/lib/optimization/document";
import reviewed from "../../data/rpgbot/feature-descriptions-2014.json";
import originals from "../../data/2014/source-extracts/rpgbot-legacy-race-variants-2026-10-09.json";

// Each test links a whole RPGbot article (several seconds); under a full parallel run that crosses the default 15 s.
vi.setConfig({ testTimeout: 60_000 });

function findReviewed(original: string) {
  const entry = reviewed.find((entry) => entry.engName === original);
  expect(entry).toBeDefined();
  return entry!;
}

it("preserves the EEPC Constitution casting and free Levitate from level one", () => {
  const original = originals.records.find((entry) => entry.kind === "subrace" && entry.record.name === "Air" && entry.record.source === "EEPC")!.record;
  expect(JSON.stringify(original)).toContain('"ability":"con"');
  expect(JSON.stringify(original)).toContain('"1":["levitate"]');
  const entry = findReviewed("Genasi (Air, EEPC)");
  expect(entry.description).toContain("першого рівня");
  expect(entry.description).toContain("характеристика — Статура");
  expect(entry.description).toContain("без матеріальних компонентів");
  expect(entry.description).not.toContain("Shocking Grasp");
  expect(entry.description).not.toContain("Feather Fall");
});

it("keeps old Fire red darkvision and Water second-level Create or Destroy Water", () => {
  const fire = findReviewed("Genasi (Fire, EEPC)");
  expect(fire.description).toContain("відтінок червоного");
  expect(fire.description).toContain("1-го рівня");
  expect(fire.description).not.toContain("Flame Blade");
  const water = findReviewed("Genasi (Water, EEPC)");
  expect(water.description).toContain("2-го рівня");
  expect(water.description).toContain("3-го рівня");
  expect(water.description).toContain("Shape Water");
  expect(water.description).toContain("швидкість плавання 30 футів");
  expect(water.description).not.toContain("Acid Splash");
  expect(water.description).not.toContain("Water Walk");
});

it("keeps ERLW and MPMM Wildhunt shifting resources separate", () => {
  const old = findReviewed("Wildhunt Shifter (ERLW)");
  const current = findReviewed("Wildhunt Shifter (MPMM)");
  expect(old.description).toContain("рівню + модифікатор Статури");
  expect(old.description).toContain("короткого або тривалого відпочинку");
  expect(current.description).toContain("подвоєному Бонусу Майстерності");
  expect(current.description).toContain("кількість разів, рівну вашому Бонусу Майстерності");
  expect(current.description).not.toContain("короткого або");
  for (const entry of [old, current]) {
    expect(entry.description).toContain("30 футів");
    expect(entry.description).toContain("якщо ви не недієздатні");
  }
});

it("requires choosing skills or swimming for SCAG Aquatic Half-Elf", () => {
  const entry = findReviewed("Half-Elf (Aquatic Elf Descent)");
  expect(entry.description).toContain("Ви обираєте одне");
  expect(entry.description).toContain("Швидкість плавання замінює Skill Versatility");
  expect(entry.description).toContain("не надає обидві переваги одночасно");
});

it("offers both exact Genasi editions in the mixed pre/post-MPMM Artificer guide", async () => {
  const document = parseArticleDocument(JSON.parse(await readFile("data/rpgbot/uk/rpgbot-artificer-races-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  for (const name of ["Air", "Earth", "Fire", "Water"]) {
    const reference = hydrated.contentReferences.find((entry) => entry.engName.toLowerCase() === name.toLowerCase() && entry.options);
    expect(reference?.options?.map((option) => option.engName)).toEqual(expect.arrayContaining([`Genasi (${name})`, `Genasi (${name}, EEPC)`]));
    expect(reference?.options?.length).toBe(2);
  }
});

it("opens full Wildhunt source choices instead of the incomplete general Shifter card", async () => {
  const document = parseArticleDocument(JSON.parse(await readFile("data/rpgbot/uk/rpgbot-monk-astral-self-2014.json", "utf8")));
  const hydrated = await hydrateArticleDocument(document);
  const reference = hydrated.contentReferences.find((entry) => entry.engName.toLowerCase() === "wildhunt shifter" && entry.options);
  expect(reference?.options?.map((option) => option.engName)).toEqual(expect.arrayContaining(["Wildhunt Shifter (ERLW)", "Wildhunt Shifter (MPMM)"]));
});

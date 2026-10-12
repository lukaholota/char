import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { getCreatureByIdOrSlug } from "@/lib/bestiaryData";
import { collectCreatureReferences } from "@/lib/optimization/creature-hydration";

const MIRROR_PATH = "data/5etools/raw/bestiary/bestiary-vgm.json";
const native = getCreatureByIdOrSlug("grung", "RULES_2014")!;
const translated = JSON.parse(readFileSync("data/aidedd/translations/monsters-2014/batch-05.json", "utf8")).find((entry: { slug: string }) => entry.slug === "grung");

it("appends the optional VGM variant without replacing the native MPMM stat block", () => {
  expect(native.source).toBe("MPMM");
  expect(native.specialAbilities).toContain("СК 12");
  expect(native.specialAbilities).toContain("Залежність від води");
  expect(native.actions).toContain("Кинджал");
  expect(native.description).toBe(translated.description.trim().split(/\n\n+/).map((paragraph: string) => `<p>${paragraph.trim()}</p>`).join(""));
  expect(native.description).toContain("VGM, с. 156");
});

it.skipIf(!existsSync(MIRROR_PATH))("matches the VGM Grung Poison variant in the mirror", () => {
  const original = JSON.parse(readFileSync(MIRROR_PATH, "utf8")).monster.find((entry: { name: string }) => entry.name === "Grung");
  expect(original.page).toBe(156);
  expect(original.variant[0].name).toBe("Grung Poison");
  expect(original.trait.find((trait: { name: string }) => trait.name === "Poisonous Skin").entries[0]).toContain("{@dc 12}");
  expect(original.variant[0].entries.filter((entry: unknown) => typeof entry !== "string").map((entry: { name: string }) => entry.name)).toEqual(["Green", "Blue", "Purple", "Red", "Orange", "Gold"]);
});

it("preserves poison expiry and the dependence of every optional effect on being poisoned", () => {
  expect(native.description).toContain("через 1 хвилину після того, як її відокремили");
  expect(native.description).toContain("якщо ґрунґ помирає");
  expect(native.description).toContain("доки істота не позбудеться стану Отруєний, спричиненого ґрунґом");
  expect(native.description.match(/condition-poisoned/g)).toHaveLength(7);
});

it.each([
  ["Зелена", ["лазити або стрибати з місця", "жодних дій або реакцій, доки не приземлиться"]],
  ["Синя", ["гучний звук на початку й наприкінці свого ходу"]],
  ["Фіолетова", ["зануритися в рідину або багно", "не може здійснювати дії або переміщуватися", "щоб дістатися до місця"]],
  ["Червона", ["використати свою дію, щоб їсти", "в межах досяжності"]],
  ["Помаранчева", ["condition-frightened", "стосовно своїх союзників"]],
  ["Золота", ["condition-charmed", "може говорити ґрунґською"]],
] as const)("includes the complete %s poison effect in the hydrated monster rules", (color, requiredClauses) => {
  const reference = collectCreatureReferences("RULES_2014").find((entry) => entry.engName === "Grung")!;
  const paragraph = reference.description.match(new RegExp(`<p><b>${color} шкіра\\.</b>(.*?)</p>`))?.[1];
  expect(paragraph).toBeDefined();
  for (const clause of requiredClauses) {
    const text = clause.startsWith("condition-") ? paragraph : paragraph?.replace(/<[^>]*>/g, "");
    expect(text).toContain(clause);
  }
});

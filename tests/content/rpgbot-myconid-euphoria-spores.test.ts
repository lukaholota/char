import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { getCreatureByIdOrSlug } from "@/lib/bestiaryData";
import { collectCreatureReferences } from "@/lib/optimization/creature-hydration";

const MIRROR_PATH = "data/5etools/raw/bestiary/bestiary-mm.json";
const myconids = [
  ["myconid-adult", "Myconid Adult", "data/aidedd/translations/monsters-2014/batch-08.json", 11],
  ["myconid-sovereign", "Myconid Sovereign", "data/aidedd/translations/monsters-2014/batch-12.json", 12],
] as const;

it.skipIf(!existsSync(MIRROR_PATH)).each(myconids)("matches the OotA Euphoria Spores variant of %s in the mirror", (_slug, name, _sourceFile, dc) => {
  const original = JSON.parse(readFileSync(MIRROR_PATH, "utf8")).monster.find((entry: { name: string }) => entry.name === name);
  const variant = original.variant.find((entry: { source: string }) => entry.source === "OotA");
  const euphoria = variant.entries.find((entry: { name?: string }) => entry.name === "Euphoria Spores (1/Day)");
  expect(variant.page).toBe(228);
  expect(euphoria.entries[0]).toContain(`{@dc ${dc}}`);
});

it.each(myconids)("preserves the exact optional OotA Euphoria Spores of %s alongside the base actions", (slug, name, sourceFile, dc) => {
  const native = getCreatureByIdOrSlug(slug, "RULES_2014")!;
  const translated = JSON.parse(readFileSync(sourceFile, "utf8")).find((entry: { slug: string }) => entry.slug === slug);
  expect(native.source).toBe("MM");
  expect(native.description).toBe(translated.description.trim().split(/\n\n+/).map((paragraph: string) => `<p>${paragraph.trim()}</p>`).join(""));
  expect(native.description).toContain("OotA, с. 228");
  expect(native.description).toContain("Euphoria Spores{{Euphoria Spores}} (1 раз на день)");
  expect(native.description).toContain("сфері радіусом 20 футів із центром на собі");
  expect(native.description).toContain("Кожна інша істота");
  expect(native.description).toContain(`ряткидок Статури СК ${dc}`);
  expect(native.description).toContain("Отруєний</a> на 1 хвилину");
  expect(native.description).toContain("8 + модифікатор Статури міконіда + його Бонус Майстерності");
  expect(native.description).toContain("наприкінці кожного свого ходу");
  expect(native.description).toContain("Коли ефект на істоті припиняється, вона отримує 1 рівень");
  expect(native.description).toContain("condition-exhaustion");
  expect(native.description).not.toContain("condition-incapacitated");
  expect(native.actions).toContain("{{Rapport Spores}}");
  if (slug === "myconid-sovereign") expect(native.actions).toContain("{{Hallucination Spores}}");
  expect(collectCreatureReferences("RULES_2014").find((entry) => entry.engName === name)!.description).toContain(native.description);
});

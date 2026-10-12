import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { buildCharacterCreationOptions } from "@/lib/content/creator-content";
import { findCreatorContent } from "@/server/db/creator-content-query";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { auth } from "@/lib/auth";

const presetSlugs = [
  "monk-shadow-2014", "monk-open-hand-2014", "fighter-champion-shield-2014",
  "fighter-champion-greataxe-2014", "barbarian-berserker-2014", "rogue-thief-2014",
];
const expectedScores: Record<string, number[]> = {
  "monk-shadow-2014": [8, 16, 15, 8, 16, 8],
  "monk-open-hand-2014": [8, 16, 16, 8, 16, 8],
  "fighter-champion-shield-2014": [17, 10, 16, 10, 9, 12],
  "fighter-champion-greataxe-2014": [17, 10, 16, 10, 9, 12],
  "barbarian-berserker-2014": [16, 14, 16, 8, 10, 10],
  "rogue-thief-2014": [8, 16, 14, 12, 12, 14],
};
const expectedWeapons: Record<string, string[]> = {
  "monk-shadow-2014": ["QUARTERSTAFF", "DART", "UNARMED_STRIKE"],
  "monk-open-hand-2014": ["QUARTERSTAFF", "DART", "UNARMED_STRIKE"],
  "fighter-champion-shield-2014": ["LONGSWORD", "HANDAXE"],
  "fighter-champion-greataxe-2014": ["GREATAXE", "WARHAMMER", "HANDAXE"],
  "barbarian-berserker-2014": ["GREATAXE", "HANDAXE", "JAVELIN"],
  "rogue-thief-2014": ["SHORTSWORD", "SHORTBOW", "DAGGER"],
};

beforeEach(async () => {
  await resetUserData();
  const owner = await prisma.user.create({ data: { email: "rpgbot-presets@actions.test" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
});
afterAll(disconnectDatabase);

async function buildPresetInput(slug: string) {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
  return { ...buildReadyPresetDraft(recipe, preset, content), name: `Перевірка ${slug}` };
}

describe("2014 RPGbot presets in the database", () => {
  it.each(presetSlugs)("persists complete level-one %s", async (slug) => {
    const input = await buildPresetInput(slug);
    const created = await createCharacter(input);
    if ("error" in created) throw new Error(created.error);
    const character = await prisma.pers.findUniqueOrThrow({
      where: { persId: created.persId },
      include: { skills: true, weapons: { include: { weapon: true } }, feats: true, features: true, choiceOptions: true },
    });
    expect(character).toMatchObject({ name: input.name, level: 1, ruleset: "RULES_2014", classId: input.classId, raceId: input.raceId, backgroundId: input.backgroundId });
    expect(character.currentHp).toBe(character.maxHp);
    expect(character.maxHp).toBeGreaterThan(0);
    expect([character.str, character.dex, character.con, character.int, character.wis, character.cha]).toEqual(expectedScores[slug]);
    expect(character.skills.filter((skill) => ["PROFICIENT", "EXPERTISE"].includes(skill.proficiencyType)).map((skill) => skill.name).sort()).toEqual([...input.skills!].sort());
    expect(character.skills.filter((skill) => skill.proficiencyType === "EXPERTISE").map((skill) => skill.name).sort()).toEqual([...(input.expertiseSchema?.expertises ?? [])].sort());
    expect(character.features.length).toBeGreaterThan(0);
    expect(character.weapons.length).toBeGreaterThan(0);
    expect([...new Set(character.weapons.map((entry) => entry.weapon.name))].sort()).toEqual([...expectedWeapons[slug]].sort());
    expect(character.choiceOptions.map((option) => option.choiceOptionId)).toEqual(expect.arrayContaining(Object.values(input.classChoiceSelections ?? {})));
    expect(character.feats.map((feat) => feat.featId)).toEqual(input.featId ? [input.featId] : []);
    expect(await prisma.pers.count()).toBe(1);
  });

  it("keeps the database empty after invalid input and allows a corrected retry", async () => {
    const input = await buildPresetInput("monk-shadow-2014");
    const failed = await createCharacter({ ...input, raceId: -1 });
    expect(failed).toHaveProperty("error");
    expect(await prisma.pers.count()).toBe(0);
    const retried = await createCharacter(input);
    expect(retried).toHaveProperty("persId");
    expect(await prisma.pers.count()).toBe(1);
  });
});

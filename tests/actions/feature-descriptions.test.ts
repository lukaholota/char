/**
 * KR31.13 — власний опис фічі на листі (рішення власника 2026-09-14): гравець накладає свій текст
 * на отриману фічу чи рису, механіки це не змінює, порожній текст повертає оригінал.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { saveFeatureDescription } from "@/lib/actions/feature-descriptions";
import { getCharacterFeaturesGrouped, type CharacterFeatureItem } from "@/lib/actions/pers";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR31.13 — власний опис фічі", () => {
  it("фіча показує власний опис, порожній текст повертає оригінал", async () => {
    const { persId, featureId, originalDescription } = await createFighterWithSecondWind();

    expect(await saveFeatureDescription({ persId, target: { kind: "FEATURE", refId: featureId }, description: "  Мій другий подих  " }))
      .toEqual({ success: true, description: "Мій другий подих" });
    expect(await findFeature(persId, featureId)).toMatchObject({ description: "Мій другий подих", shortDescription: null, hasCustomDescription: true });

    expect(await saveFeatureDescription({ persId, target: { kind: "FEATURE", refId: featureId }, description: " " }))
      .toEqual({ success: true, description: null });
    expect(await findFeature(persId, featureId)).toMatchObject({ description: originalDescription, hasCustomDescription: false });
  });

  it("риса отримує власний опис за своїм featId, не зачіпаючи фічу з тим самим числом", async () => {
    const { persId } = await createFighterWithSecondWind();
    const tough = await prisma.feat.findFirstOrThrow({ where: { name: "TOUGH", ruleset: "RULES_2014" }, select: { featId: true } });
    await prisma.persFeat.create({ data: { persId, featId: tough.featId } });

    await saveFeatureDescription({ persId, target: { kind: "FEAT", refId: tough.featId }, description: "Мій міцний" });
    const grouped = await getCharacterFeaturesGrouped(persId);
    const featCard = grouped?.passive.find((item) => item.key === `FEAT:${tough.featId}`);
    expect(featCard).toMatchObject({ description: "Мій міцний", hasCustomDescription: true });
  });

  it("чужий персонаж і невідомий тип — відмова без запису", async () => {
    const { persId, featureId } = await createFighterWithSecondWind();
    await signIn("stranger");

    expect(await saveFeatureDescription({ persId, target: { kind: "FEATURE", refId: featureId }, description: "Злам" }))
      .toMatchObject({ success: false });
    expect(await saveFeatureDescription({ persId, target: { kind: "SPELL" as never, refId: featureId }, description: "Злам" }))
      .toMatchObject({ success: false });
    expect(await prisma.persFeatureDescription.count({ where: { persId } })).toBe(0);
  });
});

async function signIn(label: string) {
  const user = await prisma.user.create({ data: { email: `feature-description-${label}-${Math.random()}@holota.family`, name: label } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  return user;
}

async function createFighterWithSecondWind() {
  const user = await signIn("owner");
  const cls = await prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2014" } });
  const [race, background, feature] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: "HUMAN_2014" } }),
    prisma.background.findFirstOrThrow({ where: { name: "SOLDIER", ruleset: "RULES_2014" } }),
    prisma.feature.findFirstOrThrow({ where: { engName: "Second Wind" }, select: { featureId: true, description: true } }),
  ]);
  const pers = await prisma.pers.create({
    data: {
      userId: user.id, name: "Воїн", ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId,
      level: 1, currentHp: 12, maxHp: 12, str: 15, dex: 13, con: 14, int: 10, wis: 10, cha: 8,
      features: { create: { featureId: feature.featureId } },
    },
  });
  return { persId: pers.persId, featureId: feature.featureId, originalDescription: feature.description };
}

async function findFeature(persId: number, featureId: number): Promise<CharacterFeatureItem | undefined> {
  const grouped = await getCharacterFeaturesGrouped(persId);
  return Object.values(grouped ?? {}).flat().find((item) => item.featureId === featureId);
}

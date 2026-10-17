import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Variants } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName, raceVariantByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { spendFeatureUse } from "@/server/db/feature-uses";
import { getCharacterFeaturesGrouped } from "@/server/db/pers-actions";
import { longRest, shortRest } from "@/server/db/rest-actions";

const FLOATING_DISK = "Infernal Legacy (Mammon): Tenser's Floating Disk";
const ARCANE_LOCK = "Infernal Legacy (Mammon): Arcane Lock";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createVariantCharacter(raceName: Races, variantName: Variants) {
  const email = `variant-counters-${variantName.toLowerCase()}@test.local`;
  const user = await prisma.user.create({ data: { email, name: email } });
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);

  const [race, variant, characterClass, background] = await Promise.all([
    raceByName(raceName),
    raceVariantByName(variantName),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(
    minimalForm({
      raceId: race.raceId,
      raceVariantId: variant.raceVariantId,
      classId: characterClass.classId,
      backgroundId: background.backgroundId,
    }),
  );
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

async function findOwnedFeatureEngNames(persId: number) {
  const rows = await prisma.persFeature.findMany({ where: { persId }, select: { feature: { select: { engName: true } } } });
  return rows.map((row) => row.feature.engName);
}

async function findSheetCounter(persId: number, engName: string) {
  const grouped = await getCharacterFeaturesGrouped(persId);
  const item = [
    ...(grouped?.actions ?? []),
    ...(grouped?.bonusActions ?? []),
    ...(grouped?.reactions ?? []),
    ...(grouped?.passive ?? []),
  ].find((entry) => entry.engName === engName);
  return item ? { usesPer: item.usesPer ?? null, restType: item.restType ?? null } : undefined;
}

async function findFeatureId(engName: string) {
  const feature = await prisma.feature.findUniqueOrThrow({ where: { engName }, select: { featureId: true } });
  return feature.featureId;
}

async function findUsesRemaining(persId: number, featureId: number) {
  const row = await prisma.persFeature.findUniqueOrThrow({ where: { persId_featureId: { persId, featureId } } });
  return row.usesRemaining;
}

describe("BUG-035 — лічильники Пекельної спадщини (Маммон) на листі", () => {
  it("створення кладе на персонажа риси варіанта, а лічильники зʼявляються з рівнем персонажа", async () => {
    const persId = await createVariantCharacter(Races.TIEFLING_2014, Variants.TIEFLING_MAMMON);

    expect(await findOwnedFeatureEngNames(persId)).toEqual(
      expect.arrayContaining(["Infernal Legacy (Mammon)", FLOATING_DISK, ARCANE_LOCK]),
    );
    expect(await findSheetCounter(persId, FLOATING_DISK)).toEqual({ usesPer: null, restType: "SHORT_REST" });
    expect(await findSheetCounter(persId, ARCANE_LOCK)).toEqual({ usesPer: null, restType: "LONG_REST" });

    await prisma.pers.update({ where: { persId }, data: { level: 3 } });
    expect(await findSheetCounter(persId, FLOATING_DISK)).toEqual({ usesPer: 1, restType: "SHORT_REST" });
    expect(await findSheetCounter(persId, ARCANE_LOCK)).toEqual({ usesPer: null, restType: "LONG_REST" });

    await prisma.pers.update({ where: { persId }, data: { level: 5 } });
    expect(await findSheetCounter(persId, ARCANE_LOCK)).toEqual({ usesPer: 1, restType: "LONG_REST" });
    expect(await findSheetCounter(persId, "Infernal Legacy (Mammon)")).toEqual({ usesPer: null, restType: null });
  });

  it("короткий відпочинок повертає лише Літаючий диск, тривалий — обидва", async () => {
    const persId = await createVariantCharacter(Races.TIEFLING_2014, Variants.TIEFLING_MAMMON);
    await prisma.pers.update({ where: { persId }, data: { level: 5 } });
    const [diskId, lockId] = await Promise.all([findFeatureId(FLOATING_DISK), findFeatureId(ARCANE_LOCK)]);

    expect(await spendFeatureUse({ persId, featureId: diskId })).toMatchObject({ success: true, usesRemaining: 0 });
    expect(await spendFeatureUse({ persId, featureId: lockId })).toMatchObject({ success: true, usesRemaining: 0 });

    expect((await shortRest(persId, [])).success).toBe(true);
    expect(await findUsesRemaining(persId, diskId)).toBe(1);
    expect(await findUsesRemaining(persId, lockId)).toBe(0);

    expect(await spendFeatureUse({ persId, featureId: diskId })).toMatchObject({ success: true, usesRemaining: 0 });
    expect((await longRest(persId)).success).toBe(true);
    expect(await findUsesRemaining(persId, diskId)).toBe(1);
    expect(await findUsesRemaining(persId, lockId)).toBe(1);
  });
});

describe("BUG-037 — Людина (Мітка Переходу)", () => {
  it("Магічний перехід доїжджає на лист лічильником тривалого відпочинку", async () => {
    const persId = await createVariantCharacter(Races.HUMAN_2014, Variants.HUMAN_MARK_OF_PASSAGE_EBERRON);

    expect(await findSheetCounter(persId, "Magical Passage")).toEqual({ usesPer: 1, restType: "LONG_REST" });
  });
});

import { afterAll, beforeAll } from "vitest";
import type { ClassStartingEquipmentOption } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STALE_FIXED_DAGGER_SEED_INDEX = 85;

export function correctStaleWizardEquipmentSeed(): void {
  let staleFixedDagger: ClassStartingEquipmentOption | null = null;
  beforeAll(async () => {
    staleFixedDagger = await prisma.classStartingEquipmentOption.findUnique({ where: { seedIndex: STALE_FIXED_DAGGER_SEED_INDEX } });
    if (staleFixedDagger) await prisma.classStartingEquipmentOption.delete({ where: { seedIndex: STALE_FIXED_DAGGER_SEED_INDEX } });
  });
  afterAll(async () => {
    if (staleFixedDagger) await prisma.classStartingEquipmentOption.create({ data: staleFixedDagger });
  });
}

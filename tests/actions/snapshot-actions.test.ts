import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createCharacterSnapshot,
  getSnapshots,
} from "@/lib/actions/snapshot-actions";
import { createCharacter } from "@/lib/actions/character";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("snapshot actions", () => {
  it("clones and lists a character snapshot", async () => {
    const user = await prisma.user.create({
      data: { email: "snapshot-actions@golden.test", name: "Snapshot Actions Test User" },
    });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

    const [race, characterClass, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.FIGHTER_2014),
      backgroundByName(BackgroundCategory.SOLDIER),
    ]);
    const created = await createCharacter(
      minimalForm({
        name: "Snapshot source",
        raceId: race.raceId,
        classId: characterClass.classId,
        backgroundId: background.backgroundId,
      }),
    );
    if ("error" in created) throw new Error(created.error);

    const snapshotResult = await createCharacterSnapshot(created.persId);
    if (!("success" in snapshotResult) || typeof snapshotResult.snapshotId !== "number") {
      throw new Error("error" in snapshotResult ? snapshotResult.error : "Snapshot ID missing");
    }

    await expect(prisma.pers.findUnique({
      where: { persId: snapshotResult.snapshotId },
      select: { parentPersId: true, isSnapshot: true, isActive: true, level: true, name: true },
    })).resolves.toEqual({
      parentPersId: created.persId,
      isSnapshot: true,
      isActive: false,
      level: 1,
      name: "Snapshot source (Рівень 1)",
    });

    await expect(getSnapshots(created.persId)).resolves.toEqual([
      expect.objectContaining({ persId: snapshotResult.snapshotId, snapshotLevel: 1, isActive: false }),
    ]);
  });
});

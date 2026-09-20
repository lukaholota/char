"use server";

import { auth } from "@/lib/auth";
import { createPersSnapshot, listPersSnapshots } from "@/server/db/snapshots";

export async function createCharacterSnapshot(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  try {
    const snapshotId = await createPersSnapshot(persId);
    if (snapshotId === null) return { error: "Character not found" };

    return { success: true, snapshotId };
  } catch (error) {
    console.error("Snapshot creation failed:", error);
    return { error: "Failed to create character snapshot" };
  }
}

export async function getSnapshots(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return [];

  return listPersSnapshots(persId);
}

import { prisma } from "@/lib/prisma";
import { buildCopyTarget, clonePersWithRelations, PERS_DUPLICATION_INCLUDE } from "@/lib/logic/pers-duplication";

export type SnapshotListEntry = {
  persId: number;
  name: string;
  level: number;
  snapshotLevel: number | null;
  createdAt: Date;
  isActive: boolean;
};

export async function createPersSnapshot(persId: number): Promise<number | null> {
  const pers = await prisma.pers.findUnique({ where: { persId }, include: PERS_DUPLICATION_INCLUDE });
  if (!pers) return null;

  const snapshotTarget = buildCopyTarget(pers, {
    name: `${pers.name} (Рівень ${pers.level})`,
    folderId: null,
    isPinned: false,
    snapshotOf: { parentPersId: pers.persId, level: pers.level },
  });
  const snapshot = await prisma.$transaction((tx) => clonePersWithRelations(tx, pers, snapshotTarget));

  return snapshot.persId;
}

export async function listPersSnapshots(persId: number): Promise<SnapshotListEntry[]> {
  return prisma.pers.findMany({
    where: { parentPersId: persId, isSnapshot: true },
    orderBy: { snapshotLevel: "desc" },
    select: { persId: true, name: true, level: true, snapshotLevel: true, createdAt: true, isActive: true },
  });
}

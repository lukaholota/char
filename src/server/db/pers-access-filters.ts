import type { Prisma } from "@prisma/client";

/// Хто бачить персонажа: власник або співвласник, і сам персонаж не є мертвим знімком.
/// 72% рядків `pers` — снапшоти (db/changes/2026-08-21-r14-pers-search-indexes.sql),
/// тому цей фільтр — не косметика, а межа ізоляції даних.
export function buildVisiblePersFilter(userId: number): Prisma.PersWhereInput {
  return {
    AND: [
      {
        OR: [{ userId }, { additionalUsers: { some: { userId } } }],
      },
      {
        OR: [{ isSnapshot: false }, { isSnapshot: true, isActive: true }],
      },
    ],
  };
}

export function buildVisibleFolderFilter(userId: number): Prisma.PersFolderWhereInput {
  return {
    OR: [{ userId }, { members: { some: { userId } } }],
  };
}

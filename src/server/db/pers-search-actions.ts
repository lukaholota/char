'use server';

import { prisma } from "@/lib/prisma";
import { findCurrentUserId } from "@/server/db/current-user";
import { buildVisiblePersFilter, buildVisibleFolderFilter } from "@/server/db/pers-access-filters";
import { buildQueryVariants } from "@/lib/search/searchQuery";

/// Друга, асинхронна фаза глобального пошуку (docs/DECISIONS.md Р14): те, чого в статичному
/// індексі бути не може, бо належить конкретній людині.
export type UserSearchHit = {
  kind: "pers" | "folder";
  id: number;
  title: string;
  subtitle: string;
  href: string;
};

const MIN_QUERY_LENGTH = 2;
const MAX_PERS_HITS = 8;
const MAX_FOLDER_HITS = 5;

export async function searchUserPersAndFolders(query: string): Promise<UserSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const userId = await findCurrentUserId();
  if (!userId) return [];

  const variants = buildQueryVariants(trimmed);
  const [perses, folders] = await Promise.all([
    findMatchingPerses(userId, variants),
    findMatchingFolders(userId, variants),
  ]);

  return [...perses, ...folders];
}

async function findMatchingPerses(userId: number, variants: string[]): Promise<UserSearchHit[]> {
  const perses = await prisma.pers.findMany({
    where: { AND: [buildVisiblePersFilter(userId), buildNameMatchFilter(variants)] },
    select: { persId: true, name: true, level: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_PERS_HITS,
  });

  return perses.map((pers) => ({
    kind: "pers" as const,
    id: pers.persId,
    title: pers.name,
    subtitle: `Рівень ${pers.level}`,
    href: `/char/${pers.persId}`,
  }));
}

async function findMatchingFolders(userId: number, variants: string[]): Promise<UserSearchHit[]> {
  const folders = await prisma.persFolder.findMany({
    where: { AND: [buildVisibleFolderFilter(userId), buildNameMatchFilter(variants)] },
    select: { folderId: true, name: true },
    orderBy: [{ isPinned: "desc" }, { name: "asc" }],
    take: MAX_FOLDER_HITS,
  });

  return folders.map((folder) => ({
    kind: "folder" as const,
    id: folder.folderId,
    title: folder.name,
    subtitle: "Папка персонажів",
    href: `/char/home?folder=${folder.folderId}`,
  }));
}

/// Кожен варіант — це той самий запит із заміною г↔х, бо люди пишуть «беголдер» замість
/// «бехолдер» (KR13.4). Підрядок тут дешевий: після фільтра власника лишається ≤179 рядків.
function buildNameMatchFilter(variants: string[]) {
  return {
    OR: variants.map((variant) => ({
      name: { contains: variant, mode: "insensitive" as const },
    })),
  };
}

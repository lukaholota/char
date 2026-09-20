'use server';

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { buildCopyTarget, clonePersWithRelations, PERS_DUPLICATION_INCLUDE } from "@/lib/logic/pers-duplication";
import { revalidatePath } from "next/cache";
import { PERS_SHEET_INCLUDE } from "@/server/db/pers-sheet-include";
import { findCurrentUserId } from "@/server/db/current-user";

const TOKEN_ATTEMPTS = 3;

async function saveUniqueToken(save: (token: string) => Promise<void>): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    const token = randomBytes(16).toString("hex");
    try {
      await save(token);
      return token;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2002" && attempt < TOKEN_ATTEMPTS) continue;
      throw error;
    }
  }
}

async function ensureViewToken(persId: number): Promise<string> {
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { shareToken: true } });
  if (pers.shareToken) return pers.shareToken;

  await saveUniqueToken(async (token) => {
    await prisma.pers.updateMany({ where: { persId, shareToken: null }, data: { shareToken: token } });
  });

  const saved = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { shareToken: true } });
  if (!saved.shareToken) throw new Error(`share token was not saved for pers ${persId}`);
  return saved.shareToken;
}

async function ensureEditToken(persId: number): Promise<string> {
  const existing = await prisma.persShareToken.findFirst({
    where: { persId, canEdit: true },
    orderBy: { persShareTokenId: "asc" },
    select: { token: true }
  });
  if (existing) return existing.token;

  return saveUniqueToken(async (token) => {
    await prisma.persShareToken.create({ data: { persId, token, canEdit: true } });
  });
}

async function ensureFolderShareTokens(folderIds: number[]) {
  if (folderIds.length === 0) return;

  const missing = await prisma.pers.findMany({
    where: { folderId: { in: folderIds }, shareToken: null },
    select: { persId: true }
  });

  for (const pers of missing) {
    await ensureViewToken(pers.persId);
  }
}

async function ensureFolderEditTokens(persIds: number[]) {
  const existing = await prisma.persShareToken.findMany({
    where: { persId: { in: persIds }, canEdit: true },
    select: { persId: true, token: true }
  });

  const tokenMap = new Map(existing.map((row) => [row.persId, row.token]));
  for (const persId of persIds.filter((id) => !tokenMap.has(id))) {
    tokenMap.set(persId, await ensureEditToken(persId));
  }
  return tokenMap;
}

async function getFolderTreeIds(rootFolderId: number) {
  const collected = new Set<number>([rootFolderId]);
  let frontier = [rootFolderId];

  while (frontier.length > 0) {
    const children = await prisma.persFolder.findMany({
      where: { parentFolderId: { in: frontier } },
      select: { folderId: true }
    });

    const next: number[] = [];
    for (const child of children) {
      if (collected.has(child.folderId)) continue;
      collected.add(child.folderId);
      next.push(child.folderId);
    }

    frontier = next;
  }

  return Array.from(collected);
}

/// Посилання, яке гравець уже комусь надіслав, мусить жити далі — тому наявні токени лише
/// читаються, а створюються тільки відсутні.
export async function ensurePersShareLinks(persId: number) {
  const refusal = await findShareRefusal(persId);
  if (refusal) return { success: false as const, error: refusal };

  try {
    const [viewToken, editToken] = await Promise.all([ensureViewToken(persId), ensureEditToken(persId)]);
    return { success: true as const, viewToken, editToken };
  } catch (error) {
    console.error("Share links failed:", error);
    return { success: false as const, error: "Не вдалося створити посилання" };
  }
}

async function findShareRefusal(persId: number): Promise<string | null> {
  const userId = await findCurrentUserId();
  if (userId === null) return "Увійдіть, щоб поділитися персонажем";

  const pers = await prisma.pers.findUnique({ where: { persId }, select: { userId: true } });
  if (!pers) return "Персонажа не знайдено";
  if (pers.userId !== userId) return "Поділитися може лише власник персонажа";

  return null;
}

export async function getPersByShareToken(token: string) {
  const editToken = await prisma.persShareToken.findUnique({
    where: { token },
    select: { persId: true, canEdit: true }
  });

  const pers = await prisma.pers.findUnique({
    where: editToken ? { persId: editToken.persId } : { shareToken: token },
    include: PERS_SHEET_INCLUDE,
  });

  return { pers, canEdit: Boolean(editToken?.canEdit) };
}

export async function acceptPersEditShareToken(token: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Увійдіть, щоб редагувати персонажа", needsSignIn: true as const };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { error: "Користувача не знайдено" };

  const share = await prisma.persShareToken.findUnique({
    where: { token },
    select: { persId: true, canEdit: true }
  });

  if (!share || !share.canEdit) return { error: "Посилання недійсне" };

  const pers = await prisma.pers.findUnique({
    where: { persId: share.persId },
    select: { persId: true, userId: true }
  });

  if (!pers) return { error: "Персонажа не знайдено" };

  if (pers.userId !== user.id) {
    await prisma.persAdditionalUser.upsert({
      where: { persId_userId: { persId: pers.persId, userId: user.id } },
      update: {},
      create: { persId: pers.persId, userId: user.id }
    });
  }

  return { success: true, persId: pers.persId };
}

export async function generateFolderShareToken(folderId: number, canEdit: boolean) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  const folder = await prisma.persFolder.findUnique({
    where: { folderId },
    select: { userId: true }
  });

  if (!folder) return { error: "Folder not found" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (folder.userId !== user?.id) return { error: "Forbidden" };

  const existing = await prisma.persFolderShareToken.findFirst({
    where: { folderId, canEdit },
    select: { token: true }
  });

  if (existing?.token) return { success: true, token: existing.token };

  const token = randomBytes(16).toString("hex");
  await prisma.persFolderShareToken.create({
    data: { folderId, token, canEdit }
  });

  return { success: true, token };
}

export async function getFolderByShareToken(token: string) {
  const share = await prisma.persFolderShareToken.findUnique({
    where: { token },
    select: { folderId: true, canEdit: true }
  });

  if (!share) return null;

  const folderIds = await getFolderTreeIds(share.folderId);
  await ensureFolderShareTokens(folderIds);

  const folder = await prisma.persFolder.findUnique({
    where: { folderId: share.folderId },
    select: {
      folderId: true,
      name: true,
      color: true,
      isPinned: true,
      ruleset: true,
    }
  });

  if (!folder) return null;

  const folders = await prisma.persFolder.findMany({
    where: { folderId: { in: folderIds }, NOT: { folderId: share.folderId } },
    select: {
      folderId: true,
      name: true,
      color: true,
      parentFolderId: true,
      isPinned: true,
    },
    orderBy: { name: "asc" },
  });

  const perses = await prisma.pers.findMany({
    where: { folderId: { in: folderIds } },
    select: {
      persId: true,
      name: true,
      level: true,
      currentHp: true,
      maxHp: true,
      isPinned: true,
      folderId: true,
      shareToken: true,
      ruleset: true,
      race: { select: { name: true } },
      class: { select: { name: true } },
      subclass: { select: { name: true } },
      background: { select: { name: true } },
      multiclasses: { select: { class: { select: { name: true } }, subclass: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" }
  });

  if (!share.canEdit) {
    return { folder: { ...folder, perses, folders }, canEdit: false };
  }

  const editTokens = await ensureFolderEditTokens(perses.map((p) => p.persId));
  const folderWithEdit = {
    ...folder,
    perses: perses.map((p) => ({
      ...p,
      editToken: editTokens.get(p.persId) ?? null,
    })),
    folders,
  };

  return { folder: folderWithEdit, canEdit: true };
}

export async function acceptFolderEditShareToken(token: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Авторизуйтесь, щоб отримати доступ" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { error: "Користувача не знайдено" };

  const share = await prisma.persFolderShareToken.findUnique({
    where: { token },
    select: { folderId: true, canEdit: true }
  });

  if (!share || !share.canEdit) return { error: "Посилання недійсне" };

  const folder = await prisma.persFolder.findUnique({
    where: { folderId: share.folderId },
    select: { folderId: true, userId: true }
  });

  if (!folder) return { error: "Папку не знайдено" };

  if (folder.userId !== user.id) {
    const folderIds = await getFolderTreeIds(folder.folderId);

    await prisma.persFolderMember.updateMany({
      where: { folderId: { in: folderIds }, userId: user.id },
      data: { canEdit: true }
    });

    await prisma.persFolderMember.createMany({
      data: folderIds.map((folderId) => ({ folderId, userId: user.id, canEdit: true })),
      skipDuplicates: true
    });

    const perses = await prisma.pers.findMany({
      where: { folderId: { in: folderIds } },
      select: { persId: true }
    });

    if (perses.length > 0) {
      await prisma.persAdditionalUser.createMany({
        data: perses.map((p) => ({ persId: p.persId, userId: user.id })),
        skipDuplicates: true
      });
    }
  }

  revalidatePath("/char/home");
  return { success: true, folderId: folder.folderId };
}

export async function copyFolderByShareToken(token: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Авторизуйтесь, щоб скопіювати папку" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { error: "Користувача не знайдено" };

  const share = await prisma.persFolderShareToken.findUnique({
    where: { token },
    select: { folderId: true, canEdit: true }
  });

  if (!share) return { error: "Посилання недійсне" };
  if (share.canEdit) return { error: "Це посилання для редагування. Додайте папку в профіль." };

  const source = await prisma.persFolder.findUnique({
    where: { folderId: share.folderId },
    select: { folderId: true, name: true, color: true, isPinned: true }
  });

  if (!source) return { error: "Папку не знайдено" };

  const created = await prisma.$transaction(async (tx) => {
    const cloneFolder = async (folderId: number, parentId: number | null, addCopySuffix: boolean) => {
      const folder = await tx.persFolder.findUnique({
        where: { folderId },
        select: { folderId: true, name: true, color: true, isPinned: true, ruleset: true }
      });

      if (!folder) return null;

      const createdFolder = await tx.persFolder.create({
        data: {
          userId: user.id,
          name: addCopySuffix ? `${folder.name} (Копія)` : folder.name,
          color: folder.color,
          isPinned: folder.isPinned,
          parentFolderId: parentId,
          ruleset: folder.ruleset,
        },
        select: {
          folderId: true,
          name: true,
          color: true,
          isPinned: true,
          parentFolderId: true,
        },
      });

      const perses = await tx.pers.findMany({
        where: { folderId: folder.folderId },
        include: PERS_DUPLICATION_INCLUDE,
      });

      for (const pers of perses) {
        await clonePersWithRelations(tx, pers, buildCopyTarget(pers, { userId: user.id, folderId: createdFolder.folderId }));
      }

      const children = await tx.persFolder.findMany({
        where: { parentFolderId: folder.folderId },
        select: { folderId: true }
      });

      for (const child of children) {
        await cloneFolder(child.folderId, createdFolder.folderId, false);
      }

      return createdFolder;
    };

    return cloneFolder(source.folderId, null, true);
  });

  if (!created) return { error: "Не вдалося скопіювати папку" };

  revalidatePath("/char/home");

  return { success: true, folder: created };
}

export async function copyPersByToken(token: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Авторизуйтесь, щоб скопіювати персонажа" };

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Користувача не знайдено" };

    const editToken = await prisma.persShareToken.findUnique({
      where: { token },
      select: { persId: true }
    });

    const sourcePers = await prisma.pers.findUnique({
      where: editToken ? { persId: editToken.persId } : { shareToken: token },
      include: PERS_DUPLICATION_INCLUDE,
    });

    if (!sourcePers) return { error: "Персонажа не знайдено за цим токеном" };

    const copyTarget = buildCopyTarget(sourcePers, { userId: user.id, folderId: null, isPinned: false });
    const newPersId = await prisma.$transaction(async (tx) => (await clonePersWithRelations(tx, sourcePers, copyTarget)).persId);

    return { success: true, persId: newPersId };
  } catch (error) {
    console.error("Copy char failed:", error);
    return { error: "Помилка при копіюванні персонажа" };
  }
}

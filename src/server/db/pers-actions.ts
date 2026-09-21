'use server';

import { findCustomDescription, type FeatureDescriptionTarget } from "@/lib/logic/feature-descriptions";
import { buildFeatFeatureDescription } from "@/lib/logic/feat-feature-description";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FeatureDisplayType, RestType, MagicItem, Prisma, Ruleset } from "@prisma/client";
import { FeatureSource } from "@/lib/utils/features";
import { buildCopyTarget, clonePersWithRelations, PERS_DUPLICATION_INCLUDE } from "@/lib/logic/pers-duplication";
import { PERS_PRINT_INCLUDE, PERS_SHEET_INCLUDE } from "@/server/db/pers-sheet-include";
import { collectPersClassNames, collectPersSubclassNames } from "@/lib/logic/pers-class-names";
import { buildVisiblePersFilter, buildVisibleFolderFilter } from "@/server/db/pers-access-filters";
import { findCurrentUserId } from "@/server/db/current-user";
import { deleteUnusedPortraits } from "@/server/db/pers-portrait-cleanup";
import { findPoolProvider, regainsOneUseOnShortRest } from "@/rules/resource-pools";
import { buildSpellLinkForSpell } from "@/lib/spell-link";
import { buildHomebrewSpellKey } from "@/lib/logic/homebrew-view";
import { findRechoosableSubclassOptionGroup } from "@/rules/subclass-option-rechoice";

async function getCurrentUserId() {
    return findCurrentUserId();
}

export async function canEditPers(persId: number, userId: number) {
    const pers = await prisma.pers.findUnique({
        where: { persId },
        select: {
            userId: true,
            folderId: true,
            additionalUsers: { select: { userId: true } },
        },
    });

    if (!pers) return false;
    if (pers.userId === userId) return true;
    if (pers.additionalUsers.some((u) => u.userId === userId)) return true;

    if (pers.folderId) {
        const membership = await prisma.persFolderMember.findUnique({
            where: { folderId_userId: { folderId: pers.folderId, userId } },
            select: { canEdit: true },
        });
        if (membership?.canEdit) return true;
    }

    return false;
}

export async function canDeletePers(persId: number, userId: number) {
    const pers = await prisma.pers.findUnique({
        where: { persId },
        select: { userId: true },
    });

    return pers?.userId === userId;
}

const FOLDER_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const FOLDER_RULESET_MISMATCH_ERROR = "Папка належить іншій редакції";

function normalizeFolderName(name: string) {
    return String(name || "")
        .normalize("NFKC")
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .trim()
        .slice(0, 80);
}

function normalizePersName(name: string) {
    return String(name || "")
        .normalize("NFKC")
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .trim()
        .slice(0, 60);
}

function normalizeFolderColor(color: string) {
    const value = color.trim();
    if (!FOLDER_COLOR_REGEX.test(value)) return "#38bdf8";
    return value.toLowerCase();
}

async function assertFolderOwnership(folderId: number, userId: number) {
    const folder = await prisma.persFolder.findUnique({
        where: { folderId },
        select: { folderId: true, userId: true, parentFolderId: true, name: true, color: true, isPinned: true, ruleset: true },
    });

    if (!folder || folder.userId !== userId) {
        return null;
    }

    return folder;
}

async function isFolderDescendant(userId: number, folderId: number, potentialParentId: number | null) {
    if (!potentialParentId) return false;

    let cursor: number | null = potentialParentId;
    while (cursor) {
        if (cursor === folderId) return true;
        const parent = await prisma.persFolder.findUnique({
            where: { folderId: cursor },
            select: { parentFolderId: true, userId: true },
        });
        if (!parent || parent.userId !== userId) return false;
        cursor = parent.parentFolderId ?? null;
    }

    return false;
}

export async function getUserPerses() {
    const session = await auth();
    if (!session?.user?.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return [];

    return prisma.pers.findMany({
        where: buildVisiblePersFilter(user.id),
        include: {
            race: true,
            class: true,
            background: true,
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function getUserPersHomeData(options?: { ruleset?: Ruleset }) {
    const userId = await getCurrentUserId();
    if (!userId) return { perses: [], folders: [], currentUserId: null };

    const [perses, folders] = await Promise.all([
        prisma.pers.findMany({
            where: {
                AND: [
                    buildVisiblePersFilter(userId),
                    ...(options?.ruleset ? [{ ruleset: options.ruleset }] : []),
                ],
            },
            include: {
                race: true,
                class: true,
                subclass: true,
                background: true,
                multiclasses: {
                    include: {
                        class: true,
                        subclass: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.persFolder.findMany({
            where: {
                AND: [
                    buildVisibleFolderFilter(userId),
                    ...(options?.ruleset ? [{ ruleset: options.ruleset }] : []),
                ],
            },
            select: {
                folderId: true,
                name: true,
                color: true,
                isPinned: true,
                parentFolderId: true,
            },
            orderBy: [{ isPinned: "desc" }, { name: "asc" }],
        }),
    ]);

    const folderIds = new Set(folders.map((folder) => folder.folderId));
    const normalizedFolders = folders.map((folder) => {
        if (folder.parentFolderId && !folderIds.has(folder.parentFolderId)) {
            return { ...folder, parentFolderId: null };
        }
        return folder;
    });

    return { perses, folders: normalizedFolders, currentUserId: userId };
}

export async function renamePers(persId: number, name: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const next = normalizePersName(name);
    if (!next) return { success: false as const, error: "Імʼя не може бути порожнім" };
    if (next.length > 60) return { success: false as const, error: "Імʼя занадто довге" };

    const canEdit = await canEditPers(persId, userId);
    if (!canEdit) return { success: false as const, error: "Немає доступу до персонажа" };

    await prisma.pers.update({
        where: { persId },
        data: { name: next },
    });

    revalidatePath("/char/home");
    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true as const };
}

export async function deletePers(persId: number) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const canDelete = await canDeletePers(persId, userId);
    if (canDelete) {
        const removed = await prisma.pers.findMany({
            where: { OR: [{ persId }, { parentPersId: persId }] },
            select: { portraitKey: true },
        });
        await prisma.$transaction([
            prisma.pers.deleteMany({
                where: { parentPersId: persId },
            }),
            prisma.pers.delete({
                where: { persId },
            }),
        ]);
        void deleteUnusedPortraits(removed.map((pers) => pers.portraitKey));

        revalidatePath("/char/home");
        return { success: true as const };
    }

    // Співвласник за посиланням на редагування не має права знищити дані власника — клік
    // «Видалити» лише прибирає персонажа з його власного списку.
    const additionalUser = await prisma.persAdditionalUser.findUnique({
        where: { persId_userId: { persId, userId } },
        select: { persAdditionalUserId: true },
    });

    if (additionalUser) {
        await prisma.persAdditionalUser.delete({
            where: { persAdditionalUserId: additionalUser.persAdditionalUserId },
        });

        revalidatePath("/char/home");
        return { success: true as const, unlinked: true as const };
    }

    const canEdit = await canEditPers(persId, userId);
    if (!canEdit) return { success: false as const, error: "Немає доступу до персонажа" };

    return { success: false as const, error: "Видалити персонажа може лише власник" };
}

export async function duplicatePers(persId: number) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    try {
        const pers = await prisma.pers.findUnique({
            where: { persId },
            include: PERS_DUPLICATION_INCLUDE,
        });

        if (!pers) {
            return { success: false as const, error: "Немає доступу до персонажа" };
        }
        const canEdit = await canEditPers(persId, userId);
        if (!canEdit) return { success: false as const, error: "Немає доступу до персонажа" };

        const duplicate = await prisma.$transaction(async (tx) => clonePersWithRelations(tx, pers, buildCopyTarget(pers)));

        revalidatePath("/char/home");
        
        const persHomeItem = {
            persId: duplicate.persId,
            name: duplicate.name,
            level: duplicate.level,
            currentHp: duplicate.currentHp,
            maxHp: duplicate.maxHp,
            raceName: pers.race.name,
            className: pers.class.name,
            backgroundName: pers.background.name,
            shareToken: duplicate.shareToken,
            folderId: duplicate.folderId,
            isPinned: duplicate.isPinned,
            ruleset: duplicate.ruleset,
            classNames: collectPersClassNames(pers),
            subclassNames: collectPersSubclassNames(pers),
        };

        return { success: true as const, pers: persHomeItem };
    } catch (error) {
        console.error("Duplication failed:", error);
        return { success: false as const, error: "Не вдалося скопіювати персонажа" };
    }
}

export async function createPersFolder(input: { name: string; ruleset: Ruleset; color?: string; parentFolderId?: number | null }) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const name = normalizeFolderName(input.name);
    if (!name) return { success: false as const, error: "Назва папки не може бути порожньою" };

    const color = normalizeFolderColor(input.color ?? "#38bdf8");
    let parentFolderId: number | null = null;

    if (typeof input.parentFolderId === "number") {
        const parent = await assertFolderOwnership(input.parentFolderId, userId);
        if (!parent) return { success: false as const, error: "Немає доступу до папки" };
        if (parent.ruleset !== input.ruleset) return { success: false as const, error: FOLDER_RULESET_MISMATCH_ERROR };
        parentFolderId = parent.folderId;
    }

    const folder = await prisma.persFolder.create({
        data: {
            userId,
            name,
            color,
            parentFolderId,
            ruleset: input.ruleset,
        },
        select: {
            folderId: true,
            name: true,
            color: true,
            isPinned: true,
            parentFolderId: true,
        },
    });

    revalidatePath("/char/home");
    return { success: true as const, folder };
}

export async function renamePersFolder(folderId: number, nextName: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const name = normalizeFolderName(nextName);
    if (!name) return { success: false as const, error: "Назва папки не може бути порожньою" };

    const folder = await assertFolderOwnership(folderId, userId);
    if (!folder) return { success: false as const, error: "Немає доступу до папки" };

    await prisma.persFolder.update({
        where: { folderId },
        data: { name },
    });

    revalidatePath("/char/home");
    return { success: true as const };
}

export async function setPersFolderColor(folderId: number, nextColor: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const folder = await assertFolderOwnership(folderId, userId);
    if (!folder) return { success: false as const, error: "Немає доступу до папки" };

    const color = normalizeFolderColor(nextColor);
    await prisma.persFolder.update({
        where: { folderId },
        data: { color },
    });

    revalidatePath("/char/home");
    return { success: true as const };
}

export async function setPersFolderPinned(folderId: number, isPinned: boolean) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const folder = await assertFolderOwnership(folderId, userId);
    if (!folder) return { success: false as const, error: "Немає доступу до папки" };

    await prisma.persFolder.update({
        where: { folderId },
        data: { isPinned },
    });

    revalidatePath("/char/home");
    return { success: true as const };
}

export async function deletePersFolder(folderId: number) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const folder = await assertFolderOwnership(folderId, userId);
    if (!folder) return { success: false as const, error: "Немає доступу до папки" };

    const nextParentId = folder.parentFolderId ?? null;

    await prisma.$transaction([
        prisma.pers.updateMany({
            where: { userId, folderId },
            data: { folderId: nextParentId },
        }),
        prisma.persFolder.updateMany({
            where: { userId, parentFolderId: folderId },
            data: { parentFolderId: nextParentId },
        }),
        prisma.persFolder.delete({
            where: { folderId },
        }),
    ]);

    revalidatePath("/char/home");
    return { success: true as const };
}

export async function duplicatePersFolder(folderId: number) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const source = await assertFolderOwnership(folderId, userId);
    if (!source) return { success: false as const, error: "Немає доступу до папки" };

    const created = await prisma.$transaction(async (tx) => {
        const root = await tx.persFolder.findUnique({
            where: { folderId },
            select: {
                folderId: true,
                name: true,
                color: true,
                isPinned: true,
                parentFolderId: true,
                ruleset: true,
            },
        });

        if (!root) return null;

        const cloneFolder = async (folder: typeof root, parentId: number | null, addCopySuffix: boolean) => {
            const createdFolder = await tx.persFolder.create({
                data: {
                    userId,
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
                where: { userId, folderId: folder.folderId },
                include: PERS_DUPLICATION_INCLUDE,
            });

            for (const pers of perses) {
                await clonePersWithRelations(tx, pers, buildCopyTarget(pers, { folderId: createdFolder.folderId }));
            }

            const children = await tx.persFolder.findMany({
                where: { userId, parentFolderId: folder.folderId },
                select: { folderId: true, name: true, color: true, isPinned: true, parentFolderId: true, ruleset: true },
            });

            for (const child of children) {
                await cloneFolder(child, createdFolder.folderId, false);
            }

            return createdFolder;
        };

        return cloneFolder(root, root.parentFolderId ?? null, true);
    });

    if (!created) return { success: false as const, error: "Не вдалося скопіювати папку" };

    revalidatePath("/char/home");
    return { success: true as const, folder: created };
}

export async function movePersToFolder(persId: number, folderId: number | null) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const canEdit = await canEditPers(persId, userId);
    if (!canEdit) return { success: false as const, error: "Немає доступу до персонажа" };

    let nextFolderId: number | null = null;
    if (typeof folderId === "number") {
        const folder = await assertFolderOwnership(folderId, userId);
        if (!folder) return { success: false as const, error: "Немає доступу до папки" };
        const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { ruleset: true } });
        if (pers.ruleset !== folder.ruleset) return { success: false as const, error: FOLDER_RULESET_MISMATCH_ERROR };
        nextFolderId = folder.folderId;
    }

    await prisma.$transaction(async (tx) => {
        await tx.pers.update({
            where: { persId },
            data: { folderId: nextFolderId },
        });

        if (typeof nextFolderId === "number") {
            const members = await tx.persFolderMember.findMany({
                where: { folderId: nextFolderId, canEdit: true },
                select: { userId: true },
            });

            if (members.length > 0) {
                await tx.persAdditionalUser.createMany({
                    data: members.map((m) => ({ persId, userId: m.userId })),
                    skipDuplicates: true,
                });
            }
        }
    });

    revalidatePath("/char/home");
    return { success: true as const };
}

export async function movePersFolder(folderId: number, parentFolderId: number | null) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const folder = await assertFolderOwnership(folderId, userId);
    if (!folder) return { success: false as const, error: "Немає доступу до папки" };

    let nextParentId: number | null = null;
    if (typeof parentFolderId === "number") {
        const parent = await assertFolderOwnership(parentFolderId, userId);
        if (!parent) return { success: false as const, error: "Немає доступу до папки" };
        if (parent.folderId === folderId) {
            return { success: false as const, error: "Неможливо перемістити папку в саму себе" };
        }
        const isDescendant = await isFolderDescendant(userId, folderId, parent.folderId);
        if (isDescendant) {
            return { success: false as const, error: "Неможливо перемістити папку в її підпапку" };
        }
        if (parent.ruleset !== folder.ruleset) {
            return { success: false as const, error: FOLDER_RULESET_MISMATCH_ERROR };
        }
        nextParentId = parent.folderId;
    }

    await prisma.persFolder.update({
        where: { folderId },
        data: { parentFolderId: nextParentId },
    });

    revalidatePath("/char/home");
    return { success: true as const };
}

export async function setPersPinned(persId: number, isPinned: boolean) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const canEdit = await canEditPers(persId, userId);
    if (!canEdit) return { success: false as const, error: "Немає доступу до персонажа" };

    await prisma.pers.update({
        where: { persId },
        data: { isPinned },
    });

    revalidatePath("/char/home");
    return { success: true as const };
}

export async function getUserPersesSpellIndex(ruleset: Ruleset) {
    const session = await auth();
    if (!session?.user?.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return [];

    const perses = await prisma.pers.findMany({
        where: { 
            userId: user.id,
            ruleset,
            isSnapshot: false,
            isActive: true
        },
        select: {
            persId: true,
            name: true,
            persSpells: {
                select: {
                    spellId: true,
                    spell: { select: { spellId: true, engName: true, ruleset: true } },
                },
            },
            homebrewSpells: { select: { homebrewEntryId: true } },
        },
        orderBy: { updatedAt: "desc" },
    });

    return perses.map((p) => ({
        persId: p.persId,
        name: p.name,
        spellIds: p.persSpells.map((s) => s.spellId),
        spellKeys: [
            ...p.persSpells.map((s) => buildSpellLinkForSpell(s.spell).spellKey),
            ...p.homebrewSpells.map((s) => buildHomebrewSpellKey(s.homebrewEntryId)),
        ],
    }));
}

/** Для друку й серверних перерахунків: з описами заклинань і власником (імʼя гравця в PDF). */
export async function getPersById(id: number) {
    return findVisiblePers(id, { ...PERS_PRINT_INCLUDE, user: true });
}

/** Лист у браузері: без рядка власника й без описів заклинань, які він не читає. */
export async function getPersForSheet(id: number) {
    return findVisiblePers(id, PERS_SHEET_INCLUDE);
}

async function findVisiblePers<TInclude extends Prisma.PersInclude>(id: number, include: TInclude) {
    const [userId, pers] = await Promise.all([
        findCurrentUserId(),
        prisma.pers.findUnique({ where: { persId: id }, include }),
    ]);
    if (!userId || !pers) return null;
    return (await canViewPers(pers, userId)) ? pers : null;
}

async function canViewPers(pers: { persId: number; userId: number; folderId: number | null }, userId: number): Promise<boolean> {
    if (pers.userId === userId) return true;

    const [additional, folderMember] = await Promise.all([
        prisma.persAdditionalUser.findUnique({
            where: { persId_userId: { persId: pers.persId, userId } },
            select: { persId: true },
        }),
        pers.folderId
            ? prisma.persFolderMember.findUnique({
                where: { folderId_userId: { folderId: pers.folderId, userId } },
                select: { canEdit: true },
            })
            : null,
    ]);

    return Boolean(additional || folderMember?.canEdit);
}

export type PersWithRelations = NonNullable<Awaited<ReturnType<typeof getPersForSheet>>>;
export type PersForPrint = NonNullable<Awaited<ReturnType<typeof getPersById>>>;
export type PersWeaponWithWeapon = PersWithRelations['weapons'][number];
export type PersArmorWithArmor = PersWithRelations['armors'][number];

export type CharacterFeatureGroupKey = "passive" | "actions" | "bonusActions" | "reactions";

export interface CharacterFeatureItem {
    key: string;
    featureId?: number;
    usesPoolKey?: string | null;
    usePrice?: number | null;
    name: string;
    shortDescription?: string | null;
    description: string;
    displayTypes: FeatureDisplayType[];
    primaryType: FeatureDisplayType;
    source: FeatureSource;
    sourceName: string;
    usesRemaining?: number | null;
    usesPer?: number | null;
    restType?: RestType | null;
    regainsOneUseOnShortRest?: boolean;
    createdAt?: number | null;
    magicItem?: Partial<MagicItem> | null;
    descriptionTarget?: FeatureDescriptionTarget;
    hasCustomDescription?: boolean;
    /** Група опції підкласу, яку книга дозволяє перевибрати після довгого відпочинку (KR37.4). */
    rechoosableGroupName?: string;
    /** Лють чи Велика форма зараз увімкнена (O38). */
    isActive?: boolean;
}

export type CharacterFeaturesGroupedResult = Record<CharacterFeatureGroupKey, CharacterFeatureItem[]>;

function normalizeDisplayTypes(input: unknown): FeatureDisplayType[] {
    if (Array.isArray(input)) {
        const values = input.filter(Boolean) as FeatureDisplayType[];
        return values.length > 0 ? values : [FeatureDisplayType.PASSIVE];
    }
    if (typeof input === "string" && input.length > 0) {
        return [input as FeatureDisplayType];
    }
    return [FeatureDisplayType.PASSIVE];
}

function getPrimaryDisplayType(displayTypes: FeatureDisplayType[]): FeatureDisplayType {
    const normalized = normalizeDisplayTypes(displayTypes);
    // Priority: ACTION > BONUSACTION > REACTION > PASSIVE
    if (normalized.includes(FeatureDisplayType.ACTION)) return FeatureDisplayType.ACTION;
    if (normalized.includes(FeatureDisplayType.BONUSACTION)) return FeatureDisplayType.BONUSACTION;
    if (normalized.includes(FeatureDisplayType.REACTION)) return FeatureDisplayType.REACTION;
    return FeatureDisplayType.PASSIVE;
}

function toPrimaryGroupKey(primaryType: FeatureDisplayType): CharacterFeatureGroupKey {
    switch (primaryType) {
        case FeatureDisplayType.ACTION:
            return "actions";
        case FeatureDisplayType.BONUSACTION:
            return "bonusActions";
        case FeatureDisplayType.REACTION:
            return "reactions";
        default:
            return "passive";
    }
}

const PERS_FEATURES_INCLUDE = {
    featureDescriptions: { select: { kind: true, refId: true, description: true } },
    features: { include: { feature: true }, orderBy: { persFeatureId: "asc" } },
    race: { include: { traits: { include: { feature: true } } } },
    subrace: { include: { traits: { include: { feature: true } } } },
    class: { include: { features: { include: { feature: true } } } },
    subclass: { include: { features: { include: { feature: true } } } },
    multiclasses: {
        include: {
            class: { include: { features: { include: { feature: true } } } },
            subclass: { include: { features: { include: { feature: true } } } },
        }
    },
    raceVariants: { include: { traits: { include: { feature: true } } } },
    feats: {
        include: {
            feat: true,
            choices: {
                include: {
                    choiceOption: true,
                },
            },
        },
    },
    choiceOptions: { include: { features: { include: { feature: true } } } },
    raceChoiceOptions: { include: { traits: { include: { feature: true } } } },
    persInfusions: {
        include: {
            infusion: {
                include: {
                    replicatedMagicItem: true,
                    feature: true
                }
            }
        }
    },
    resourcePools: true,
    user: true,
} satisfies Prisma.PersInclude;

function buildCharacterFeaturesGrouped(pers: any): CharacterFeaturesGroupedResult {
    // Build a map of featureId -> Source
    // Also build a map of featureId -> ClassLevel for determining class-based scaling uses
    const sourceMap = new Map<number, "RACE" | "SUBRACE" | "CLASS" | "SUBCLASS">();
    const featureClassLevelMap = new Map<number, number>();

    const multiclassSum = pers.multiclasses.reduce((acc, current) => acc + (Number(current.classLevel) || 0), 0);
    const mainClassLevel = Math.max(1, (Number(pers.level) || 1) - multiclassSum);

    const addFeaturesToLevelMap = (features: any[], level: number) => {
        features.forEach(f => {
             if (f.feature?.featureId) featureClassLevelMap.set(f.feature.featureId, level);
             else if (f.featureId) featureClassLevelMap.set(f.featureId, level);
        });
    };

    // Main class
    addFeaturesToLevelMap(pers.class.features, mainClassLevel);
    if (pers.subclass) addFeaturesToLevelMap(pers.subclass.features, mainClassLevel);

    pers.multiclasses.forEach(mc => {
        const lvl = Number(mc.classLevel) || 1;
        addFeaturesToLevelMap(mc.class.features, lvl);
        if (mc.subclass) addFeaturesToLevelMap(mc.subclass.features, lvl);
    });
    
    pers.race.traits.forEach(t => { if (t.featureId) sourceMap.set(t.featureId, "RACE"); });
    pers.subrace?.traits.forEach(t => { if (t.featureId) sourceMap.set(t.featureId, "SUBRACE"); });
    pers.class.features.forEach(f => { if (f.featureId) sourceMap.set(f.featureId, "CLASS"); });
    pers.subclass?.features.forEach(f => { if (f.featureId) sourceMap.set(f.featureId, "SUBCLASS"); });
    
    pers.multiclasses.forEach(mc => {
        mc.class.features.forEach(f => { if (f.featureId) sourceMap.set(f.featureId, "CLASS"); });
        mc.subclass?.features.forEach(f => { if (f.featureId) sourceMap.set(f.featureId, "SUBCLASS"); });
    });

    pers.raceVariants.forEach(rv => {
        rv.traits.forEach(t => { if (t.featureId) sourceMap.set(t.featureId, "RACE"); });
    });

    // Identify features that come from choices to label them correctly in the main loop
    const choiceFeatureIds = new Map<number, FeatureSource>();
    pers.choiceOptions.forEach(co => co.features.forEach(cof => choiceFeatureIds.set(cof.feature.featureId, "CHOICE")));
    const rechoosableGroupByFeatureId = new Map<number, string>();
    pers.choiceOptions.forEach(co => {
        const group = findRechoosableSubclassOptionGroup(co.groupName, pers.ruleset);
        if (group) co.features.forEach(cof => rechoosableGroupByFeatureId.set(cof.feature.featureId, group.groupName));
    });
    pers.raceChoiceOptions.forEach(rco => rco.traits.forEach(t => { if (t.featureId) choiceFeatureIds.set(t.featureId, "RACE_CHOICE"); }));

    const poolRemainingByKey = new Map<string, number | null>();
    pers.resourcePools?.forEach(pool => {
        poolRemainingByKey.set(pool.poolKey, pool.usesRemaining ?? null);
    });

    // Претенденти збираються всі, а обирає між ними правило `findPoolProvider` (BUG-011): лист
    // мусить показувати той самий максимум, який порахує витрата й відпочинок, інакше гравець
    // бачить одне число, а натискає на інше.
    const poolCandidatesByKey = new Map<string, any[]>();
    const registerPoolProvider = (feature: any) => {
        if (!feature?.usesPoolKey) return;

        const hasCounts =
            feature.usesCountDependsOnProficiencyBonus ||
            typeof feature.usesCount === "number" ||
            (feature.usesCountSpecial && typeof feature.usesCountSpecial === "object");
        if (!hasCounts) return;

        const candidates = poolCandidatesByKey.get(feature.usesPoolKey) ?? [];
        if (candidates.some(candidate => candidate.featureId === feature.featureId)) return;

        poolCandidatesByKey.set(feature.usesPoolKey, [...candidates, feature]);
    };

    const collectPoolProviders = (features: any[] = []) => {
        features.forEach(f => registerPoolProvider(f?.feature ?? f));
    };

    collectPoolProviders(pers.features.map(pf => pf.feature));
    collectPoolProviders(pers.class.features);
    collectPoolProviders(pers.subclass?.features ?? []);
    pers.multiclasses.forEach(mc => {
        collectPoolProviders(mc.class.features);
        collectPoolProviders(mc.subclass?.features ?? []);
    });
    collectPoolProviders(pers.race.traits.map(t => t.feature));
    collectPoolProviders(pers.subrace?.traits.map(t => t.feature) ?? []);
    pers.raceVariants.forEach(rv => collectPoolProviders(rv.traits.map(t => t.feature)));
    pers.choiceOptions.forEach(co => collectPoolProviders(co.features.map(f => f.feature)));
    pers.raceChoiceOptions.forEach(rco => collectPoolProviders(rco.traits.map(t => t.feature)));
    pers.persInfusions.forEach(pi => registerPoolProvider(pi.infusion?.feature));


    const buckets: CharacterFeaturesGroupedResult = {
        passive: [],
        actions: [],
        bonusActions: [],
        reactions: [],
    };

    const proficiencyBonus = (level: number) => {
        if (!Number.isFinite(level) || level <= 0) return 2;
        return 2 + Math.floor((level - 1) / 4);
    };

    const calculateMaxUsesForFeature = (f: any) => {
        if (!f) return null;
        const special = f.usesCountSpecial;
        const getClassLevel = () => {
            if (f.featureId && featureClassLevelMap.has(f.featureId)) {
                return featureClassLevelMap.get(f.featureId) ?? pers.level;
            }
            return pers.level;
        };

        const getAbilityMod = (stat: string) => {
            const key = String(stat || "").toLowerCase();
            const abilityScores: Record<string, number> = {
                str: pers.str,
                dex: pers.dex,
                con: pers.con,
                int: pers.int,
                wis: pers.wis,
                cha: pers.cha,
            };
            const score = abilityScores[key];
            if (typeof score !== "number") return 0;
            return Math.floor((score - 10) / 2);
        };

        if (Array.isArray(special)) {
            const classLevel = getClassLevel();
            const match = [...special]
                .filter((entry) => typeof entry?.lvl === "number" && classLevel >= entry.lvl)
                .sort((a, b) => b.lvl - a.lvl)[0];
            if (match && typeof match.uses === "number") return match.uses;
        }

        if (special && typeof special === "object" && special.equalsToClassLevel === true) {
            return getClassLevel();
        }

        if (special && typeof special === "object" && special.type === "FORMULA") {
            const operation = String(special.operation || "ADD").toUpperCase();
            const minimum = typeof special.minimum === "number" ? special.minimum : null;

            if (special.group === "STAT_BASED") {
                const base = Number(special.base ?? 0);
                const mod = getAbilityMod(special.stat);
                const value = operation === "MULTIPLY" ? base * mod : base + mod;
                return minimum !== null ? Math.max(minimum, value) : value;
            }

            if (special.group === "LEVEL_BASED") {
                const classLevel = getClassLevel();
                const multiplier = Number(special.multiplier ?? 1);
                const base = Number(special.base ?? 0);
                const value = operation === "MULTIPLY" ? classLevel * multiplier : base + classLevel;
                return minimum !== null ? Math.max(minimum, value) : value;
            }

            if (special.group === "PROFICIENCY_BONUS") {
                const pb = proficiencyBonus(pers.level);
                const multiplier = Number(special.multiplier ?? 1);
                const base = Number(special.base ?? 0);
                const value = operation === "MULTIPLY" ? pb * multiplier : base + pb;
                return minimum !== null ? Math.max(minimum, value) : value;
            }
        }

        if (f.usesCountDependsOnProficiencyBonus) return proficiencyBonus(pers.level);
        if (typeof f.usesCount === "number") return f.usesCount;
        return null;
    };

    const getPoolInfo = (f: any) => {
        if (!f?.usesPoolKey) return null;
        const provider = findPoolProvider(poolCandidatesByKey.get(f.usesPoolKey) ?? []) ?? f;
        const maxUses = calculateMaxUsesForFeature(provider);
        const remaining = poolRemainingByKey.get(f.usesPoolKey) ?? null;
        const restType = provider?.limitedUsesPer ?? f?.limitedUsesPer ?? null;
        return { maxUses, remaining, restType, regainsOneUse: regainsOneUseOnShortRest(provider?.engName) };
    };

    const seenFeatureIds = new Set<number>();
    const seenNames = new Set<string>();

    const push = (item: Omit<CharacterFeatureItem, "primaryType" | "displayTypes"> & { displayTypes: FeatureDisplayType[] }) => {
        if (item.featureId && seenFeatureIds.has(item.featureId)) return;
        const normalizedName = item.name.trim().toLowerCase();
        if (seenNames.has(normalizedName)) return;

        if (item.featureId) seenFeatureIds.add(item.featureId);
        seenNames.add(normalizedName);

        const displayTypes = normalizeDisplayTypes(item.displayTypes);
        const primaryType = getPrimaryDisplayType(displayTypes);
        const key = toPrimaryGroupKey(primaryType);
        const customDescription = item.descriptionTarget ? findCustomDescription(pers.featureDescriptions, item.descriptionTarget) : null;
        buckets[key].push({
            ...item,
            description: customDescription ?? item.description,
            shortDescription: customDescription === null ? item.shortDescription : null,
            hasCustomDescription: customDescription !== null,
            displayTypes,
            primaryType,
        });
    };

    // 1) Explicit pers_feature (usually level-up granted)
    for (const pf of pers.features) {
        const f = pf.feature;

        const poolInfo = getPoolInfo(f);

        // KR31.3: тут стояла урізана копія, сліпа до `usesCountSpecial: [{lvl, uses}]`, тож
        // Лють обох редакцій, Другий подих і Незламність показували на листі порожній максимум.
        const usesPer = poolInfo?.maxUses ?? calculateMaxUsesForFeature(f);

        let source = sourceMap.get(f.featureId) || "PERS";
        if (source === "PERS") {
            const choiceSource = choiceFeatureIds.get(f.featureId);
            if (choiceSource) source = choiceSource;
        }

        push({
            key: `PERS:feature:${f.featureId}`,
            featureId: f.featureId,
            descriptionTarget: { kind: "FEATURE", refId: f.featureId },
            usesPoolKey: f.usesPoolKey ?? null,
            usePrice: f.usePrice ?? 1,
            name: f.name,
            shortDescription: f.shortDescription ?? null,
            description: f.description,
            displayTypes: normalizeDisplayTypes(f.displayType),
            source: source as FeatureSource,
            sourceName: f.name,
            rechoosableGroupName: rechoosableGroupByFeatureId.get(f.featureId),
            usesRemaining: poolInfo?.remaining ?? pf.usesRemaining ?? null,
            usesPer,
            restType: poolInfo?.restType ?? f.limitedUsesPer ?? null,
            regainsOneUseOnShortRest: poolInfo?.regainsOneUse ?? regainsOneUseOnShortRest(f.engName),
            createdAt: pf.persFeatureId,
            isActive: pf.isActive,
        });
    }

    // 2) Choice options stored directly on pers -> push remaining FEATURES
    for (const co of pers.choiceOptions ?? []) {
        for (const cof of co.features ?? []) {
            const f = cof.feature;

            push({
                key: `CHOICE:${co.groupName}:option:${co.choiceOptionId}:feature:${f.featureId}`,
                featureId: f.featureId,
                descriptionTarget: { kind: "FEATURE", refId: f.featureId },
                usesPoolKey: f.usesPoolKey ?? null,
                usePrice: f.usePrice ?? 1,
                name: f.name,
                shortDescription: f.shortDescription ?? null,
                description: f.description,
                displayTypes: normalizeDisplayTypes(f.displayType),
                source: "CHOICE",
                sourceName: co.groupName,
                rechoosableGroupName: rechoosableGroupByFeatureId.get(f.featureId),
                createdAt: co.choiceOptionId, // fallback
                usesRemaining: null,
                usesPer: calculateMaxUsesForFeature(f),
                restType: f.limitedUsesPer,
            });
        }
    }
    for (const rco of pers.raceChoiceOptions ?? []) {
        for (const rcot of rco.traits ?? []) {
            if (!rcot.feature) continue;
            const f = rcot.feature;

            push({
                key: `RACE_CHOICE:${rco.choiceGroupName}:option:${rco.optionId}:feature:${f.featureId}`,
                featureId: f.featureId,
                descriptionTarget: { kind: "FEATURE", refId: f.featureId },
                usesPoolKey: f.usesPoolKey ?? null,
                usePrice: f.usePrice ?? 1,
                name: f.name,
                shortDescription: f.shortDescription ?? null,
                description: f.description,
                displayTypes: normalizeDisplayTypes(f.displayType),
                source: "RACE_CHOICE",
                sourceName: rco.choiceGroupName,
                createdAt: rco.optionId, // fallback
                usesRemaining: null,
                /// Благословення виду бере максимум із бонусу майстерності, а не з плаского
                /// числа: без цього персонаж без рядка `pers_feature` бачив би порожній лічильник.
                usesPer: calculateMaxUsesForFeature(f),
                restType: f.limitedUsesPer,
            });
        }
    }

    // 3) Feats, with what was picked inside each feat folded into its own card
    for (const pf of pers.feats ?? []) {
        const featName = pf.feat.name;

        push({
            key: `FEAT:${pf.featId}`,
            name: featName,
            descriptionTarget: { kind: "FEAT", refId: pf.featId },
            description: buildFeatFeatureDescription(pf.feat.description, pf.choices),
            displayTypes: [FeatureDisplayType.PASSIVE],
            source: "FEAT",
            sourceName: featName,
        });
    }
    
    // 4) Artificer Infusions
    for (const pi of pers.persInfusions ?? []) {
        const inf = pi.infusion;
        const feature = inf.feature;
        
        const usesPer = feature ? (() => {
            if (feature.usesCountDependsOnProficiencyBonus) return proficiencyBonus(pers.level);
            if (typeof feature.usesCount === "number") return feature.usesCount;
            return null;
        })() : null;

        push({
            key: `INFUSION:${pi.persInfusionId}`,
            descriptionTarget: { kind: "INFUSION", refId: pi.persInfusionId },
            name: feature?.name || inf.name,
            description: feature?.description || inf.replicatedMagicItem?.description || inf.name,
            shortDescription: feature?.shortDescription,
            displayTypes: feature?.displayType as FeatureDisplayType[] || [FeatureDisplayType.PASSIVE],
            source: "INFUSION",
            sourceName: "Вливання",
            magicItem: inf.replicatedMagicItem ?? null,
            usesPoolKey: feature?.usesPoolKey ?? null,
            usePrice: feature?.usePrice ?? 1,
            usesPer,
            restType: feature?.limitedUsesPer ?? null,
            usesRemaining: feature?.usesCount, // Fallback, though not tracked yet
        });
    }

    return buckets;
}

export async function getCharacterFeaturesGrouped(persId: number): Promise<CharacterFeaturesGroupedResult | null> {
    const [userId, pers] = await Promise.all([
        findCurrentUserId(),
        prisma.pers.findUnique({ where: { persId }, include: PERS_FEATURES_INCLUDE }),
    ]);
    if (!userId || !pers) return null;

    const canEdit = await canEditPers(persId, userId);
    if (!canEdit) return null;
    return buildCharacterFeaturesGrouped(pers);
}

export async function getCharacterFeaturesGroupedByShareToken(token: string): Promise<CharacterFeaturesGroupedResult | null> {
    if (!token) return null;

    const editToken = await prisma.persShareToken.findUnique({
        where: { token },
        select: { persId: true }
    });

    const pers = await prisma.pers.findUnique({
        where: editToken ? { persId: editToken.persId } : { shareToken: token },
        include: PERS_FEATURES_INCLUDE,
    });

    if (!pers) return null;

    return buildCharacterFeaturesGrouped(pers);
}

export async function getUserPersesMagicItemIndex(ruleset: Ruleset) {
    const session = await auth();
    if (!session?.user?.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return [];

    const perses = await prisma.pers.findMany({
        where: { 
            userId: user.id,
            ruleset,
            isSnapshot: false,
            isActive: true
        },
        select: {
            persId: true,
            name: true,
            magicItems: {
               select: {
                   magicItemId: true
               }
            }
        },
        orderBy: { updatedAt: "desc" },
    });

    return perses.map((p) => ({
        persId: p.persId,
        name: p.name,
        magicItemIds: p.magicItems.map((mi) => mi.magicItemId),
    }));
}

'use server';

import { auth } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { Ruleset, SpellOrigin } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { canEditPers } from "@/lib/actions/pers";

// KR6.3: hardcoded until the edition switch (O6 Крок 5) lets pers.ruleset drive this.
const ACTIVE_RULESET: Ruleset = "RULES_2014";

const SPELL_BADGE_COLORS = new Set([
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#a78bfa",
  "#94a3b8",
  "#a3e635",
  "#2dd4bf",
]);

const normalizeSpellBadgeColor = (value?: string | null): string | null => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  return SPELL_BADGE_COLORS.has(raw) ? raw : null;
};

const normalizeSpellBadgeText = (value?: string | null): string | null => {
  const text = String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
  if (!text) return null;
  return text.slice(0, 24);
};

const revalidatePersSpellViews = (persId: number) => {
  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
};

/**
 * Strict: Learn spells during Level-Up
 * Використовується системою Level-Up для збереження обраних заклинань.
 * Встановлює origin = CLASS.
 */
export async function learnClassSpells({
  persId,
  spellIds,
  level,
}: {
  persId: number;
  spellIds: number[];
  level: number;
}) {
  try {
    console.log(`📚 Learning ${spellIds.length} class spells for persId=${persId}`);

    // Використовуємо transaction, щоб або всі збереглися, або нічого
    await prisma.$transaction(
      spellIds.map((spellId) =>
        prisma.persSpell.create({
          data: {
            persId,
            spellId,
            learnedAtLevel: level,
            origin: SpellOrigin.CLASS,
            isPrepared: false,
          },
        })
      )
    );

    revalidatePersSpellViews(persId);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to learn class spells:', error);
    // Якщо помилка унікальності (вже знає закляття), це ок, але краще перевірити
    return { success: false, error: 'Не вдалося зберегти заклинання' };
  }
}

/**
 * Flexible: Add manual spell (DM/Player)
 * Додає заклинання вручну, ігноруючи ліміти.
 * Встановлює origin = MANUAL.
 */
export async function addManualSpell({
  persId,
  spellId,
  notes,
}: {
  persId: number;
  spellId: number;
  notes?: string;
}) {
  try {
    await prisma.persSpell.create({
      data: {
        persId,
        spellId,
        learnedAtLevel: 0, // Manual doesn't really have a level requirement
        origin: SpellOrigin.MANUAL,
        isPrepared: false,
        notes,
      },
    });

    revalidatePersSpellViews(persId);
    return { success: true };
  } catch (error) {
    console.error('Failed to add manual spell:', error);
    return { success: false, error: 'Не вдалося додати заклинання' };
  }
}

export type SpellForModal = {
  spellId: number;
  name: string;
  engName: string;
  level: number;
  school: string | null;
  castingTime: string;
  duration: string;
  range: string;
  components: string | null;
  description: string;
  source: string;
  hasRitual: string | null;
  hasConcentration: string | null;
  spellClasses: { className: string; source: string | null }[];
  spellRaces: { raceName: string | null }[];
};

export async function getSpellForModal(spellIdOrSlug: string): Promise<SpellForModal | null> {
  const trimmed = (spellIdOrSlug ?? "").trim();
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  const byId = Number.isFinite(asNumber) ? Math.trunc(asNumber) : null;

  const spell = await prisma.spell.findFirst({
    where: {
      ruleset: ACTIVE_RULESET,
      OR: [
        ...(byId ? ([{ spellId: byId }] as const) : []),
        { engName: trimmed },
        { name: trimmed },
      ],
    },
    select: {
      spellId: true,
      name: true,
      engName: true,
      level: true,
      school: true,
      castingTime: true,
      duration: true,
      range: true,
      components: true,
      description: true,
      source: true,
      hasRitual: true,
      hasConcentration: true,
      spellClasses: { select: { className: true, source: true } },
      spellRaces: { select: { raceName: true } },
    },
  });

  if (!spell) return null;

  return {
    ...spell,
    source: String(spell.source),
  };
}

export async function toggleSpellForPers({
  persId,
  spellId,
}: {
  persId: number;
  spellId: number;
}): Promise<{ success: true; added: boolean } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return { success: false, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) {
    return { success: false, error: "Немає доступу до персонажа" };
  }

  const existing = await prisma.persSpell.findUnique({
    where: {
      persId_spellId: {
        persId,
        spellId,
      },
    },
    select: { persSpellId: true, isPrepared: true },
  });

  if (existing) {
    if (!existing.isPrepared) {
      await prisma.persSpell.update({
        where: { persSpellId: existing.persSpellId },
        data: { isPrepared: true },
      });

      revalidatePersSpellViews(persId);
      return { success: true, added: true };
    }

    await prisma.persSpell.delete({
      where: { persSpellId: existing.persSpellId },
    });

    revalidatePersSpellViews(persId);
    return { success: true, added: false };
  }

  await prisma.persSpell.create({
    data: {
      persId,
      spellId,
      learnedAtLevel: 0,
      origin: SpellOrigin.MANUAL,
      isPrepared: false,
    },
  });

  revalidatePersSpellViews(persId);
  return { success: true, added: true };
}

export async function removeSpellFromPers({
  persId,
  spellId,
}: {
  persId: number;
  spellId: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return { success: false, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) {
    return { success: false, error: "Немає доступу до персонажа" };
  }

  await prisma.persSpell.deleteMany({
    where: { persId, spellId },
  });

  revalidatePersSpellViews(persId);
  return { success: true };
}

export async function setSpellPresenceForPers({
  persId,
  spellId,
  present,
}: {
  persId: number;
  spellId: number;
  present: boolean;
}): Promise<{ success: true; present: boolean } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return { success: false, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) {
    return { success: false, error: "Немає доступу до персонажа" };
  }

  const existing = await prisma.persSpell.findUnique({
    where: {
      persId_spellId: {
        persId,
        spellId,
      },
    },
    select: { persSpellId: true },
  });

  if (present) {
    if (!existing) {
      await prisma.persSpell.create({
        data: {
          persId,
          spellId,
          learnedAtLevel: 0,
          origin: SpellOrigin.MANUAL,
          isPrepared: false,
        },
      });
    }
  } else if (existing) {
    await prisma.persSpell.delete({
      where: { persSpellId: existing.persSpellId },
    });
  }

  revalidatePersSpellViews(persId);
  return { success: true, present };
}

export async function setSpellPrepared({
  persId,
  spellId,
  isPrepared,
}: {
  persId: number;
  spellId: number;
  isPrepared: boolean;
}): Promise<{ success: true; isPrepared: boolean } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return { success: false, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) {
    return { success: false, error: "Немає доступу до персонажа" };
  }

  const updated = await prisma.persSpell.update({
    where: {
      persId_spellId: {
        persId,
        spellId,
      },
    },
    data: {
      isPrepared: Boolean(isPrepared),
    },
    select: { isPrepared: true },
  });

  revalidatePersSpellViews(persId);
  return { success: true, isPrepared: updated.isPrepared };
}

export async function setPreparedSpellsForPers({
  persId,
  spellIds,
}: {
  persId: number;
  spellIds: number[];
}): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return { success: false, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) {
    return { success: false, error: "Немає доступу до персонажа" };
  }

  const selected = Array.from(
    new Set(
      (Array.isArray(spellIds) ? spellIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );

  await prisma.$transaction(async (tx) => {
    const persSpellLevels = await tx.persSpell.findMany({
      where: { persId },
      select: {
        spellId: true,
        spell: { select: { level: true } },
      },
    });

    const editableSpellIds = persSpellLevels
      .filter((item) => {
        const level = Number(item?.spell?.level ?? 0);
        return Number.isFinite(level) && level > 0;
      })
      .map((item) => item.spellId);

    if (editableSpellIds.length === 0) return;

    const editableSpellSet = new Set<number>(editableSpellIds);
    const selectedEditable = selected.filter((id) => editableSpellSet.has(id));

    await tx.persSpell.updateMany({
      where: {
        persId,
        spellId: { in: editableSpellIds },
      },
      data: { isPrepared: false },
    });

    if (selectedEditable.length > 0) {
      await tx.persSpell.updateMany({
        where: {
          persId,
          spellId: { in: selectedEditable },
        },
        data: { isPrepared: true },
      });
    }
  });

  revalidatePersSpellViews(persId);
  return { success: true };
}

export async function updateSpellBadgeForPers({
  persId,
  spellId,
  badgeText,
  badgeColor,
  excludeFromPreparedCount,
  excludeFromKnownCount,
}: {
  persId: number;
  spellId: number;
  badgeText?: string | null;
  badgeColor?: string | null;
  excludeFromPreparedCount?: boolean;
  excludeFromKnownCount?: boolean;
}): Promise<
  | {
      success: true;
      badgeText: string | null;
      badgeColor: string | null;
      excludeFromPreparedCount: boolean;
      excludeFromKnownCount: boolean;
    }
  | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return { success: false, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) {
    return { success: false, error: "Немає доступу до персонажа" };
  }

  const nextText = normalizeSpellBadgeText(badgeText);
  const nextColor = normalizeSpellBadgeColor(badgeColor);

  const updated = await prisma.persSpell.update({
    where: {
      persId_spellId: {
        persId,
        spellId,
      },
    },
    data: {
      badgeText: nextText,
      badgeColor: nextText ? nextColor : null,
      ...(typeof excludeFromPreparedCount === "boolean"
        ? { excludeFromPreparedCount: Boolean(excludeFromPreparedCount) }
        : {}),
      ...(typeof excludeFromKnownCount === "boolean"
        ? { excludeFromKnownCount: Boolean(excludeFromKnownCount) }
        : {}),
    },
    select: {
      badgeText: true,
      badgeColor: true,
      excludeFromPreparedCount: true,
      excludeFromKnownCount: true,
    },
  });

  revalidatePersSpellViews(persId);

  return {
    success: true,
    badgeText: updated.badgeText,
    badgeColor: updated.badgeColor,
    excludeFromPreparedCount: updated.excludeFromPreparedCount,
    excludeFromKnownCount: updated.excludeFromKnownCount,
  };
}

export async function getSpellsList() {
  const spells = await prisma.spell.findMany({
    where: { ruleset: ACTIVE_RULESET },
    select: {
      spellId: true,
      name: true,
      engName: true,
      level: true,
      school: true,
    },
    orderBy: [
      { level: 'asc' },
      { name: 'asc' },
    ],
  });
  return spells;
}

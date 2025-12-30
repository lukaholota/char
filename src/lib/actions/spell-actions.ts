'use server';

import { auth } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { SpellOrigin } from '@prisma/client';
import { revalidatePath } from 'next/cache';

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
          },
        })
      )
    );
    
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
        notes,
      },
    });

    revalidatePath(`/character/${persId}`);
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
  spellClasses: { className: string }[];
  spellRaces: { raceName: string | null }[];
};

export async function getSpellForModal(spellIdOrSlug: string): Promise<SpellForModal | null> {
  const trimmed = (spellIdOrSlug ?? "").trim();
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  const byId = Number.isFinite(asNumber) ? Math.trunc(asNumber) : null;

  const spell = await prisma.spell.findFirst({
    where: {
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
      spellClasses: { select: { className: true } },
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

  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: { persId: true, userId: true },
  });

  if (!pers || pers.userId !== user.id) {
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

  if (existing) {
    await prisma.persSpell.delete({
      where: { persSpellId: existing.persSpellId },
    });

    revalidatePath(`/char/${persId}`);
    return { success: true, added: false };
  }

  await prisma.persSpell.create({
    data: {
      persId,
      spellId,
      learnedAtLevel: 0,
      origin: SpellOrigin.MANUAL,
    },
  });

  revalidatePath(`/char/${persId}`);
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

  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: { persId: true, userId: true },
  });

  if (!pers || pers.userId !== user.id) {
    return { success: false, error: "Немає доступу до персонажа" };
  }

  await prisma.persSpell.deleteMany({
    where: { persId, spellId },
  });

  revalidatePath(`/char/${persId}`);
  return { success: true };
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

  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: { persId: true, userId: true },
  });
  if (!pers || pers.userId !== user.id) {
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

  revalidatePath(`/character/${persId}`);
  return { success: true, isPrepared: updated.isPrepared };
}

export async function getSpellsList() {
  const spells = await prisma.spell.findMany({
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

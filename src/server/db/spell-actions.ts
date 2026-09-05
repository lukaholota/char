'use server';

import { auth } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { Ruleset, SpellOrigin } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { canEditPers } from "@/lib/actions/pers";
import { buildSpellSlug, type SpellLink } from "@/lib/spell-link";
import { classTranslations } from "@/lib/refs/translation";

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

    // Р38: заклинання, яке персонаж уже знає з іншого джерела, не лягає другим рядком.
    const newSpellIds = await findUnknownSpellIds(persId, spellIds);

    // Використовуємо transaction, щоб або всі збереглися, або нічого
    await prisma.$transaction(
      newSpellIds.map((spellId) =>
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
    // Р38: «ти вже знаєш це заклинання» — друге джерело не додає його вдруге.
    const isAlreadyKnown = (await findUnknownSpellIds(persId, [spellId])).length === 0;
    if (isAlreadyKnown) return { success: true };

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

// KR27.7: у 2024 підготовлені заклинання рахуються за класом, і лист групує їх бейджем; тому
// заклинання, яке з класів персонажа має рівно один, одразу дістає бейдж цього класу — той самий
// текст, що й у рядку лічильників. Двозначне (клірик і друїд обидва мають Cure Wounds) лишається
// без бейджа: його ставить гравець, як і в 2014.
async function findClassBadgeForSpell(persId: number, spellId: number): Promise<string | null> {
  const [pers, spell] = await Promise.all([
    prisma.pers.findUnique({
      where: { persId },
      select: {
        ruleset: true,
        class: { select: { name: true, spellcastingType: true } },
        multiclasses: { select: { class: { select: { name: true, spellcastingType: true } } } },
      },
    }),
    prisma.spell.findUnique({ where: { spellId }, select: { spellClasses: { select: { className: true } } } }),
  ]);
  if (!pers || !spell || pers.ruleset !== "RULES_2024") return null;

  const spellClassNames = new Set(spell.spellClasses.map((row) => row.className));
  const matching = [pers.class, ...pers.multiclasses.map((entry) => entry.class)]
    .filter((persClass) => persClass.spellcastingType !== "NONE")
    .map((persClass) => classTranslations[persClass.name])
    .filter((label) => spellClassNames.has(label));

  return matching.length === 1 ? matching[0] : null;
}

async function findUnknownSpellIds(persId: number, spellIds: number[]): Promise<number[]> {
  const known = await prisma.persSpell.findMany({
    where: { persId, spellId: { in: spellIds } },
    select: { spellId: true },
  });
  const knownIds = new Set(known.map((row) => row.spellId));

  return spellIds.filter((spellId) => !knownIds.has(spellId));
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
      try {
        await prisma.persSpell.create({
          data: {
            persId,
            spellId,
            learnedAtLevel: 0,
            origin: SpellOrigin.MANUAL,
            isPrepared: false,
            badgeText: await findClassBadgeForSpell(persId, spellId),
          },
        });
      } catch (error) {
        console.error('Failed to set spell presence:', error);
        return { success: false, error: 'Не вдалося зберегти заклинання' };
      }
    }
  } else if (existing) {
    await prisma.persSpell.delete({
      where: { persSpellId: existing.persSpellId },
    });
  }

  revalidatePersSpellViews(persId);
  return { success: true, present };
}

/**
 * Посилання з каталогу → рядок бази (KR25.2). Номер 2014 і в каталозі, і в базі той самий;
 * заклинання 2024 приходить слагом і шукається за `engName + ruleset`, бо номер каталогу 2024 —
 * позиція в масиві, а в базі — автоінкремент.
 */
async function findSpellIdForLink(link: SpellLink): Promise<number | null> {
  if (link.ruleset === "RULES_2014" && /^\d+$/.test(link.spellKey)) return Number(link.spellKey);

  const candidates = await prisma.spell.findMany({
    where: { ruleset: link.ruleset },
    select: { spellId: true, engName: true },
  });
  return candidates.find((spell) => buildSpellSlug(spell.engName) === link.spellKey)?.spellId ?? null;
}

export async function setSpellPresenceForPersByLink({
  persId,
  link,
  present,
}: {
  persId: number;
  link: SpellLink;
  present: boolean;
}): Promise<{ success: true; present: boolean; spellId: number } | { success: false; error: string }> {
  const spellId = await findSpellIdForLink(link);
  if (spellId === null) return { success: false, error: "Заклинання не знайдено" };

  const result = await setSpellPresenceForPers({ persId, spellId, present });
  return result.success ? { ...result, spellId } : result;
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

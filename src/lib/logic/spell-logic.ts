import { prisma } from '@/lib/prisma';
import { SpellOrigin } from '@prisma/client';

/**
 * Отримати всі заклинання персонажа
 */
export async function getCharacterSpells(persId: number) {
  return await prisma.persSpell.findMany({
    where: { persId },
    include: {
      spell: true,
    },
    orderBy: [
      { spell: { level: 'asc' } },
      { spell: { name: 'asc' } },
    ],
  });
}

/**
 * Отримати кількість заклинань для валідації (тільки CLASS origin)
 */
export async function getSpellsCountForValidation(persId: number) {
  return await prisma.persSpell.count({
    where: {
      persId,
      origin: SpellOrigin.CLASS,
    },
  });
}

/**
 * Форматування заклинань для UI
 */
export function formatSpellsForUI(spells: any[]) {
  const byLevel: Record<number, any[]> = {};
  const byOrigin: Record<string, any[]> = {
    CLASS: [],
    RACE: [],
    FEAT: [],
    MANUAL: [],
    ITEM: [],
  };

  for (const ps of spells) {
    const level = ps.spell.level;
    if (!byLevel[level]) byLevel[level] = [];
    byLevel[level].push(ps);

    if (byOrigin[ps.origin]) {
      byOrigin[ps.origin].push(ps);
    }
  }

  return { byLevel, byOrigin };
}

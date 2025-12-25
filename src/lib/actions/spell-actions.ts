'use server';

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

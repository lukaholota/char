'use server';

import { prisma } from '@/lib/prisma';
import { learnClassSpells } from './spell-actions';

interface LevelUpChoice {
  stepType: string;
  [key: string]: any;
}

interface ConfirmLevelUpInput {
  persId: number;
  choices: LevelUpChoice[];
  newLevel: number;
}

export async function createCharacter(data: any) {
    // Placeholder for character creation logic
    // This would normally create the Pers, PersClass, etc.
    console.log("Creating character...", data);
    return { success: true, persId: 1 }; // Mock response
}

export async function confirmLevelUp(input: ConfirmLevelUpInput) {
  const { persId, choices, newLevel } = input;

  console.log(`Processing Level Up for persId: ${persId} to level ${newLevel}`);

  try {
    // 1. Validate choices (omitted for brevity)

    // 2. Process choices
    for (const choice of choices) {
      // ──────────────────────────────────────────────────────────────────────
      // HANDLE: CHOICE_SPELLS
      // ──────────────────────────────────────────────────────────────────────
      if (choice.stepType === 'CHOICE_SPELLS') {
        const spellIds = choice.selectedSpellIds as number[];
        if (spellIds && spellIds.length > 0) {
          await learnClassSpells({
            persId,
            spellIds,
            level: newLevel,
          });
        }
      }
      
      // ──────────────────────────────────────────────────────────────────────
      // HANDLE: SELECT_SUBCLASS
      // ──────────────────────────────────────────────────────────────────────
      if (choice.stepType === 'SELECT_SUBCLASS') {
          await prisma.pers.update({
              where: { persId },
              data: { subclassId: choice.subclassId }
          });
      }

      // Add other handlers here (FEAT, ASI, HP, etc.)
    }

    // 3. Update Character Level
    // Note: In a real app, you might update PersClass level instead/also
    await prisma.pers.update({
      where: { persId },
      data: { level: newLevel },
    });

    return { success: true };
  } catch (error) {
    console.error("Level up failed:", error);
    return { success: false, error: "Level up failed" };
  }
}

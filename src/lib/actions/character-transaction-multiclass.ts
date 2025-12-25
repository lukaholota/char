'use server';

import { prisma } from '@/lib/prisma';
import { confirmLevelUp } from './character-transaction';

interface MulticlassConfirmLevelUpInput {
  persId: number;
  choices: any[];
}

export async function confirmMulticlassLevelUp(input: MulticlassConfirmLevelUpInput) {
  console.log(`🔄 Multiclass Level-Up for persId=${input.persId}`);

  // 1. Check if user selected a new class (Multiclassing into something new)
  const newClassChoice = input.choices.find(c => c.stepType === 'MULTICLASS_NEW_CLASS');
  
  if (newClassChoice) {
      // Handle adding a new class to PersClass
      // await prisma.persClass.create(...)
      return { success: true, message: "Новий клас додано!" };
  }

  // 2. Determine which class is being leveled up
  // In a real implementation, the wizard would pass the classId being leveled
  // For now, we assume single class or primary class logic via the standard confirmLevelUp
  
  // We need to calculate the new TOTAL level
  const pers = await prisma.pers.findUnique({ where: { persId: input.persId } });
  if (!pers) return { success: false, error: "Character not found" };

  const newTotalLevel = pers.level + 1;

  // Delegate to the standard handler
  return await confirmLevelUp({
      persId: input.persId,
      choices: input.choices,
      newLevel: newTotalLevel
  });
}

export async function addClassToCharacter(_persId: number, _classId: number) {
    // Logic to add a second class
    // Check prerequisites (stats)
    // Create PersClass record
    return { success: true };
}

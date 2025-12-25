'use server';

import { prisma } from '@/lib/prisma';
import { ProgressionResolver } from '@/lib/logic/progression-resolver';

export async function getLevelUpSteps(persId: number, classId?: number) {
  console.log(`🔍 Getting Level-Up steps for persId=${persId}`);

  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: { class: true },
  });

  if (!pers) {
    return { error: 'Character not found' };
  }

  // Determine which class to level up
  // If classId is provided (multiclass choice), use it.
  // Otherwise use primary class.
  const targetClassId = classId || pers.classId;
  
  // Determine current level for THAT class
  // TODO: Logic for multiclass level calculation
  const currentClassLevel = pers.level; // Simplified for single class
  const newLevel = currentClassLevel + 1;

  const className = pers.class.name; // Should fetch class name for targetClassId if different

  const steps = await ProgressionResolver.resolveLevelUpSteps(
    persId,
    targetClassId,
    newLevel,
    className,
    { STR: 10, DEX: 10 } // Mock stats, fetch real ones
  );

  return {
    newLevel,
    className,
    steps,
  };
}

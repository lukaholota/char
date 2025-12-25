'use server'

import { prisma } from '@/lib/prisma';
import { FeatureDisplayType, FeatureMechanic } from '@prisma/client';

export type LevelUpFeature = {
  featureId: number;
  name: string;
  description: string;
  displayType: FeatureDisplayType[];
  mechanicType: FeatureMechanic | null;
  mechanicMetadata: unknown;
  // If it's a choice, we populate this
  choiceData?: {
    type: 'SUBCLASS' | 'SPELLS' | 'ASI' | 'SPECIFIC';
    options?: {
      id: number; // subclassId, choiceOptionId, spellId
      name: string;
      description?: string;
      payload?: unknown; // extra data
    }[];
    count?: number; // how many to pick
    source?: string; // for SPECIFIC
  };
  isAutomatic: boolean;
};

export type LevelUpInfo = {
  targetLevel: number;
  classId: number;
  className: string;
  features: LevelUpFeature[];
};

export async function getLevelUpInfo(persId: number, targetLevel: number): Promise<LevelUpInfo | null> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: true,
    }
  });

  if (!pers || !pers.class) return null;

  // Fetch features granted at this level
  const classFeatures = await prisma.classFeature.findMany({
    where: {
      classId: pers.classId,
      levelGranted: targetLevel,
    },
    include: {
      feature: true,
    },
    orderBy: {
      displayOrder: 'asc',
    }
  });

  const features: LevelUpFeature[] = [];

  for (const cf of classFeatures) {
    const f = cf.feature;
    const isAutomatic = cf.mechanicType === FeatureMechanic.PASSIVE || cf.mechanicType === null;
    
    let choiceData: LevelUpFeature['choiceData'] = undefined;

    if (!isAutomatic) {
      if (cf.mechanicType === FeatureMechanic.CHOICE_SUBCLASS) {
        // Fetch available subclasses
        const subclasses = await prisma.subclass.findMany({
          where: { classId: pers.classId },
        });
        choiceData = {
          type: 'SUBCLASS',
          options: subclasses.map(s => ({
            id: s.subclassId,
            name: s.name,
            description: s.description ?? undefined,
          })),
          count: 1,
        };
      } else if (cf.mechanicType === FeatureMechanic.CHOICE_ASI) {
        choiceData = {
          type: 'ASI',
          count: 2, // Usually 2 points
        };
      } else if (cf.mechanicType === FeatureMechanic.CHOICE_SPECIFIC) {
        const meta = cf.mechanicMetadata as unknown as { options_source?: string; pick_count?: number } | null;
        const source = meta?.options_source;
        if (source) {
          const options = await prisma.choiceOption.findMany({
            where: { groupName: source },
          });
          choiceData = {
            type: 'SPECIFIC',
            source,
            count: meta?.pick_count || 1,
            options: options.map(o => ({
              id: o.choiceOptionId,
              name: o.optionName,
              payload: o.prerequisites,
            })),
          };
        }
      }
      // TODO: Handle CHOICE_SPELLS if needed
    }

    features.push({
      featureId: f.featureId,
      name: f.name,
      description: f.description,
      displayType: f.displayType,
      mechanicType: cf.mechanicType,
      mechanicMetadata: cf.mechanicMetadata,
      choiceData,
      isAutomatic,
    });
  }

  return {
    targetLevel,
    classId: pers.classId,
    className: pers.class?.name || '',
    features,
  };
}

export type LevelUpSelections = {
  subclassId?: number;
  asi?: { stat: string; value: number }[]; // e.g. [{stat: 'STR', value: 2}] or [{stat: 'STR', value: 1}, {stat: 'DEX', value: 1}]
  specificChoices?: {
    featureId: number; // The parent feature ID (e.g. Fighting Style)
    choiceOptionId: number;
  }[];
  spellIds?: number[]; // For CHOICE_SPELLS - spell IDs to learn at this level
};

export async function commitLevelUp(persId: number, selections: LevelUpSelections): Promise<{ success: boolean; newLevel?: number; error?: string }> {
  try {
    const pers = await prisma.pers.findUnique({ where: { persId } });
    if (!pers) return { success: false, error: 'Персонаж не знайдено' };

  const nextLevel = pers.level + 1;

  // Start transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update Level
    await tx.pers.update({
      where: { persId },
      data: { level: nextLevel },
    });

    // 2. Fetch features for this level
    const classFeatures = await tx.classFeature.findMany({
      where: {
        classId: pers.classId,
        levelGranted: nextLevel,
      },
      include: { feature: true },
    });

    let currentSubclassId = pers.subclassId;

    for (const cf of classFeatures) {
      // Automatic features
      if (cf.mechanicType === FeatureMechanic.PASSIVE || cf.mechanicType === null) {
        await tx.persFeature.create({
          data: {
            persId,
            featureId: cf.featureId,
          },
        });
      }
      
      // Subclass
      if (cf.mechanicType === FeatureMechanic.CHOICE_SUBCLASS) {
        if (!selections.subclassId) {
          throw new Error('Subclass selection missing');
        }
        await tx.pers.update({
          where: { persId },
          data: { subclassId: selections.subclassId },
        });
        currentSubclassId = selections.subclassId;
      }

      // ASI
      if (cf.mechanicType === FeatureMechanic.CHOICE_ASI) {
        if (!selections.asi || selections.asi.length === 0) {
          throw new Error('ASI selection missing');
        }
        // Apply stats
        const updateData: Record<string, { increment: number }> = {};
        for (const boost of selections.asi) {
          const stat = boost.stat.toLowerCase(); // str, dex...
          // Need to read current value? Or just increment?
          // Prisma update with increment is safer
          updateData[stat] = { increment: boost.value };
        }
        await tx.pers.update({
          where: { persId },
          data: updateData,
        });
        // Also record the ASI feature itself?
        await tx.persFeature.create({
          data: { persId, featureId: cf.featureId },
        });
      }

      // Spells (for casters at certain levels)
      if (cf.mechanicType === FeatureMechanic.CHOICE_SPELLS) {
        if (selections.spellIds && selections.spellIds.length > 0) {
          await tx.persSpell.createMany({
            data: selections.spellIds.map(spellId => ({
              persId,
              spellId,
              learnedAtLevel: nextLevel,
            })),
            skipDuplicates: true,
          });
        }
        // Record the feature that granted spells
        await tx.persFeature.create({
          data: { persId, featureId: cf.featureId },
        });
      }

      // Specific Choices (Fighting Style, etc.)
      if (cf.mechanicType === FeatureMechanic.CHOICE_SPECIFIC) {
        const choice = selections.specificChoices?.find(c => c.featureId === cf.featureId);
        if (!choice) throw new Error(`Choice missing for feature ${cf.feature.name}`);

        // Record the parent feature
        await tx.persFeature.create({
          data: { persId, featureId: cf.featureId },
        });

        // Find the chosen option and its granted feature
        const option = await tx.choiceOption.findUnique({
          where: { choiceOptionId: choice.choiceOptionId },
          include: { features: true }
        });

        if (option && option.features.length > 0) {
          for (const granted of option.features) {
             await tx.persFeature.create({
               data: { persId, featureId: granted.featureId },
             });
          }
        }
      }
    }

    // 3. Apply Subclass Features (if any)
    if (currentSubclassId) {
        const subclassFeatures = await tx.subclassFeature.findMany({
          where: {
            subclassId: currentSubclassId,
            levelGranted: nextLevel,
          },
          include: { feature: true },
        });

        for (const scf of subclassFeatures) {
           // Check if already added
           const exists = await tx.persFeature.findUnique({
             where: {
               persId_featureId: {
                 persId,
                 featureId: scf.featureId
               }
             }
           });
           if (!exists) {
             await tx.persFeature.create({
               data: {
                 persId,
                 featureId: scf.featureId,
               }
             });
           }
        }
    }
  });
  
  return { success: true, newLevel: nextLevel };
  } catch (error) {
    console.error('Level-up error:', error);
    const message = error instanceof Error ? error.message : 'Помилка збереження. Спробуйте ще раз.';
    return { success: false, error: message };
  }
}

export type LevelUpChoicesInput = {
  persId: number;
  targetLevel: number;
  choices: {
    featureId: number;
    mechanicType: FeatureMechanic;
    subclassId?: number;
    abilityIncreases?: { ability: string; amount: number }[];
    spellIds?: number[];
    choiceOptionIds?: number[];
  }[];
};

export async function saveLevelUpChoices(input: LevelUpChoicesInput): Promise<{ success: boolean; error?: string; newLevel?: number }> {
  const pers = await prisma.pers.findUnique({
    where: { persId: input.persId },
    select: { level: true },
  });

  if (!pers) return { success: false, error: "Персонаж не знайдено" };
  if (pers.level !== input.targetLevel - 1) {
    return { success: false, error: `Персонаж має бути ${input.targetLevel - 1} рівня` };
  }

  const selections: LevelUpSelections = {};

  for (const c of input.choices) {
    if (c.mechanicType === FeatureMechanic.CHOICE_SUBCLASS && c.subclassId) {
      selections.subclassId = c.subclassId;
    }
    if (c.mechanicType === FeatureMechanic.CHOICE_ASI && c.abilityIncreases) {
      selections.asi = c.abilityIncreases.map((inc) => ({ stat: inc.ability, value: inc.amount }));
    }
    if (c.mechanicType === FeatureMechanic.CHOICE_SPELLS && c.spellIds) {
      selections.spellIds = c.spellIds;
    }
    if (c.mechanicType === FeatureMechanic.CHOICE_SPECIFIC && c.choiceOptionIds && c.choiceOptionIds.length > 0) {
      selections.specificChoices = (selections.specificChoices ?? []).concat(
        c.choiceOptionIds.map((choiceOptionId) => ({
          featureId: c.featureId,
          choiceOptionId,
        }))
      );
    }
  }

  const result = await commitLevelUp(input.persId, selections);
  return result.success
    ? { success: true, newLevel: result.newLevel }
    : { success: false, error: result.error ?? "Помилка збереження" };
}

"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Feat } from "@prisma/client";

export async function getLevelUpInfo(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: {
        include: {
          classChoiceOptions: {
            include: {
              choiceOption: {
                include: {
                  features: { include: { feature: true } }
                }
              }
            }
          },
          features: {
            include: { feature: true }
          },
          subclasses: {
            include: {
                features: { include: { feature: true } },
                expandedSpells: true,
                subclassChoiceOptions: {
                  include: {
                    choiceOption: {
                      include: {
                        features: {
                          include: {
                            feature: true
                          }
                        }
                      }
                    }
                  }
                }
            }
          },
          startingEquipmentOption: {
            include: {
              weapon: true,
              armor: true,
              equipmentPack: true
            }
          },
          classOptionalFeatures: {
            include: {
              feature: true,
              replacesFeatures: {
                include: {
                  replacedFeature: true
                }
              }
            }
          }
        }
      },
      subclass: {
        include: {
            subclassChoiceOptions: {
                include: {
                    choiceOption: {
                        include: {
                            features: { include: { feature: true } }
                        }
                    }
                }
            },
            features: {
                include: { feature: true }
            }
        }
      },
      race: true,
      subrace: true,
    }
  });

  if (!pers) return { error: "Character not found" };

  const nextLevel = pers.level + 1;
  if (nextLevel > 20) return { error: "Max level reached" };

  // 1. Check for Subclass Selection
  const needsSubclass = !pers.subclassId && pers.class.subclassLevel === nextLevel;
  
  // 2. Check for ASI/Feat
  const isASILevel = pers.class.abilityScoreUpLevels.includes(nextLevel);

  // 3. Get Class Features for next level
  const newClassFeatures = pers.class.features.filter(f => f.levelGranted === nextLevel);
  
  // 4. Get Class Choices for next level
  const newClassChoices = pers.class.classChoiceOptions.filter(opt => opt.levelsGranted.includes(nextLevel));
  
  // Group Class Choices
  const classChoiceGroups = newClassChoices.reduce((acc, opt) => {
      const group = opt.choiceOption.groupName;
      if (!acc[group]) acc[group] = [];
      acc[group].push(opt);
      return acc;
  }, {} as Record<string, typeof newClassChoices>);

  // 5. Get Subclass Features for next level (if subclass exists)
  const newSubclassFeatures = pers.subclass?.features.filter(f => f.levelGranted === nextLevel) || [];

  // 6. Get Subclass Choices for next level
  const newSubclassChoices = pers.subclass?.subclassChoiceOptions.filter(opt => opt.levelsGranted.includes(nextLevel)) || [];
  
   // Group Subclass Choices
  const subclassChoiceGroups = newSubclassChoices.reduce((acc, opt) => {
      const group = opt.choiceOption.groupName;
      if (!acc[group]) acc[group] = [];
      acc[group].push(opt);
      return acc;
  }, {} as Record<string, typeof newSubclassChoices>);

  let feats: Feat[] = [];
  if (isASILevel) {
      feats = await prisma.feat.findMany({ orderBy: { name: 'asc' } });
  }

  return {
    pers,
    nextLevel,
    needsSubclass,
    isASILevel,
    newClassFeatures,
    classChoiceGroups,
    newSubclassFeatures,
    subclassChoiceGroups,
    availableSubclasses: needsSubclass ? pers.class.subclasses : [],
    feats,
  };
}

export async function levelUpCharacter(persId: number, data: any) {
    const session = await auth();
    if (!session?.user?.email) return { error: "Unauthorized" };

    try {
        const info = await getLevelUpInfo(persId);
        if ('error' in info) return info;
        
        const { pers, nextLevel, newClassFeatures, newSubclassFeatures } = info;
        
        // 1. Handle Stats (ASI)
        const newStats = {
            str: pers.str,
            dex: pers.dex,
            con: pers.con,
            int: pers.int,
            wis: pers.wis,
            cha: pers.cha,
        };

        if (data.customAsi && Array.isArray(data.customAsi)) {
            data.customAsi.forEach((asi: { ability: string, value: string }) => {
                const key = asi.ability.toLowerCase() as keyof typeof newStats;
                if (newStats[key] !== undefined) {
                    newStats[key] += Number(asi.value);
                }
            });
        }

        // 2. Handle Feat
        const featId = data.featId ? Number(data.featId) : undefined;
        let featFeatures: number[] = [];
        if (featId) {
            const feat = await prisma.feat.findUnique({ 
                where: { featId },
                include: { grantsFeature: true }
            });
            if (feat) {
                // Add feat features
                featFeatures = feat.grantsFeature.map(f => f.featureId);
                
                // Feat might also grant ASI (e.g. half-feats).
                if (feat.grantedASI) {
                     const featASI = feat.grantedASI as any;
                     if (featASI && featASI.basic && featASI.basic.simple) {
                         Object.entries(featASI.basic.simple).forEach(([ability, bonus]) => {
                            const key = ability.toLowerCase() as keyof typeof newStats;
                            if (newStats[key] !== undefined) newStats[key] += Number(bonus);
                         });
                     }
                }
            }
        }

        // 3. Calculate HP
        const conMod = Math.floor((newStats.con - 10) / 2);
        const hpIncrease = Math.floor(pers.class.hitDie / 2) + 1 + conMod;
        const newMaxHp = pers.maxHp + hpIncrease;
        const newCurrentHp = pers.currentHp + hpIncrease;

        // 4. Collect Features to Add
        const featuresToAdd = new Set<number>();
        
        // Class Features
        newClassFeatures.forEach(f => featuresToAdd.add(f.featureId));
        
        // Subclass Features
        // If we just picked a subclass, we get ALL features up to this level?
        // Or just the ones for this level?
        // Usually when you pick a subclass at level 3, you get level 3 features.
        // If `data.subclassId` is set, we are picking it now.
        let subclassId = pers.subclassId;
        if (data.subclassId) {
            subclassId = Number(data.subclassId);
            // Fetch subclass features for this level
            const scFeatures = await prisma.subclassFeature.findMany({
                where: { subclassId, levelGranted: nextLevel },
                select: { featureId: true }
            });
            scFeatures.forEach(f => featuresToAdd.add(f.featureId));
        } else if (pers.subclassId) {
            // Existing subclass, just new features
            newSubclassFeatures.forEach(f => featuresToAdd.add(f.featureId));
        }

        // Feat Features
        featFeatures.forEach(f => featuresToAdd.add(f));

        // Choice Features
        const choiceOptionIds: number[] = [];
        
        // Helper to process choices
        const processChoices = async (selections: Record<string, number>) => {
            if (!selections) return;
            for (const optionId of Object.values(selections)) {
                choiceOptionIds.push(optionId);
                const choiceFeatures = await prisma.choiceOptionFeature.findMany({
                    where: { choiceOptionId: optionId },
                    select: { featureId: true }
                });
                choiceFeatures.forEach(f => featuresToAdd.add(f.featureId));
            }
        };

        await processChoices(data.classChoiceSelections);
        await processChoices(data.subclassChoiceSelections);

        // 5. Update DB
        await prisma.$transaction(async (tx) => {
            // Update Pers
            await tx.pers.update({
                where: { persId },
                data: {
                    level: nextLevel,
                    maxHp: newMaxHp,
                    currentHp: newCurrentHp,
                    subclassId: subclassId,
                    ...newStats,
                    choiceOptions: {
                        connect: choiceOptionIds.map(id => ({ choiceOptionId: id }))
                    },
                    feats: featId ? {
                        create: { featId }
                    } : undefined
                }
            });

            // Add Features
            if (featuresToAdd.size > 0) {
                await tx.persFeature.createMany({
                    data: Array.from(featuresToAdd).map(fid => ({
                        persId,
                        featureId: fid
                    })),
                    skipDuplicates: true
                });
            }
        });
        
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: "Failed to level up" };
    }
}

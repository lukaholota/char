"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function generateShareToken(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  try {
    const pers = await prisma.pers.findUnique({
      where: { persId },
      select: { userId: true }
    });

    if (!pers) return { error: "Character not found" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (pers.userId !== user?.id) return { error: "Forbidden" };

    const token = randomBytes(16).toString("hex");

    await prisma.pers.update({
      where: { persId },
      data: { shareToken: token }
    });

    return { success: true, token };
  } catch (error) {
    console.error("Token generation failed:", error);
    return { error: "Failed to generate share link" };
  }
}

export async function getPersByShareToken(token: string) {
  const pers = await prisma.pers.findUnique({
    where: { shareToken: token },
    include: {
        race: {
            include: {
                traits: {
                    include: {
                        feature: true
                    }
                }
            }
        },
        subrace: {
            include: {
                traits: {
                    include: {
                        feature: true
                    }
                }
            }
        },
        class: {
            include: {
                features: {
                    include: {
                        feature: true
                    }
                }
            }
        },
        subclass: {
            include: {
                features: {
                    include: {
                        feature: true
                    }
                }
            }
        },
        multiclasses: {
            include: {
                class: {
                    include: {
                        features: {
                            include: {
                                feature: true,
                            },
                        },
                    },
                },
                subclass: {
                    include: {
                        features: {
                            include: {
                                feature: true,
                            },
                        },
                    },
                },
            },
        },
        background: true,
        skills: true,
        feats: { 
            include: { 
                feat: true,
                choices: {
                    include: {
                        choiceOption: true,
                    }
                }
            } 
        },
        raceVariants: {
            include: {
                traits: {
                    include: {
                        feature: true,
                    },
                },
            },
        },
        features: { include: { feature: true } },
        choiceOptions: true,
        raceChoiceOptions: true,
        persSpells: {
            include: {
                spell: true,
            },
            orderBy: [
                { spell: { level: "asc" } },
                { spell: { name: "asc" } },
            ],
        },
        weapons: { include: { weapon: true } },
        armors: { include: { armor: true } },
    }
  });

  return pers;
}

export async function copyPersByToken(token: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Авторизуйтесь, щоб скопіювати персонажа" };

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Користувача не знайдено" };

    const sourcePers = await prisma.pers.findUnique({
      where: { shareToken: token },
      include: {
        skills: true,
        persSpells: true,
        features: true,
        feats: { include: { choices: true } },
        weapons: true,
        armors: true,
        multiclasses: true,
        magicItems: true,
        raceVariants: true,
        raceChoiceOptions: true,
        choiceOptions: true,
        classOptionalFeatures: true,
        spells: true,
      }
    });

    if (!sourcePers) return { error: "Персонажа не знайдено за цим токеном" };

    const newPersId = await prisma.$transaction(async (tx) => {
      const newPers = await tx.pers.create({
        data: {
          userId: user.id,
          name: `${sourcePers.name} (Копія)`,
          level: sourcePers.level,
          currentSpellSlots: sourcePers.currentSpellSlots,
          currentPactSlots: sourcePers.currentPactSlots,
          classId: sourcePers.classId,
          subclassId: sourcePers.subclassId,
          backgroundId: sourcePers.backgroundId,
          raceId: sourcePers.raceId,
          subraceId: sourcePers.subraceId,
          currentHp: sourcePers.currentHp,
          maxHp: sourcePers.maxHp,
          tempHp: sourcePers.tempHp,
          deathSaveSuccesses: sourcePers.deathSaveSuccesses,
          deathSaveFailures: sourcePers.deathSaveFailures,
          isDead: sourcePers.isDead,
          raceCustom: sourcePers.raceCustom,
          classCustom: sourcePers.classCustom,
          alignment: sourcePers.alignment,
          xp: sourcePers.xp,
          customBackground: sourcePers.customBackground,
          customProficiencies: sourcePers.customProficiencies,
          customFeatures: sourcePers.customFeatures,
          customLanguagesKnown: sourcePers.customLanguagesKnown,
          customEquipment: sourcePers.customEquipment,
          personalityTraits: sourcePers.personalityTraits,
          ideals: sourcePers.ideals,
          bonds: sourcePers.bonds,
          flaws: sourcePers.flaws,
          backstory: sourcePers.backstory,
          notes: sourcePers.notes,
          str: sourcePers.str,
          dex: sourcePers.dex,
          con: sourcePers.con,
          int: sourcePers.int,
          wis: sourcePers.wis,
          cha: sourcePers.cha,
          cp: sourcePers.cp,
          ep: sourcePers.ep,
          sp: sourcePers.sp,
          gp: sourcePers.gp,
          pp: sourcePers.pp,
          additionalSaveProficiencies: sourcePers.additionalSaveProficiencies,
          miscSaveBonuses: sourcePers.miscSaveBonuses || undefined,
          wearsShield: sourcePers.wearsShield,
          additionalShieldBonus: sourcePers.additionalShieldBonus,
          armorBonus: sourcePers.armorBonus,
          wearsNaturalArmor: sourcePers.wearsNaturalArmor,
          statBonuses: sourcePers.statBonuses || undefined,
          statModifierBonuses: sourcePers.statModifierBonuses || undefined,
          saveBonuses: sourcePers.saveBonuses || undefined,
          skillBonuses: sourcePers.skillBonuses || undefined,
          hpBonuses: sourcePers.hpBonuses || undefined,
          acBonuses: sourcePers.acBonuses || undefined,
          speedBonuses: sourcePers.speedBonuses || undefined,
          proficiencyBonuses: sourcePers.proficiencyBonuses || undefined,
          initiativeBonuses: sourcePers.initiativeBonuses || undefined,
          spellAttackBonuses: sourcePers.spellAttackBonuses || undefined,
          spellDCBonuses: sourcePers.spellDCBonuses || undefined,
          currentHitDice: sourcePers.currentHitDice || undefined,
          usedHitDice: sourcePers.usedHitDice || undefined,
          
          isSnapshot: false,
          
          raceVariants: { connect: sourcePers.raceVariants.map(rv => ({ raceVariantId: rv.raceVariantId })) },
          raceChoiceOptions: { connect: sourcePers.raceChoiceOptions.map(rco => ({ optionId: rco.optionId })) },
          choiceOptions: { connect: sourcePers.choiceOptions.map(co => ({ choiceOptionId: co.choiceOptionId })) },
          classOptionalFeatures: { connect: sourcePers.classOptionalFeatures.map(cof => ({ optionalFeatureId: cof.optionalFeatureId })) },
          spells: { connect: sourcePers.spells.map(s => ({ spellId: s.spellId })) },
        }
      });

      if (sourcePers.skills.length > 0) {
        await tx.persSkill.createMany({
          data: sourcePers.skills.map(s => ({
            persId: newPers.persId,
            skillId: s.skillId,
            name: s.name,
            proficiencyType: s.proficiencyType,
            customModifier: s.customModifier,
          }))
        });
      }

      if (sourcePers.persSpells.length > 0) {
        await tx.persSpell.createMany({
          data: sourcePers.persSpells.map(ps => ({
            persId: newPers.persId,
            spellId: ps.spellId,
            learnedAtLevel: ps.learnedAtLevel,
            isPrepared: ps.isPrepared,
            origin: ps.origin,
            sourceId: ps.sourceId,
            sourceName: ps.sourceName,
            notes: ps.notes,
          }))
        });
      }

      if (sourcePers.features.length > 0) {
        await tx.persFeature.createMany({
          data: sourcePers.features.map(f => ({
            persId: newPers.persId,
            featureId: f.featureId,
            usesRemaining: f.usesRemaining,
          }))
        });
      }

      for (const pf of sourcePers.feats) {
        const newPersFeat = await tx.persFeat.create({
          data: { persId: newPers.persId, featId: pf.featId }
        });
        if (pf.choices.length > 0) {
          await tx.persFeatChoice.createMany({
            data: pf.choices.map(c => ({
              persFeatId: newPersFeat.persFeatId,
              choiceOptionId: c.choiceOptionId,
            }))
          });
        }
      }

      if (sourcePers.weapons.length > 0) {
        await tx.persWeapon.createMany({
          data: sourcePers.weapons.map(w => ({
            persId: newPers.persId,
            weaponId: w.weaponId,
            overrideName: w.overrideName,
            customDamageDice: w.customDamageDice,
            customDamageAbility: w.customDamageAbility,
            customDamageBonus: w.customDamageBonus as any,
            isProficient: w.isProficient,
          }))
        });
      }

      if (sourcePers.armors.length > 0) {
        await tx.persArmor.createMany({
          data: sourcePers.armors.map(a => ({
            persId: newPers.persId,
            armorId: a.armorId,
            overrideBaseAC: a.overrideBaseAC,
            isProficient: a.isProficient,
            equipped: a.equipped,
            miscACBonus: a.miscACBonus,
          }))
        });
      }

      if (sourcePers.multiclasses.length > 0) {
        await tx.persMulticlass.createMany({
          data: sourcePers.multiclasses.map(m => ({
            persId: newPers.persId,
            classId: m.classId,
            classLevel: m.classLevel,
            subclassId: m.subclassId,
          }))
        });
      }

      if (sourcePers.magicItems.length > 0) {
        await tx.persMagicItem.createMany({
          data: sourcePers.magicItems.map(mi => ({
            persId: newPers.persId,
            magicItemId: mi.magicItemId,
          }))
        });
      }

      return newPers.persId;
    });

    return { success: true, persId: newPersId };
  } catch (error) {
    console.error("Copy char failed:", error);
    return { error: "Помилка при копіюванні персонажа" };
  }
}

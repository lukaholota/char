"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export async function createCharacterSnapshot(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  try {
    const pers = await prisma.pers.findUnique({
      where: { persId },
      include: {
        skills: true,
        persSpells: true,
        features: true,
        feats: {
          include: {
            choices: true,
          }
        },
        weapons: true,
        armors: true,
        multiclasses: true,
        magicItems: true,
        // Implicit M:N relations
        raceVariants: true,
        raceChoiceOptions: true,
        choiceOptions: true,
        classOptionalFeatures: true,
        spells: true,
      }
    });

    if (!pers) return { error: "Character not found" };

    // Deep copy logic
    const snapshot = await prisma.$transaction(async (tx) => {
      // 1. Create the base character record
      const newPers = await tx.pers.create({
        data: {
          userId: pers.userId,
          name: `${pers.name} (Рівень ${pers.level})`,
          level: pers.level,
          currentSpellSlots: pers.currentSpellSlots,
          currentPactSlots: pers.currentPactSlots,
          classId: pers.classId,
          subclassId: pers.subclassId,
          backgroundId: pers.backgroundId,
          raceId: pers.raceId,
          subraceId: pers.subraceId,
          currentHp: pers.currentHp,
          maxHp: pers.maxHp,
          tempHp: pers.tempHp,
          deathSaveSuccesses: pers.deathSaveSuccesses,
          deathSaveFailures: pers.deathSaveFailures,
          isDead: pers.isDead,
          raceCustom: pers.raceCustom,
          classCustom: pers.classCustom,
          alignment: pers.alignment,
          xp: pers.xp,
          customBackground: pers.customBackground,
          customProficiencies: pers.customProficiencies,
          customFeatures: pers.customFeatures,
          customLanguagesKnown: pers.customLanguagesKnown,
          customEquipment: pers.customEquipment,
          personalityTraits: pers.personalityTraits,
          ideals: pers.ideals,
          bonds: pers.bonds,
          flaws: pers.flaws,
          backstory: pers.backstory,
          notes: pers.notes,
          str: pers.str,
          dex: pers.dex,
          con: pers.con,
          int: pers.int,
          wis: pers.wis,
          cha: pers.cha,
          cp: pers.cp,
          ep: pers.ep,
          sp: pers.sp,
          gp: pers.gp,
          pp: pers.pp,
          additionalSaveProficiencies: pers.additionalSaveProficiencies,
          miscSaveBonuses: pers.miscSaveBonuses || undefined,
          wearsShield: pers.wearsShield,
          additionalShieldBonus: pers.additionalShieldBonus,
          armorBonus: pers.armorBonus,
          wearsNaturalArmor: pers.wearsNaturalArmor,
          statBonuses: pers.statBonuses || undefined,
          statModifierBonuses: pers.statModifierBonuses || undefined,
          saveBonuses: pers.saveBonuses || undefined,
          skillBonuses: pers.skillBonuses || undefined,
          hpBonuses: pers.hpBonuses || undefined,
          acBonuses: pers.acBonuses || undefined,
          speedBonuses: pers.speedBonuses || undefined,
          proficiencyBonuses: pers.proficiencyBonuses || undefined,
          initiativeBonuses: pers.initiativeBonuses || undefined,
          spellAttackBonuses: pers.spellAttackBonuses || undefined,
          spellDCBonuses: pers.spellDCBonuses || undefined,
          currentHitDice: pers.currentHitDice || undefined,
          usedHitDice: pers.usedHitDice || undefined,
          
          // Snapshot specific
          parentPersId: pers.persId,
          isSnapshot: true,
          snapshotLevel: pers.level,
          isActive: false,

          // Connect M:N relations
          raceVariants: { connect: pers.raceVariants.map(rv => ({ raceVariantId: rv.raceVariantId })) },
          raceChoiceOptions: { connect: pers.raceChoiceOptions.map(rco => ({ optionId: rco.optionId })) },
          choiceOptions: { connect: pers.choiceOptions.map(co => ({ choiceOptionId: co.choiceOptionId })) },
          classOptionalFeatures: { connect: pers.classOptionalFeatures.map(cof => ({ optionalFeatureId: cof.optionalFeatureId })) },
          spells: { connect: pers.spells.map(s => ({ spellId: s.spellId })) },
        }
      });

      // 2. Create related records (Deep Clone)
      
      // Skills
      if (pers.skills.length > 0) {
        await tx.persSkill.createMany({
          data: pers.skills.map(s => ({
            persId: newPers.persId,
            skillId: s.skillId,
            name: s.name,
            proficiencyType: s.proficiencyType,
            customModifier: s.customModifier,
          }))
        });
      }

      // PersSpells (for prepared status, origin, etc.)
      if (pers.persSpells.length > 0) {
        await tx.persSpell.createMany({
          data: pers.persSpells.map(ps => ({
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

      // Features
      if (pers.features.length > 0) {
        await tx.persFeature.createMany({
          data: pers.features.map(f => ({
            persId: newPers.persId,
            featureId: f.featureId,
            usesRemaining: f.usesRemaining,
          }))
        });
      }

      // Feats
      for (const pf of pers.feats) {
        const newPersFeat = await tx.persFeat.create({
          data: {
            persId: newPers.persId,
            featId: pf.featId,
          }
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

      // Weapons
      if (pers.weapons.length > 0) {
        await tx.persWeapon.createMany({
          data: pers.weapons.map(w => ({
            persId: newPers.persId,
            weaponId: w.weaponId,
            overrideName: w.overrideName,
            customDamageDice: w.customDamageDice,
            customDamageAbility: w.customDamageAbility,
            customDamageBonus: w.customDamageBonus === null ? Prisma.DbNull : w.customDamageBonus,
            isProficient: w.isProficient,
          }))
        });
      }

      // Armors
      if (pers.armors.length > 0) {
        await tx.persArmor.createMany({
          data: pers.armors.map(a => ({
            persId: newPers.persId,
            armorId: a.armorId,
            overrideBaseAC: a.overrideBaseAC,
            isProficient: a.isProficient,
            equipped: a.equipped,
            miscACBonus: a.miscACBonus,
          }))
        });
      }

      // Multiclasses
      if (pers.multiclasses.length > 0) {
        await tx.persMulticlass.createMany({
          data: pers.multiclasses.map(m => ({
            persId: newPers.persId,
            classId: m.classId,
            classLevel: m.classLevel,
            subclassId: m.subclassId,
          }))
        });
      }

      // Magic Items
      if (pers.magicItems.length > 0) {
        await tx.persMagicItem.createMany({
          data: pers.magicItems.map(mi => ({
            persId: newPers.persId,
            magicItemId: mi.magicItemId,
          }))
        });
      }

      return newPers;
    });

    return { success: true, snapshotId: snapshot.persId };
  } catch (error) {
    console.error("Snapshot creation failed:", error);
    return { error: "Failed to create character snapshot" };
  }
}

export async function getSnapshots(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return [];

  return prisma.pers.findMany({
    where: { 
      parentPersId: persId,
      isSnapshot: true 
    },
    orderBy: { snapshotLevel: 'desc' },
    select: {
      persId: true,
      name: true,
      level: true,
      snapshotLevel: true,
      createdAt: true,
      isActive: true,
    }
  });
}

export async function activateSnapshot(snapshotId: number) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  try {
    const snapshot = await prisma.pers.findUnique({
      where: { persId: snapshotId },
      select: { userId: true, parentPersId: true }
    });

    if (!snapshot || !snapshot.parentPersId) return { error: "Snapshot not found" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (snapshot.userId !== user?.id) return { error: "Forbidden" };

    await prisma.pers.update({
      where: { persId: snapshotId },
      data: { isActive: true }
    });

    revalidatePath("/pers/home");
    return { success: true };
  } catch (error) {
    console.error("Snapshot activation failed:", error);
    return { error: "Failed to activate snapshot" };
  }
}

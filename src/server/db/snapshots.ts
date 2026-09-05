import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SnapshotListEntry = {
  persId: number;
  name: string;
  level: number;
  snapshotLevel: number | null;
  createdAt: Date;
  isActive: boolean;
};

export type SnapshotActivationTarget = {
  userId: number;
  parentPersId: number | null;
};

export async function createPersSnapshot(persId: number): Promise<number | null> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: {
      skills: true,
      persSpells: true,
      features: true,
      feats: { include: { choices: true } },
      weapons: true,
      pers_weapon_mastery: true,
      armors: true,
      multiclasses: true,
      magicItems: true,
      raceVariants: true,
      raceChoiceOptions: true,
      choiceOptions: true,
      classOptionalFeatures: true,
      spells: true,
    },
  });

  if (!pers) return null;

  const snapshot = await prisma.$transaction(async (tx) => {
    const data = {
      userId: pers.userId,
      name: `${pers.name} (Рівень ${pers.level})`,
      /// Знімок стає видимим персонажем, щойно його активують, тож редакція має їхати з ним:
      /// інакше активований знімок персонажа 2024 читається за правилами 2014.
      ruleset: pers.ruleset,
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
      overrideBaseAC: pers.overrideBaseAC ?? undefined,
      raceStaticAcBonus: pers.raceStaticAcBonus ?? undefined,
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
      parentPersId: pers.persId,
      isSnapshot: true,
      snapshotLevel: pers.level,
      isActive: false,
      raceVariants: { connect: pers.raceVariants.map((variant) => ({ raceVariantId: variant.raceVariantId })) },
      raceChoiceOptions: { connect: pers.raceChoiceOptions.map((option) => ({ optionId: option.optionId })) },
      choiceOptions: { connect: pers.choiceOptions.map((option) => ({ choiceOptionId: option.choiceOptionId })) },
      classOptionalFeatures: {
        connect: pers.classOptionalFeatures.map((feature) => ({ optionalFeatureId: feature.optionalFeatureId })),
      },
      spells: { connect: pers.spells.map((spell) => ({ spellId: spell.spellId })) },
    };

    const newPers = await tx.pers.create({ data });

    if (pers.skills.length > 0) {
      await tx.persSkill.createMany({
        data: pers.skills.map((skill) => ({
          persId: newPers.persId,
          skillId: skill.skillId,
          name: skill.name,
          proficiencyType: skill.proficiencyType,
          customModifier: skill.customModifier,
        })),
      });
    }

    if (pers.persSpells.length > 0) {
      await tx.persSpell.createMany({
        data: pers.persSpells.map((spell) => ({
          persId: newPers.persId,
          spellId: spell.spellId,
          learnedAtLevel: spell.learnedAtLevel,
          isPrepared: spell.isPrepared,
          excludeFromPreparedCount: spell.excludeFromPreparedCount,
          excludeFromKnownCount: spell.excludeFromKnownCount,
          badgeText: spell.badgeText,
          badgeColor: spell.badgeColor,
          origin: spell.origin,
          sourceId: spell.sourceId,
          sourceName: spell.sourceName,
          notes: spell.notes,
        })),
      });
    }

    if (pers.features.length > 0) {
      await tx.persFeature.createMany({
        data: pers.features.map((feature) => ({
          persId: newPers.persId,
          featureId: feature.featureId,
          usesRemaining: feature.usesRemaining,
        })),
      });
    }

    for (const persFeat of pers.feats) {
      const newPersFeat = await tx.persFeat.create({
        data: { persId: newPers.persId, featId: persFeat.featId },
      });
      if (persFeat.choices.length > 0) {
        await tx.persFeatChoice.createMany({
          data: persFeat.choices.map((choice) => ({
            persFeatId: newPersFeat.persFeatId,
            choiceOptionId: choice.choiceOptionId,
          })),
        });
      }
    }

    if (pers.weapons.length > 0) {
      await tx.persWeapon.createMany({
        data: pers.weapons.map((weapon) => ({
          persId: newPers.persId,
          weaponId: weapon.weaponId,
          overrideName: weapon.overrideName,
          customDamageDice: weapon.customDamageDice,
          customDamageAbility: weapon.customDamageAbility,
          customDamageBonus: weapon.customDamageBonus === null ? Prisma.DbNull : weapon.customDamageBonus,
          isProficient: weapon.isProficient,
        })),
      });
    }

    if (pers.pers_weapon_mastery.length > 0) {
      await tx.pers_weapon_mastery.createMany({
        data: pers.pers_weapon_mastery.map((mastery) => ({
          pers_id: newPers.persId,
          weapon_id: mastery.weapon_id,
        })),
      });
    }

    if (pers.armors.length > 0) {
      await tx.persArmor.createMany({
        data: pers.armors.map((armor) => ({
          persId: newPers.persId,
          armorId: armor.armorId,
          overrideName: armor.overrideName,
          overrideBaseAC: armor.overrideBaseAC,
          abilityBonuses: armor.abilityBonuses ?? [],
          abilityBonusType: armor.abilityBonusType ?? undefined,
          isProficient: armor.isProficient,
          equipped: armor.equipped,
          miscACBonus: armor.miscACBonus,
        })),
      });
    }

    if (pers.multiclasses.length > 0) {
      await tx.persMulticlass.createMany({
        data: pers.multiclasses.map((multiclass) => ({
          persId: newPers.persId,
          classId: multiclass.classId,
          classLevel: multiclass.classLevel,
          subclassId: multiclass.subclassId,
        })),
      });
    }

    if (pers.magicItems.length > 0) {
      await tx.persMagicItem.createMany({
        data: pers.magicItems.map((magicItem) => ({
          persId: newPers.persId,
          magicItemId: magicItem.magicItemId,
        })),
      });
    }

    return newPers.persId;
  });

  return snapshot;
}

export async function listPersSnapshots(persId: number): Promise<SnapshotListEntry[]> {
  return prisma.pers.findMany({
    where: { parentPersId: persId, isSnapshot: true },
    orderBy: { snapshotLevel: "desc" },
    select: { persId: true, name: true, level: true, snapshotLevel: true, createdAt: true, isActive: true },
  });
}

export async function findSnapshotActivationTarget(snapshotId: number): Promise<SnapshotActivationTarget | null> {
  return prisma.pers.findUnique({
    where: { persId: snapshotId },
    select: { userId: true, parentPersId: true },
  });
}

export async function activatePersSnapshot(snapshotId: number): Promise<void> {
  await prisma.pers.update({ where: { persId: snapshotId }, data: { isActive: true } });
}

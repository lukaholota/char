import { Prisma } from "@prisma/client";

export const PERS_DUPLICATION_INCLUDE = {
  skills: true,
  persSpells: true,
  homebrewSpells: true,
  features: true,
  feats: {
    include: {
      choices: true,
    }
  },
  weapons: true,
  pers_weapon_mastery: true,
  armors: true,
  multiclasses: { include: { class: true, subclass: true } },
  magicItems: { include: { magicItem: true } },
  persInfusions: true,
  resourcePools: true,
  wildshapes: true,
  effects: true,
  bastion: { include: { facilities: true, turns: true } },
  race: true,
  class: true,
  subclass: true,
  background: true,
  raceVariants: true,
  raceChoiceOptions: true,
  choiceOptions: true,
  classOptionalFeatures: true,
  spells: true,
  featureDescriptions: true,
} satisfies Prisma.PersInclude;

export type PersCloneSource = Prisma.PersGetPayload<{
  include: typeof PERS_DUPLICATION_INCLUDE;
}>;

export type PersCloneTarget = {
  userId: number;
  name: string;
  folderId: number | null;
  isPinned: boolean;
  snapshotOf: { parentPersId: number; level: number } | null;
};

type TransactionClient = Prisma.TransactionClient;

type CopiedRowIds = {
  weapons: Map<number, number>;
  armors: Map<number, number>;
  magicItems: Map<number, number>;
};

export function buildCopyTarget(pers: PersCloneSource, changes: Partial<PersCloneTarget> = {}): PersCloneTarget {
  return {
    userId: pers.userId,
    name: `${pers.name} (Копія)`,
    folderId: pers.folderId,
    isPinned: pers.isPinned,
    snapshotOf: null,
    ...changes,
  };
}

export async function clonePersWithRelations(tx: TransactionClient, pers: PersCloneSource, target: PersCloneTarget) {
  const newPers = await tx.pers.create({ data: buildPersRow(pers, target) });
  const persId = newPers.persId;

  await copySkillsSpellsAndFeatures(tx, pers, persId);
  await copyFeats(tx, pers, persId);
  const copiedRowIds: CopiedRowIds = {
    weapons: await copyWeapons(tx, pers, persId),
    armors: await copyArmors(tx, pers, persId),
    magicItems: await copyMagicItems(tx, pers, persId),
  };
  await copyWeaponMasteriesAndMulticlasses(tx, pers, persId);
  const copiedInfusionIds = await copyInfusions(tx, pers, persId, copiedRowIds);
  await copyFeatureDescriptions(tx, pers, persId, copiedInfusionIds);
  await copyResourcePoolsAndWildshapes(tx, pers, persId);
  await copyBastion(tx, pers, persId);

  return newPers;
}

function buildPersRow(pers: PersCloneSource, target: PersCloneTarget) {
  const data = {
      userId: target.userId,
      name: target.name,
      /// Без цього рядка копія падає на `@default(RULES_2014)`, і персонаж 2024 стає
      /// персонажем 2014 з контентом 2024 — сторож `pers-copy-fields.test.ts`.
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
      heroicInspirationCount: pers.heroicInspirationCount,
      canStackHeroicInspiration: pers.canStackHeroicInspiration,
      exhaustionLevel: pers.exhaustionLevel,
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
      portraitKey: pers.portraitKey,
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
      folderId: target.folderId,
      isPinned: target.isPinned,
      isActive: target.snapshotOf === null,
      isSnapshot: target.snapshotOf !== null,
      parentPersId: target.snapshotOf?.parentPersId ?? null,
      snapshotLevel: target.snapshotOf?.level ?? null,
      raceVariants: { connect: pers.raceVariants.map((rv) => ({ raceVariantId: rv.raceVariantId })) },
      raceChoiceOptions: { connect: pers.raceChoiceOptions.map((rco) => ({ optionId: rco.optionId })) },
      choiceOptions: { connect: pers.choiceOptions.map((co) => ({ choiceOptionId: co.choiceOptionId })) },
      classOptionalFeatures: { connect: pers.classOptionalFeatures.map((cof) => ({ optionalFeatureId: cof.optionalFeatureId })) },
      spells: { connect: pers.spells.map((s) => ({ spellId: s.spellId })) },
    } satisfies Prisma.PersUncheckedCreateInput;

  return data;
}

function toJsonInput(value: Prisma.JsonValue): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

async function copySkillsSpellsAndFeatures(tx: TransactionClient, pers: PersCloneSource, persId: number) {
  await tx.persSkill.createMany({
    data: pers.skills.map((s) => ({
      persId,
      skillId: s.skillId,
      name: s.name,
      proficiencyType: s.proficiencyType,
      customModifier: s.customModifier,
    })),
  });

  await tx.persSpell.createMany({
    data: pers.persSpells.map((ps) => ({
      persId,
      spellId: ps.spellId,
      learnedAtLevel: ps.learnedAtLevel,
      isPrepared: ps.isPrepared,
      excludeFromPreparedCount: ps.excludeFromPreparedCount,
      excludeFromKnownCount: ps.excludeFromKnownCount,
      badgeText: ps.badgeText,
      badgeColor: ps.badgeColor,
      origin: ps.origin,
      sourceId: ps.sourceId,
      sourceName: ps.sourceName,
      notes: ps.notes,
    })),
  });

  await tx.persHomebrewSpell.createMany({
    data: pers.homebrewSpells.map((hs) => ({
      persId,
      homebrewEntryId: hs.homebrewEntryId,
      isPrepared: hs.isPrepared,
      badgeText: hs.badgeText,
      badgeColor: hs.badgeColor,
      excludeFromPreparedCount: hs.excludeFromPreparedCount,
      excludeFromKnownCount: hs.excludeFromKnownCount,
    })),
  });

  await tx.persFeature.createMany({
    data: pers.features.map((f) => ({ persId, featureId: f.featureId, usesRemaining: f.usesRemaining, isActive: f.isActive })),
  });
}

async function copyFeats(tx: TransactionClient, pers: PersCloneSource, persId: number) {
  for (const pf of pers.feats) {
    const newPersFeat = await tx.persFeat.create({ data: { persId, featId: pf.featId, grants: toJsonInput(pf.grants) } });
    await tx.persFeatChoice.createMany({
      data: pf.choices.map((c) => ({ persFeatId: newPersFeat.persFeatId, choiceOptionId: c.choiceOptionId })),
    });
  }
}

async function copyWeapons(tx: TransactionClient, pers: PersCloneSource, persId: number) {
  const copiedIds = new Map<number, number>();
  for (const w of pers.weapons) {
    const created = await tx.persWeapon.create({
      data: {
        persId,
        weaponId: w.weaponId,
        overrideDamage: w.overrideDamage,
        attackBonus: w.attackBonus,
        overrideName: w.overrideName,
        overrideNormalRange: w.overrideNormalRange,
        overrideLongRange: w.overrideLongRange,
        overrideDamageType: w.overrideDamageType,
        overrideAttackAbility: w.overrideAttackAbility,
        isProficient: w.isProficient,
        customAttackBonus: toJsonInput(w.customAttackBonus),
        customDamageAbility: w.customDamageAbility,
        customDamageBonus: toJsonInput(w.customDamageBonus),
        customDamageCount: w.customDamageCount,
        customDamageDice: w.customDamageDice,
        isMagical: w.isMagical,
      },
    });
    copiedIds.set(w.persWeaponId, created.persWeaponId);
  }
  return copiedIds;
}

async function copyArmors(tx: TransactionClient, pers: PersCloneSource, persId: number) {
  const copiedIds = new Map<number, number>();
  for (const a of pers.armors) {
    const created = await tx.persArmor.create({
      data: {
        persId,
        armorId: a.armorId,
        overrideBaseAC: a.overrideBaseAC,
        overrideName: a.overrideName,
        abilityBonuses: a.abilityBonuses,
        abilityBonusType: a.abilityBonusType,
        isProficient: a.isProficient,
        equipped: a.equipped,
        miscACBonus: a.miscACBonus,
      },
    });
    copiedIds.set(a.persArmorId, created.persArmorId);
  }
  return copiedIds;
}

async function copyMagicItems(tx: TransactionClient, pers: PersCloneSource, persId: number) {
  const copiedIds = new Map<number, number>();
  for (const mi of pers.magicItems) {
    const created = await tx.persMagicItem.create({
      data: { persId, magicItemId: mi.magicItemId, isEquipped: mi.isEquipped, isAttuned: mi.isAttuned, chargesMax: mi.chargesMax, chargesCurrent: mi.chargesCurrent },
    });
    copiedIds.set(mi.persMagicItemId, created.persMagicItemId);
  }
  return copiedIds;
}

async function copyWeaponMasteriesAndMulticlasses(tx: TransactionClient, pers: PersCloneSource, persId: number) {
  await tx.pers_weapon_mastery.createMany({
    data: pers.pers_weapon_mastery.map((mastery) => ({ pers_id: persId, weapon_id: mastery.weapon_id })),
  });

  await tx.persMulticlass.createMany({
    data: pers.multiclasses.map((m) => ({
      persId,
      classId: m.classId,
      classLevel: m.classLevel,
      subclassId: m.subclassId,
    })),
  });
}

async function copyInfusions(tx: TransactionClient, pers: PersCloneSource, persId: number, copiedRowIds: CopiedRowIds) {
  const copiedIds = new Map<number, number>();
  for (const i of pers.persInfusions) {
    const created = await tx.persInfusion.create({
      data: {
        persId,
        infusionId: i.infusionId,
        persArmorId: i.persArmorId ? (copiedRowIds.armors.get(i.persArmorId) ?? null) : null,
        persWeaponId: i.persWeaponId ? (copiedRowIds.weapons.get(i.persWeaponId) ?? null) : null,
        persMagicItemId: i.persMagicItemId ? (copiedRowIds.magicItems.get(i.persMagicItemId) ?? null) : null,
        expiresAt: i.expiresAt,
      },
    });
    copiedIds.set(i.persInfusionId, created.persInfusionId);
  }
  return copiedIds;
}

async function copyFeatureDescriptions(tx: TransactionClient, pers: PersCloneSource, persId: number, copiedInfusionIds: Map<number, number>) {
  const rows = pers.featureDescriptions.flatMap((entry) => {
    const refId = entry.kind === "INFUSION" ? copiedInfusionIds.get(entry.refId) : entry.refId;
    return refId === undefined ? [] : [{ persId, kind: entry.kind, refId, description: entry.description }];
  });
  if (rows.length) await tx.persFeatureDescription.createMany({ data: rows });
}

async function copyResourcePoolsAndWildshapes(tx: TransactionClient, pers: PersCloneSource, persId: number) {
  await tx.persResourcePool.createMany({
    data: pers.resourcePools.map((pool) => ({ persId, poolKey: pool.poolKey, usesRemaining: pool.usesRemaining })),
  });

  await tx.persWildshape.createMany({
    data: pers.wildshapes.map((form) => ({
      persId,
      creatureKey: form.creatureKey,
      ruleset: form.ruleset,
      sortOrder: form.sortOrder,
      notes: form.notes,
      currentHp: form.currentHp,
      isActive: form.isActive,
    })),
  });

  await tx.persEffect.createMany({
    data: pers.effects.map((effect) => ({
      persId,
      effectKey: effect.effectKey,
      spellId: effect.spellId,
      homebrewEntryId: effect.homebrewEntryId,
      endsWithConcentration: effect.endsWithConcentration,
    })),
  });
}

async function copyBastion(tx: TransactionClient, pers: PersCloneSource, persId: number) {
  if (!pers.bastion) return;

  await tx.persBastion.create({
    data: {
      persId,
      name: pers.bastion.name,
      description: pers.bastion.description,
      notes: pers.bastion.notes,
      isMaintaining: pers.bastion.isMaintaining,
      facilities: {
        create: pers.bastion.facilities.map((facility) => ({
          facilitySlug: facility.facilitySlug,
          space: facility.space,
          currentOrder: facility.currentOrder,
          defenders: facility.defenders,
          hirelings: facility.hirelings,
          notes: facility.notes,
        })),
      },
      turns: { create: pers.bastion.turns.map((turn) => ({ turnNumber: turn.turnNumber, entry: turn.entry })) },
    },
  });
}

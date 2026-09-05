import { Prisma } from "@prisma/client";

export const PERS_DUPLICATION_INCLUDE = {
  skills: true,
  persSpells: true,
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
  race: true,
  class: true,
  subclass: true,
  background: true,
  raceVariants: true,
  raceChoiceOptions: true,
  choiceOptions: true,
  classOptionalFeatures: true,
  spells: true,
} satisfies Prisma.PersInclude;

export type PersCloneSource = Prisma.PersGetPayload<{
  include: typeof PERS_DUPLICATION_INCLUDE;
}>;

export async function clonePersWithRelations(
  tx: Prisma.TransactionClient,
  pers: PersCloneSource,
  overrides: Record<string, unknown> = {}
) {
  const overrideName = typeof overrides.name === "string" ? overrides.name : undefined;
  const overrideUserId = typeof overrides.userId === "number" ? overrides.userId : undefined;
  const overrideFolderId = typeof overrides.folderId === "number" ? overrides.folderId : null;
  const overridePinned = typeof overrides.isPinned === "boolean" ? overrides.isPinned : undefined;
  const persExtra = pers as PersCloneSource & { raceStaticAcBonus?: number | null };

  const data = {
      userId: overrideUserId ?? pers.userId,
      name: overrideName ?? `${pers.name} (Копія)`,
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
      raceStaticAcBonus: persExtra.raceStaticAcBonus ?? undefined,
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
      folderId: overrideFolderId ?? pers.folderId ?? null,
      isPinned: overridePinned ?? pers.isPinned ?? false,
      isActive: true,
      isSnapshot: false,
      raceVariants: { connect: pers.raceVariants.map((rv) => ({ raceVariantId: rv.raceVariantId })) },
      raceChoiceOptions: { connect: pers.raceChoiceOptions.map((rco) => ({ optionId: rco.optionId })) },
      choiceOptions: { connect: pers.choiceOptions.map((co) => ({ choiceOptionId: co.choiceOptionId })) },
      classOptionalFeatures: { connect: pers.classOptionalFeatures.map((cof) => ({ optionalFeatureId: cof.optionalFeatureId })) },
      spells: { connect: pers.spells.map((s) => ({ spellId: s.spellId })) },
    } satisfies Prisma.PersUncheckedCreateInput;

  const newPers = await tx.pers.create({ data });

  const weaponIdMap = new Map<number, number>();
  const armorIdMap = new Map<number, number>();
  const magicItemIdMap = new Map<number, number>();

  if (pers.skills.length > 0) {
    await tx.persSkill.createMany({
      data: pers.skills.map((s) => ({
        persId: newPers.persId,
        skillId: s.skillId,
        name: s.name,
        proficiencyType: s.proficiencyType,
        customModifier: s.customModifier,
      })),
    });
  }

  if (pers.persSpells.length > 0) {
    await tx.persSpell.createMany({
      data: pers.persSpells.map((ps) => ({
        persId: newPers.persId,
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
  }

  if (pers.features.length > 0) {
    await tx.persFeature.createMany({
      data: pers.features.map((f) => ({
        persId: newPers.persId,
        featureId: f.featureId,
        usesRemaining: f.usesRemaining,
      })),
    });
  }

  for (const pf of pers.feats) {
    const newPersFeat = await tx.persFeat.create({
      data: {
        persId: newPers.persId,
        featId: pf.featId,
      },
    });
    if (pf.choices.length > 0) {
      await tx.persFeatChoice.createMany({
        data: pf.choices.map((c) => ({
          persFeatId: newPersFeat.persFeatId,
          choiceOptionId: c.choiceOptionId,
        })),
      });
    }
  }

  if (pers.weapons.length > 0) {
    for (const w of pers.weapons) {
      const weaponExtra = w as typeof w & {
        customAttackBonus?: Prisma.InputJsonValue | null;
        customDamageBonus?: Prisma.InputJsonValue | null;
      };
      const created = await tx.persWeapon.create({
        data: {
          persId: newPers.persId,
          weaponId: w.weaponId,
          overrideDamage: w.overrideDamage,
          attackBonus: w.attackBonus,
          overrideName: w.overrideName,
          overrideNormalRange: w.overrideNormalRange,
          overrideLongRange: w.overrideLongRange,
          overrideDamageType: w.overrideDamageType,
          overrideAttackAbility: w.overrideAttackAbility,
          isProficient: w.isProficient,
          customAttackBonus: weaponExtra.customAttackBonus ?? undefined,
          customDamageAbility: w.customDamageAbility,
          customDamageBonus: weaponExtra.customDamageBonus ?? undefined,
          customDamageCount: w.customDamageCount,
          customDamageDice: w.customDamageDice,
          isMagical: w.isMagical,
        },
      });
      weaponIdMap.set(w.persWeaponId, created.persWeaponId);
    }
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
    for (const a of pers.armors) {
      const armorExtra = a as typeof a & {
        abilityBonuses?: Prisma.InputJsonValue | null;
        abilityBonusType?: string | null;
      };
      const created = await tx.persArmor.create({
        data: {
          persId: newPers.persId,
          armorId: a.armorId,
          overrideBaseAC: a.overrideBaseAC,
          overrideName: a.overrideName,
          abilityBonuses: armorExtra.abilityBonuses ?? undefined,
          abilityBonusType: armorExtra.abilityBonusType ?? undefined,
          isProficient: a.isProficient,
          equipped: a.equipped,
          miscACBonus: a.miscACBonus,
        },
      });
      armorIdMap.set(a.persArmorId, created.persArmorId);
    }
  }

  if (pers.multiclasses.length > 0) {
    await tx.persMulticlass.createMany({
      data: pers.multiclasses.map((m) => ({
        persId: newPers.persId,
        classId: m.classId,
        classLevel: m.classLevel,
        subclassId: m.subclassId,
      })),
    });
  }

  if (pers.magicItems.length > 0) {
    for (const mi of pers.magicItems) {
      const created = await tx.persMagicItem.create({
        data: {
          persId: newPers.persId,
          magicItemId: mi.magicItemId,
          isEquipped: mi.isEquipped,
          isAttuned: mi.isAttuned,
        },
      });
      magicItemIdMap.set(mi.persMagicItemId, created.persMagicItemId);
    }
  }

  if (pers.persInfusions.length > 0) {
    await tx.persInfusion.createMany({
      data: pers.persInfusions.map((i) => ({
        persId: newPers.persId,
        infusionId: i.infusionId,
        persArmorId: i.persArmorId ? (armorIdMap.get(i.persArmorId) ?? null) : null,
        persWeaponId: i.persWeaponId ? (weaponIdMap.get(i.persWeaponId) ?? null) : null,
        persMagicItemId: i.persMagicItemId ? (magicItemIdMap.get(i.persMagicItemId) ?? null) : null,
        expiresAt: i.expiresAt,
      })),
    });
  }

  return newPers;
}

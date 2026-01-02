"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FeatureDisplayType, RestType, MagicItem } from "@prisma/client";

async function getCurrentUserId() {
    const session = await auth();
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    return user?.id ?? null;
}

export async function getUserPerses() {
  const session = await auth();
  if (!session?.user?.email) {
    return [];
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return [];

  return prisma.pers.findMany({
    where: { 
      userId: user.id,
      OR: [
        { isSnapshot: false },
        { isSnapshot: true, isActive: true }
      ]
    },
    include: {
      race: true,
      class: true,
      background: true,
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function renamePers(persId: number, name: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const next = name.trim();
    if (!next) return { success: false as const, error: "Ім'я не може бути порожнім" };
    if (next.length > 60) return { success: false as const, error: "Ім'я занадто довге" };

    const pers = await prisma.pers.findUnique({
        where: { persId },
        select: { persId: true, userId: true },
    });

    if (!pers || pers.userId !== userId) {
        return { success: false as const, error: "Немає доступу до персонажа" };
    }

    await prisma.pers.update({
        where: { persId },
        data: { name: next },
    });

    revalidatePath("/char/home");
    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true as const };
}

export async function deletePers(persId: number) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

    const pers = await prisma.pers.findUnique({
        where: { persId },
        select: { persId: true, userId: true },
    });

    if (!pers || pers.userId !== userId) {
        return { success: false as const, error: "Немає доступу до персонажа" };
    }

    await prisma.$transaction([
        prisma.pers.deleteMany({
            where: {
                userId,
                parentPersId: persId,
            },
        }),
        prisma.pers.delete({
            where: { persId },
        }),
    ]);

    revalidatePath("/char/home");
    return { success: true as const };
}

export async function duplicatePers(persId: number) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false as const, error: "Не авторизовано" };

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
                magicItems: { include: { magicItem: true } },
                persInfusions: true,
                race: true,
                class: true,
                background: true,
                // Implicit M:N relations
                raceVariants: true,
                raceChoiceOptions: true,
                choiceOptions: true,
                classOptionalFeatures: true,
                spells: true,
            }
        });

        if (!pers || pers.userId !== userId) {
            return { success: false as const, error: "Немає доступу до персонажа" };
        }

        const duplicate = await prisma.$transaction(async (tx) => {
            const newPers = await tx.pers.create({
                data: {
                    userId: pers.userId,
                    name: `${pers.name} (Копія)`,
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
                    
                    isActive: true,
                    isSnapshot: false,

                    raceVariants: { connect: pers.raceVariants.map(rv => ({ raceVariantId: rv.raceVariantId })) },
                    raceChoiceOptions: { connect: pers.raceChoiceOptions.map(rco => ({ optionId: rco.optionId })) },
                    choiceOptions: { connect: pers.choiceOptions.map(co => ({ choiceOptionId: co.choiceOptionId })) },
                    classOptionalFeatures: { connect: pers.classOptionalFeatures.map(cof => ({ optionalFeatureId: cof.optionalFeatureId })) },
                    spells: { connect: pers.spells.map(s => ({ spellId: s.spellId })) },
                }
            });

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

            if (pers.features.length > 0) {
                await tx.persFeature.createMany({
                    data: pers.features.map(f => ({
                        persId: newPers.persId,
                        featureId: f.featureId,
                        usesRemaining: f.usesRemaining,
                    }))
                });
            }

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

            if (pers.weapons.length > 0) {
                await tx.persWeapon.createMany({
                    data: pers.weapons.map(w => ({
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

            if (pers.armors.length > 0) {
                await tx.persArmor.createMany({
                    data: pers.armors.map(a => ({
                        persId: newPers.persId,
                        armorId: a.armorId,
                        overrideBaseAC: a.overrideBaseAC,
                        overrideName: a.overrideName,
                        isProficient: a.isProficient,
                        equipped: a.equipped,
                        miscACBonus: a.miscACBonus,
                    }))
                });
            }

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

            if (pers.magicItems.length > 0) {
                await tx.persMagicItem.createMany({
                    data: pers.magicItems.map(mi => ({
                        persId: newPers.persId,
                        magicItemId: mi.magicItemId,
                    }))
                });
            }

            if (pers.persInfusions.length > 0) {
                await tx.persInfusion.createMany({
                    data: pers.persInfusions.map(i => ({
                        persId: newPers.persId,
                        infusionId: i.infusionId,
                        persArmorId: i.persArmorId,
                        persWeaponId: i.persWeaponId,
                        persMagicItemId: i.persMagicItemId,
                    }))
                });
            }

            return newPers;
        });

        revalidatePath("/char/home");
        
        const persHomeItem = {
            persId: duplicate.persId,
            name: duplicate.name,
            level: duplicate.level,
            currentHp: duplicate.currentHp,
            maxHp: duplicate.maxHp,
            raceName: (pers as any).race.name,
            className: (pers as any).class.name,
            backgroundName: (pers as any).background.name,
            shareToken: duplicate.shareToken,
        };

        return { success: true as const, pers: persHomeItem };
    } catch (error) {
        console.error("Duplication failed:", error);
        return { success: false as const, error: "Не вдалося скопіювати персонажа" };
    }
}

export async function getUserPersesSpellIndex() {
    const session = await auth();
    if (!session?.user?.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return [];

    const perses = await prisma.pers.findMany({
        where: { 
            userId: user.id,
            isSnapshot: false,
            isActive: true
        },
        select: {
            persId: true,
            name: true,
            persSpells: {
                select: {
                    spellId: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    return perses.map((p) => ({
        persId: p.persId,
        name: p.name,
        spellIds: p.persSpells.map((s) => s.spellId),
    }));
}

export async function getPersById(id: number) {
    const session = await auth();
    if (!session?.user?.email) return null;

    const pers = await prisma.pers.findUnique({
        where: { persId: id },
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
            magicItems: {
                include: {
                    magicItem: true
                }
            },
            features: { include: { feature: true } },
            choiceOptions: true,
            raceChoiceOptions: true,
            spells: true,
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
            user: true,
        }
    });
    
    if (!pers) return null;

    // Check ownership
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (pers.userId !== user?.id) {
        // Allow viewing if we decide to share, but for now restrict
        // return null; 
        // Actually, for debugging/demo, let's allow it if it's just a fetch, 
        // but strictly speaking we should restrict.
        // The user asked for "current user's perses", so let's enforce ownership for the sheet too.
        if (pers.userId !== user?.id) return null;
    }

    return pers;
}

export type PersWithRelations = NonNullable<Awaited<ReturnType<typeof getPersById>>>;
export type PersWeaponWithWeapon = PersWithRelations['weapons'][number];
export type PersArmorWithArmor = PersWithRelations['armors'][number];

export type FeatureSource = "CLASS" | "SUBCLASS" | "RACE" | "SUBRACE" | "BACKGROUND" | "FEAT" | "PERS" | "CHOICE" | "RACE_CHOICE" | "INFUSION";

export type CharacterFeatureGroupKey = "passive" | "actions" | "bonusActions" | "reactions";

export interface CharacterFeatureItem {
    key: string;
    featureId?: number;
    name: string;
    shortDescription?: string | null;
    description: string;
    displayTypes: FeatureDisplayType[];
    primaryType: FeatureDisplayType;
    source: FeatureSource;
    sourceName: string;
    usesRemaining?: number | null;
    usesPer?: number | null;
    restType?: RestType | null;
    createdAt?: number | null;
    magicItem?: Partial<MagicItem> | null;
}

export type CharacterFeaturesGroupedResult = Record<CharacterFeatureGroupKey, CharacterFeatureItem[]>;

function normalizeDisplayTypes(input: unknown): FeatureDisplayType[] {
    if (Array.isArray(input)) {
        const values = input.filter(Boolean) as FeatureDisplayType[];
        return values.length > 0 ? values : [FeatureDisplayType.PASSIVE];
    }
    if (typeof input === "string" && input.length > 0) {
        return [input as FeatureDisplayType];
    }
    return [FeatureDisplayType.PASSIVE];
}

function getPrimaryDisplayType(displayTypes: FeatureDisplayType[]): FeatureDisplayType {
    const normalized = normalizeDisplayTypes(displayTypes);
    // Priority: ACTION > BONUSACTION > REACTION > PASSIVE
    if (normalized.includes(FeatureDisplayType.ACTION)) return FeatureDisplayType.ACTION;
    if (normalized.includes(FeatureDisplayType.BONUSACTION)) return FeatureDisplayType.BONUSACTION;
    if (normalized.includes(FeatureDisplayType.REACTION)) return FeatureDisplayType.REACTION;
    return FeatureDisplayType.PASSIVE;
}

function toPrimaryGroupKey(primaryType: FeatureDisplayType): CharacterFeatureGroupKey {
    switch (primaryType) {
        case FeatureDisplayType.ACTION:
            return "actions";
        case FeatureDisplayType.BONUSACTION:
            return "bonusActions";
        case FeatureDisplayType.REACTION:
            return "reactions";
        default:
            return "passive";
    }
}

export async function getCharacterFeaturesGrouped(persId: number): Promise<CharacterFeaturesGroupedResult | null> {
    const session = await auth();
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });
    if (!user) return null;

    const pers = await prisma.pers.findUnique({
        where: { persId },
        include: {
            features: { include: { feature: true }, orderBy: { persFeatureId: "asc" } },
            race: { include: { traits: { include: { feature: true } } } },
            subrace: { include: { traits: { include: { feature: true } } } },
            class: { include: { features: { include: { feature: true } } } },
            subclass: { include: { features: { include: { feature: true } } } },
            multiclasses: {
                include: {
                    class: { include: { features: { include: { feature: true } } } },
                    subclass: { include: { features: { include: { feature: true } } } },
                }
            },
            raceVariants: { include: { traits: { include: { feature: true } } } },
            feats: {
                include: {
                    feat: true,
                    choices: {
                        include: {
                            choiceOption: true,
                        },
                    },
                },
            },
            choiceOptions: { include: { features: { include: { feature: true } } } },
            raceChoiceOptions: { include: { traits: { include: { feature: true } } } },
            persInfusions: {
                include: {
                    infusion: {
                        include: {
                            replicatedMagicItem: true,
                            feature: true
                        }
                    }
                }
            },
            user: true,
        },
    });

    if (!pers) return null;
    if (pers.userId !== user.id) return null;

    // Build a map of featureId -> Source
    // Also build a map of featureId -> ClassLevel for determining class-based scaling uses
    const sourceMap = new Map<number, "RACE" | "SUBRACE" | "CLASS" | "SUBCLASS">();
    const featureClassLevelMap = new Map<number, number>();

    const multiclassSum = pers.multiclasses.reduce((acc, current) => acc + (Number(current.classLevel) || 0), 0);
    const mainClassLevel = Math.max(1, (Number(pers.level) || 1) - multiclassSum);

    const addFeaturesToLevelMap = (features: any[], level: number) => {
        features.forEach(f => {
             if (f.feature?.featureId) featureClassLevelMap.set(f.feature.featureId, level);
             else if (f.featureId) featureClassLevelMap.set(f.featureId, level);
        });
    };

    // Main class
    addFeaturesToLevelMap(pers.class.features, mainClassLevel);
    if (pers.subclass) addFeaturesToLevelMap(pers.subclass.features, mainClassLevel);

    pers.multiclasses.forEach(mc => {
        const lvl = Number(mc.classLevel) || 1;
        addFeaturesToLevelMap(mc.class.features, lvl);
        if (mc.subclass) addFeaturesToLevelMap(mc.subclass.features, lvl);
    });
    
    pers.race.traits.forEach(t => { if (t.featureId) sourceMap.set(t.featureId, "RACE"); });
    pers.subrace?.traits.forEach(t => { if (t.featureId) sourceMap.set(t.featureId, "SUBRACE"); });
    pers.class.features.forEach(f => { if (f.featureId) sourceMap.set(f.featureId, "CLASS"); });
    pers.subclass?.features.forEach(f => { if (f.featureId) sourceMap.set(f.featureId, "SUBCLASS"); });
    
    pers.multiclasses.forEach(mc => {
        mc.class.features.forEach(f => { if (f.featureId) sourceMap.set(f.featureId, "CLASS"); });
        mc.subclass?.features.forEach(f => { if (f.featureId) sourceMap.set(f.featureId, "SUBCLASS"); });
    });

    pers.raceVariants.forEach(rv => {
        rv.traits.forEach(t => { if (t.featureId) sourceMap.set(t.featureId, "RACE"); });
    });

    // Identify features that come from choices to label them correctly in the main loop
    const choiceFeatureIds = new Map<number, FeatureSource>();
    pers.choiceOptions.forEach(co => co.features.forEach(cof => choiceFeatureIds.set(cof.feature.featureId, "CHOICE")));
    pers.raceChoiceOptions.forEach(rco => rco.traits.forEach(t => { if (t.featureId) choiceFeatureIds.set(t.featureId, "RACE_CHOICE"); }));


    const buckets: CharacterFeaturesGroupedResult = {
        passive: [],
        actions: [],
        bonusActions: [],
        reactions: [],
    };

    const proficiencyBonus = (level: number) => {
        if (!Number.isFinite(level) || level <= 0) return 2;
        return 2 + Math.floor((level - 1) / 4);
    };

    const seenFeatureIds = new Set<number>();
    const seenNames = new Set<string>();

    const push = (item: Omit<CharacterFeatureItem, "primaryType" | "displayTypes"> & { displayTypes: FeatureDisplayType[] }) => {
        if (item.featureId && seenFeatureIds.has(item.featureId)) return;
        const normalizedName = item.name.trim().toLowerCase();
        if (seenNames.has(normalizedName)) return;

        if (item.featureId) seenFeatureIds.add(item.featureId);
        seenNames.add(normalizedName);

        const displayTypes = normalizeDisplayTypes(item.displayTypes);
        const primaryType = getPrimaryDisplayType(displayTypes);
        const key = toPrimaryGroupKey(primaryType);
        buckets[key].push({
            ...item,
            displayTypes,
            primaryType,
        });
    };

    // 1) Explicit pers_feature (usually level-up granted)
    for (const pf of pers.features) {
        const f = pf.feature;

        const usesPer = (() => {
            const special = f.usesCountSpecial as any;
            if (special && typeof special === 'object' && special.equalsToClassLevel === true) {
                 return featureClassLevelMap.get(f.featureId) ?? pers.level;
            }

            if (f.usesCountDependsOnProficiencyBonus) return proficiencyBonus(pers.level);
            if (typeof f.usesCount === "number") return f.usesCount;
            return null;
        })();

        let source = sourceMap.get(f.featureId) || "PERS";
        if (source === "PERS") {
            const choiceSource = choiceFeatureIds.get(f.featureId);
            if (choiceSource) source = choiceSource;
        }

        push({
            key: `PERS:feature:${f.featureId}`,
            featureId: f.featureId,
            name: f.name,
            shortDescription: f.shortDescription ?? null,
            description: f.description,
            displayTypes: normalizeDisplayTypes(f.displayType),
            source: source as FeatureSource,
            sourceName: f.name,
            usesRemaining: pf.usesRemaining ?? null,
            usesPer,
            restType: f.limitedUsesPer ?? null,
            createdAt: pf.persFeatureId,
        });
    }

    // 2) Choice options stored directly on pers -> push remaining FEATURES
    for (const co of pers.choiceOptions ?? []) {
        for (const cof of co.features ?? []) {
            const f = cof.feature;

            push({
                key: `CHOICE:${co.groupName}:option:${co.choiceOptionId}:feature:${f.featureId}`,
                featureId: f.featureId,
                name: f.name,
                shortDescription: f.shortDescription ?? null,
                description: f.description,
                displayTypes: normalizeDisplayTypes(f.displayType),
                source: "CHOICE",
                sourceName: co.groupName,
                createdAt: co.choiceOptionId, // fallback
                usesRemaining: null,
                usesPer: f.usesCount, // Simplified, Pact usually passive
                restType: f.limitedUsesPer,
            });
        }
    }
    for (const rco of pers.raceChoiceOptions ?? []) {
        for (const rcot of rco.traits ?? []) {
            if (!rcot.feature) continue;
            const f = rcot.feature;

            push({
                key: `RACE_CHOICE:${rco.choiceGroupName}:option:${rco.optionId}:feature:${f.featureId}`,
                featureId: f.featureId,
                name: f.name,
                shortDescription: f.shortDescription ?? null,
                description: f.description,
                displayTypes: normalizeDisplayTypes(f.displayType),
                source: "RACE_CHOICE",
                sourceName: rco.choiceGroupName,
                createdAt: rco.optionId, // fallback
                usesRemaining: null,
                usesPer: f.usesCount,
                restType: f.limitedUsesPer,
            });
        }
    }

    // 3) Feats + their selected feat choice options
    for (const pf of pers.feats ?? []) {
        const featName = pf.feat.name;
        const displayTypes = [FeatureDisplayType.PASSIVE];

        // Always show the feat itself as a trait item
        push({
            key: `FEAT:${pf.featId}`,
            name: featName,
            description: pf.feat.description,
            displayTypes,
            source: "FEAT",
            sourceName: featName,
        });

        // Additionally show selected choices (if any)
        if (!pf.choices || pf.choices.length === 0) {
            continue;
        }

        for (const choice of pf.choices) {
            if (!choice.choiceOption) continue;
            push({
                key: `FEAT:${pf.featId}:choice:${choice.choiceOptionId}`,
                name: choice.choiceOption.optionName,
                description: `${choice.choiceOption.groupName}: ${choice.choiceOption.optionName}`,
                displayTypes,
                source: "FEAT",
                sourceName: featName,
            });
        }
    }
    
    // 4) Artificer Infusions
    for (const pi of pers.persInfusions ?? []) {
        const inf = pi.infusion;
        const feature = inf.feature;
        
        const usesPer = feature ? (() => {
            if (feature.usesCountDependsOnProficiencyBonus) return proficiencyBonus(pers.level);
            if (typeof feature.usesCount === "number") return feature.usesCount;
            return null;
        })() : null;

        push({
            key: `INFUSION:${pi.persInfusionId}`,
            name: feature?.name || inf.name,
            description: feature?.description || inf.replicatedMagicItem?.description || inf.name,
            shortDescription: feature?.shortDescription,
            displayTypes: feature?.displayType as FeatureDisplayType[] || [FeatureDisplayType.PASSIVE],
            source: "INFUSION",
            sourceName: "Вливання",
            magicItem: inf.replicatedMagicItem ?? null,
            usesPer,
            restType: feature?.limitedUsesPer ?? null,
            usesRemaining: feature?.usesCount, // Fallback, though not tracked yet
        });
    }

    return buckets;
}

export async function getUserPersesMagicItemIndex() {
    const session = await auth();
    if (!session?.user?.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return [];

    const perses = await prisma.pers.findMany({
        where: { 
            userId: user.id,
            isSnapshot: false,
            isActive: true
        },
        select: {
            persId: true,
            name: true,
            magicItems: {
               select: {
                   magicItemId: true
               }
            }
        },
        orderBy: { updatedAt: "desc" },
    });

    return perses.map((p) => ({
        persId: p.persId,
        name: p.name,
        magicItemIds: p.magicItems.map((mi) => mi.magicItemId),
    }));
}

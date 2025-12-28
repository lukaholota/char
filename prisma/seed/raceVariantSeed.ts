import { Prisma, PrismaClient, Variants, Source, Races } from "@prisma/client";

export const seedRaceVariants = async (prisma: PrismaClient) => {
    console.log('👨 Додаємо варіанти Людей...');
    console.log('🧙‍♂️ Додаємо варіанти Half-Elf (Драгонмарки)...');
    console.log('🧔 Додаємо варіанти Dwarf (Драгонмарки)...');
    console.log('👣 Додаємо варіанти Halfling (Драгонмарки)...');
    console.log('🕯️ Додаємо варіанти Gnome (Драгонмарки)...');
    console.log('🧝 Додаємо варіанти Elf (Драгонмарки)...');
    console.log('😈 Додаємо варіанти Тифлінгів...');

    const tiefling = await prisma.race.findFirst({ where: { name: Races.TIEFLING_2014 } });
    if (!tiefling) {
        throw new Error("Tiefling race not found");
    }

    const human = await prisma.race.findFirst({ where: { name: Races.HUMAN_2014 } });
    if (!human) {
        throw new Error("Human race not found");
    }

    // Get the PHB Infernal Legacy feature to replace
    const phbInfernalLegacy =await prisma.feature.findFirst({ where: { engName: 'Infernal Legacy' } });
    if (!phbInfernalLegacy) {
        throw new Error("PHB Infernal Legacy feature not found");
    }

    const halfElf = await prisma.race.findFirst({ where: { name: Races.HALF_ELF_2014 } });
    if (!halfElf) {
        throw new Error("Half-Elf race not found");
    }

    const dwarf = await prisma.race.findFirst({ where: { name: Races.DWARF_2014 } });
    if (!dwarf) {
        throw new Error("Dwarf race not found");
    }

    const halfling = await prisma.race.findFirst({ where: { name: Races.HALFLING_2014 } });
    if (!halfling) {
        throw new Error("Halfling race not found");
    }

    const gnome = await prisma.race.findFirst({ where: { name: Races.GNOME_2014 } });
    if (!gnome) {
        throw new Error("Gnome race not found");
    }

    const halfOrc = await prisma.race.findFirst({ where: { name: Races.HALF_ORC_2014 } });
    if (!halfOrc) {
        throw new Error("Half-Orc race not found");
    }

    const elf = await prisma.race.findFirst({ where: { name: Races.ELF_2014 } });
    if (!elf) {
        throw new Error("Elf race not found");
    }

    const connectFeature = (engName: string) => ({ feature: { connect: { engName } } });

    const variants = [
        // ============ HUMAN VARIANT (PHB) ============
        {
            raceId: human.raceId,
            name: Variants.HUMAN_VARIANT,
            source: Source.PHB,
            overridesRaceASI: {
                basic: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+1 до Двох',
                                value: 1,
                                choiceCount: 2,
                                unique: true
                            }
                        ]
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+1 до Двох',
                                value: 1,
                                choiceCount: 2,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: []
            }
        },

        // ============ SCAG BLOODLINES ============
        
        // Asmodeus (PHB default, explicit variant)
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_ASMODEUS,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, INT: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_bloodline",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Asmodeus)')
                ]
            }
        },
        
        // Baalzebul
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_BAALZEBUL,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, INT: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_bloodline",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Baalzebul)')
                ]
            }
        },
        
        // Dispater
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_DISPATER,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, DEX: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_bloodline",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Dispater)')
                ]
            }
        },
        
        // Fierna
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_FIERNA,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, WIS: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_bloodline",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Fierna)')
                ]
            }
        },
        
        // Glasya
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_GLASYA,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, DEX: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_bloodline",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Glasya)')
                ]
            }
        },
        
        // Levistus
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_LEVISTUS,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, CON: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_bloodline",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Levistus)')
                ]
            }
        },
        
        // Mammon
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_MAMMON,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, INT: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_bloodline",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Mammon)')
                ]
            }
        },
        
        // Mephistopheles
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_MEPHISTOPHELES,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, INT: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_bloodline",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Mephistopheles)')
                ]
            }
        },
        
        // Zariel
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_ZARIEL,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, STR: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_bloodline",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Zariel)')
                ]
            }
        },
        
        // ============ MTOF VARIANTS ============
        
        // Devil's Tongue
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_VARIANT_DEVILS_TONGUE_SCAG,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, INT: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_mtof_variant",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Devil\'s Tongue)')
                ]
            }
        },
        
        // Hellfire
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_VARIANT_HELLFIRE_SCAG,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, INT: 1 },
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_mtof_variant",
            traits: {
                create: [
                    connectFeature('Infernal Legacy (Hellfire)')
                ]
            }
        },
        
        // Winged
        {
            raceId: tiefling.raceId,
            name: Variants.TIEFLING_VARIANT_WINGED_SCAG,
            source: Source.SCAG,
            overridesRaceASI: { CHA: 2, INT: 1 },
            overridesFlightSpeed: 30,
            replacesFeatures: {
                connect: [{ featureId: phbInfernalLegacy.featureId }]
            },
            exclusivityGroup: "tiefling_mtof_variant",
            traits: {
                create: [
                    connectFeature('Winged Tiefling')
                ]
            }
        },

        // ============ HALF-ELF DRAGONMARKS (EBERRON) ============
        
        // Mark of Detection
        {
            raceId: halfElf.raceId,
            name: Variants.HALF_ELF_MARK_OF_DETECTION_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { CHA: 2, INT: 1 },
            traits: {
                create: [
                    connectFeature('Deductive Intuition'),
                    connectFeature('Magical Detection'),
                    connectFeature('Spells of the Mark (Detection)')
                ]
            }
        },
        
        // Mark of Storm
        {
            raceId: halfElf.raceId,
            name: Variants.HALF_ELF_MARK_OF_STORM_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { CHA: 2, DEX: 1 },
            traits: {
                create: [
                    connectFeature('Windwright\'s Intuition'),
                    connectFeature('Storm\'s Boon'),
                    connectFeature('Headwinds'),
                    connectFeature('Spells of the Mark (Storm)')
                ]
            }
        },

        // ============ DWARF DRAGONMARK (EBERRON) ============
        
        // Mark of Warding
        {
            raceId: dwarf.raceId,
            name: Variants.DWARF_MARK_OF_WARDING_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { CON: 2, INT: 1 },
            traits: {
                create: [
                    connectFeature('Warder\'s Intuition'),
                    connectFeature('Wards and Seals'),
                    connectFeature('Spells of the Mark (Warding)')
                ]
            }
        },

        // ============ HALFLING DRAGONMARKS (EBERRON) ============
        
        // Mark of Healing
        {
            raceId: halfling.raceId,
            name: Variants.HALFLING_MARK_OF_HEALING_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { DEX: 2, WIS: 1 },
            traits: {
                create: [
                    connectFeature('Medical Intuition'),
                    connectFeature('Healing Touch'),
                    connectFeature('Spells of the Mark (Healing)')
                ]
            }
        },
        // Mark of Hospitality
        {
            raceId: halfling.raceId,
            name: Variants.HALFLING_MARK_OF_HOSPITALITY_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { DEX: 2, CHA: 1 },
            traits: {
                create: [
                    connectFeature('Ever-Hospitable'),
                    connectFeature('Innkeeper\'s Magic'),
                    connectFeature('Spells of the Mark (Hospitality)')
                ]
            }
        },

        // ============ GNOME DRAGONMARKS (EBERRON) ============

        // Mark of Scribing
        {
            raceId: gnome.raceId,
            name: Variants.GNOME_MARK_OF_SCRIBING_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { INT: 2, CHA: 1 },
            traits: {
                create: [
                    connectFeature('Gifted Scribe'),
                    connectFeature('Scribe\'s Insight'),
                    connectFeature('Spells of the Mark (Scribing)')
                ]
            }
        },

        // ============ HUMAN DRAGONMARKS (EBERRON) ============

        // Mark of Finding (Human)
        {
            raceId: human.raceId,
            name: Variants.HUMAN_MARK_OF_FINDING_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { WIS: 2, CON: 1 },
            traits: {
                create: [
                    connectFeature('Hunter\'s Intuition'),
                    connectFeature('Finder\'s Magic'),
                    connectFeature('Spells of the Mark (Finding)')
                ]
            }
        },
        // Mark of Handling
        {
            raceId: human.raceId,
            name: Variants.HUMAN_MARK_OF_HANDLING_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { WIS: 2, CHA: 1 }, // Using CHA as "one other" +1 for simplicity, or should I leave it empty? ASI in variants is usually fixed.
            traits: {
                create: [
                    connectFeature('Wild Intuition'),
                    connectFeature('Primal Connection'),
                    connectFeature('The Bigger They Are'),
                    connectFeature('Spells of the Mark (Handling)')
                ]
            }
        },
        // Mark of Making
        {
            raceId: human.raceId,
            name: Variants.HUMAN_MARK_OF_MAKING_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { INT: 2, DEX: 1 }, // Using DEX as "one other" +1
            traits: {
                create: [
                    connectFeature('Artisan\'s Intuition'),
                    connectFeature('Maker\'s Gift'),
                    connectFeature('Spellsmith'),
                    connectFeature('Spells of the Mark (Making)')
                ]
            }
        },
        // Mark of Passage
        {
            raceId: human.raceId,
            name: Variants.HUMAN_MARK_OF_PASSAGE_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { DEX: 2, INT: 1 }, // Using INT as "one other" +1
            traits: {
                create: [
                    connectFeature('Intuition of the Voyager'),
                    connectFeature('Magical Passage'),
                    connectFeature('Spells of the Mark (Passage)')
                ]
            }
        },
        // Mark of Sentinel
        {
            raceId: human.raceId,
            name: Variants.HUMAN_MARK_OF_SENTINEL_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { CON: 2, WIS: 1 },
            traits: {
                create: [
                    connectFeature('Sentinel\'s Intuition'),
                    connectFeature('Guardian\'s Shield'),
                    connectFeature('Vigilant Guardian'),
                    connectFeature('Spells of the Mark (Sentinel)')
                ]
            }
        },

        // ============ HALF-ORC DRAGONMARKS (EBERRON) ============

        // Mark of Finding (Half-Orc)
        {
            raceId: halfOrc.raceId,
            name: Variants.HALF_ORC_MARK_OF_FINDING_EBERRON, 
            source: Source.EBERRON,
            overridesRaceASI: { WIS: 2, STR: 1 },
            traits: {
                create: [
                    connectFeature('Hunter\'s Intuition'),
                    connectFeature('Finder\'s Magic'),
                    connectFeature('Spells of the Mark (Finding)')
                ]
            }
        },

        // ============ ELF DRAGONMARKS (EBERRON) ============

        // Mark of Shadow
        {
            raceId: elf.raceId,
            name: Variants.ELF_MARK_OF_SHADOW_EBERRON,
            source: Source.EBERRON,
            overridesRaceASI: { DEX: 2, CHA: 1 },
            traits: {
                create: [
                    connectFeature('Cunning Intuition'),
                    connectFeature('Shape Shadows'),
                    connectFeature('Spells of the Mark (Shadow)')
                ]
            }
        }
    ];

    type TraitCreateItem = { feature: { connect: { engName: string } } };
    type VariantSeed = (typeof variants)[number];

    const extractTraitEngNames = (variant: VariantSeed): string[] => {
        const raw = variant.traits?.create;
        if (!raw || !Array.isArray(raw)) return [];
        return (raw as TraitCreateItem[])
            .map((x) => x.feature.connect.engName)
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    };

    const allTraitEngNames = Array.from(
        new Set(variants.flatMap((v) => extractTraitEngNames(v)))
    );

    const featuresByEngName = new Map<string, number>();
    if (allTraitEngNames.length) {
        const featureRows = await prisma.feature.findMany({
            where: { engName: { in: allTraitEngNames } },
            select: { featureId: true, engName: true },
        });
        for (const row of featureRows) featuresByEngName.set(row.engName, row.featureId);

        const missing = allTraitEngNames.filter((name) => !featuresByEngName.has(name));
        if (missing.length) {
            console.warn(
                `⚠️ seedRaceVariants: missing features by engName (traits will be skipped): ${missing.join(", ")}`
            );
        }
    }

    const resolveTraitFeatureIds = (variant: VariantSeed): number[] => {
        const ids = extractTraitEngNames(variant)
            .map((name) => featuresByEngName.get(name))
            .filter((x): x is number => typeof x === "number");
        return Array.from(new Set(ids));
    };

    const reconcileVariantTraits = async (raceVariantId: number, desiredFeatureIds: number[]) => {
        const desired = new Set<number>(desiredFeatureIds);

        const existing = await prisma.raceVariantTrait.findMany({
            where: { raceVariantId },
            select: { raceVariantTraitId: true, featureId: true },
        });

        // Remove accidental duplicates (same featureId multiple times)
        const seenFeatureIds = new Set<number>();
        const duplicateIds: number[] = [];
        for (const row of existing) {
            if (seenFeatureIds.has(row.featureId)) duplicateIds.push(row.raceVariantTraitId);
            else seenFeatureIds.add(row.featureId);
        }
        if (duplicateIds.length) {
            await prisma.raceVariantTrait.deleteMany({
                where: { raceVariantTraitId: { in: duplicateIds } },
            });
        }

        const existingFeatureIds = new Set(existing.map((x) => x.featureId));

        const toDelete = Array.from(existingFeatureIds).filter((fid) => !desired.has(fid));
        if (toDelete.length) {
            await prisma.raceVariantTrait.deleteMany({
                where: { raceVariantId, featureId: { in: toDelete } },
            });
        }

        const toCreate = Array.from(desired).filter((fid) => !existingFeatureIds.has(fid));
        if (toCreate.length) {
            await prisma.raceVariantTrait.createMany({
                data: toCreate.map((featureId) => ({ raceVariantId, featureId })),
            });
        }
    };

    for (const variant of variants) {
        const existing = await prisma.raceVariant.findFirst({
            where: { name: variant.name, raceId: variant.raceId }
        });

        const desiredTraitFeatureIds = resolveTraitFeatureIds(variant);
        const { traits: _traits, ...variantData } = variant;

        if (existing) {
            await prisma.raceVariant.update({
                where: { raceVariantId: existing.raceVariantId },
                data: variantData as unknown as Prisma.RaceVariantUpdateArgs["data"],
            });

            await reconcileVariantTraits(existing.raceVariantId, desiredTraitFeatureIds);
        } else {
            const created = await prisma.raceVariant.create({
                data: variantData as unknown as Prisma.RaceVariantCreateArgs["data"],
            });

            await reconcileVariantTraits(created.raceVariantId, desiredTraitFeatureIds);
        }
    }

    console.log(`✅ Додано ${variants.length} варіантів (Люди, Half-Elf, Dwarf, Halfling, Gnome, Half-Orc, Elf, Тифлінги)!`);
}

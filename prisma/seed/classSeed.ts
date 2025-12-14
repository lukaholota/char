import {
    Ability,
    ArmorType,
    Classes,
    Prisma,
    PrismaClient,
    Skills,
    SpellcastingType,
    ToolCategory,
    WeaponCategory,
    WeaponType
} from "@prisma/client";
import ClassCreateInput = Prisma.ClassCreateInput;

export const seedClasses = async (prisma: PrismaClient) => {
    console.log('Додаємо класи...')

    const classes: ClassCreateInput[] = [
        {
            name: Classes.FIGHTER_2014,
            sortOrder: 5,
            hitDie: 10,
            spellcastingType: SpellcastingType.NONE,
            abilityScoreUpLevels: [4, 6, 8, 12, 14, 16, 19],
            subclassLevel: 3,
            multiclassReqs: {
                choice: ['STR', 'DEX'],
                score: 13,
            },

            armorProficiencies: [ArmorType.HEAVY, ArmorType.MEDIUM, ArmorType.LIGHT, ArmorType.SHIELD],
            weaponProficiencies: [WeaponType.SIMPLE_WEAPON, WeaponType.MARTIAL_WEAPON],
            savingThrows: [Ability.STR, Ability.CON],
            skillProficiencies: {
                options: [
                    Skills.ANIMAL_HANDLING,
                    Skills.ACROBATICS,
                    Skills.ATHLETICS,
                    Skills.HISTORY,
                    Skills.INSIGHT,
                    Skills.INTIMIDATION,
                    Skills.PERCEPTION,
                    Skills.SURVIVAL
                ],
                choiceCount: 2
            },

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Second Wind" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Action Surge" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Extra Attack" } },
                        levelGranted: 5,
                    },
                    {
                        feature: { connect: { engName: "Indomitable" } },
                        levelGranted: 9,
                    },
                ],
            }
        },
        {
            name: Classes.BARBARIAN_2014,
            sortOrder: 1,
            hitDie: 12,
            abilityScoreUpLevels: [4, 8, 12, 16, 19],
            subclassLevel: 3,
            multiclassReqs: {
                required: ['STR'],
                score: 13,
            },

            armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.SHIELD],
            weaponProficiencies: [WeaponType.SIMPLE_WEAPON, WeaponType.MARTIAL_WEAPON],
            savingThrows: [Ability.STR, Ability.CON],
            skillProficiencies: {
                options: [
                    Skills.ANIMAL_HANDLING,
                    Skills.ATHLETICS,
                    Skills.INTIMIDATION,
                    Skills.NATURE,
                    Skills.PERCEPTION,
                    Skills.SURVIVAL
                ],
                choiceCount: 2
            },

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Rage" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Unarmored Defense" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Reckless Attack" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Danger Sense" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Barbarian Extra Attack" } },
                        levelGranted: 5,
                    },
                    {
                        feature: { connect: { engName: "Fast Movement" } },
                        levelGranted: 5,
                    },
                    {
                        feature: { connect: { engName: "Feral Instinct" } },
                        levelGranted: 7,
                    },
                    {
                        feature: { connect: { engName: "Brutal Critical" } },
                        levelGranted: 9,
                    },
                    {
                        feature: { connect: { engName: "Relentless Rage" } },
                        levelGranted: 11,
                    },
                    {
                        feature: { connect: { engName: "Persistent Rage" } },
                        levelGranted: 15,
                    },
                    {
                        feature: { connect: { engName: "Indomitable Might" } },
                        levelGranted: 18,
                    },
                    {
                        feature: { connect: { engName: "Primal Champion" } },
                        levelGranted: 20,
                    },
                ],
            }
        },
        // КЛАС МОНАХА
        {
            name: Classes.MONK_2014,
            sortOrder: 6,
            hitDie: 8,
            abilityScoreUpLevels: [4, 8, 12, 16, 19],
            subclassLevel: 3,
            multiclassReqs: {
                required: ['DEX', 'WIS'], // Обидва required!
                score: 13,
            },

            armorProficiencies: [], // Ніякої броні! 💪
            weaponProficiencies: [WeaponType.SIMPLE_WEAPON], // + shortswords окремо
            weaponProficienciesSpecial: {
                specific: [WeaponCategory.SHORTSWORD]
            }, // Додай спеціальне поле
            savingThrows: [Ability.STR, Ability.DEX],
            skillProficiencies: {
                options: [
                    Skills.ACROBATICS,
                    Skills.ATHLETICS,
                    Skills.HISTORY,
                    Skills.INSIGHT,
                    Skills.RELIGION,
                    Skills.STEALTH
                ],
                choiceCount: 2
            },
            toolProficiencies: [],
            toolToChooseCount: 1, // Один musical instrument або artisan's tools

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Unarmored Defense (Monk)" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Martial Arts" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Ki" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Unarmored Movement" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Deflect Missiles" } },
                        levelGranted: 3,
                    },
                    {
                        feature: { connect: { engName: "Slow Fall" } },
                        levelGranted: 4,
                    },
                    {
                        feature: { connect: { engName: "Extra Attack (Monk)" } },
                        levelGranted: 5,
                    },
                    {
                        feature: { connect: { engName: "Stunning Strike" } },
                        levelGranted: 5,
                    },
                    {
                        feature: { connect: { engName: "Ki-Empowered Strikes" } },
                        levelGranted: 6,
                    },
                    {
                        feature: { connect: { engName: "Evasion" } },
                        levelGranted: 7,
                    },
                    {
                        feature: { connect: { engName: "Stillness of Mind" } },
                        levelGranted: 7,
                    },
                    {
                        feature: { connect: { engName: "Unarmored Movement (Vertical)" } },
                        levelGranted: 9,
                    },
                    {
                        feature: { connect: { engName: "Purity of Body" } },
                        levelGranted: 10,
                    },
                    {
                        feature: { connect: { engName: "Tongue of the Sun and Moon" } },
                        levelGranted: 13,
                    },
                    {
                        feature: { connect: { engName: "Diamond Soul" } },
                        levelGranted: 14,
                    },
                    {
                        feature: { connect: { engName: "Timeless Body" } },
                        levelGranted: 15,
                    },
                    {
                        feature: { connect: { engName: "Empty Body" } },
                        levelGranted: 18,
                    },
                    {
                        feature: { connect: { engName: "Perfect Self" } },
                        levelGranted: 20,
                    },
                ],
            }
        },

        // RANGER CLASS
        {
            name: Classes.RANGER_2014,
            sortOrder: 8,
            hitDie: 10,
            primaryCastingStat: 'WIS',
            spellcastingType: SpellcastingType.HALF, // половинний кастер
            abilityScoreUpLevels: [4, 8, 12, 16, 19],
            subclassLevel: 3,
            multiclassReqs: {
                required: ['DEX', 'WIS'], // Обидва DEX і WIS мають бути 13+
                score: 13,
            },

            armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.SHIELD],
            weaponProficiencies: [WeaponType.SIMPLE_WEAPON, WeaponType.MARTIAL_WEAPON],
            savingThrows: [Ability.STR, Ability.DEX],
            skillProficiencies: {
                options: [
                    Skills.ANIMAL_HANDLING,
                    Skills.ATHLETICS,
                    Skills.INSIGHT,
                    Skills.INVESTIGATION,
                    Skills.NATURE,
                    Skills.PERCEPTION,
                    Skills.STEALTH,
                    Skills.SURVIVAL
                ],
                choiceCount: 3 // Вибирає 3 навички
            },

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Spellcasting (Ranger)" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Extra Attack (Ranger)" } },
                        levelGranted: 5,
                    },
                    {
                        feature: { connect: { engName: "Land\'s Stride" } },
                        levelGranted: 8,
                    },
                    {
                        feature: { connect: { engName: "Vanish" } },
                        levelGranted: 14,
                    },
                    {
                        feature: { connect: { engName: "Feral Senses" } },
                        levelGranted: 18,
                    },
                    {
                        feature: { connect: { engName: "Foe Slayer" } },
                        levelGranted: 20,
                    },
                ],
            }
        },

        // У seedClasses додай:

        {
            name: Classes.PALADIN_2014,
            sortOrder: 7,
            hitDie: 10,
            primaryCastingStat: 'CHA',
            spellcastingType: SpellcastingType.HALF, // півкастер з підготовкою
            abilityScoreUpLevels: [4, 8, 12, 16, 19],
            subclassLevel: 3,
            multiclassReqs: {
                required: ['STR', 'CHA'], // Обидва STR і CHA мають бути 13+
                score: 13,
            },

            armorProficiencies: [
                ArmorType.LIGHT,
                ArmorType.MEDIUM,
                ArmorType.HEAVY,
                ArmorType.SHIELD
            ],
            weaponProficiencies: [
                WeaponType.SIMPLE_WEAPON,
                WeaponType.MARTIAL_WEAPON
            ],
            savingThrows: [Ability.WIS, Ability.CHA],
            skillProficiencies: {
                options: [
                    Skills.ATHLETICS,
                    Skills.INSIGHT,
                    Skills.INTIMIDATION,
                    Skills.MEDICINE,
                    Skills.PERSUASION,
                    Skills.RELIGION
                ],
                choiceCount: 2 // Вибирає 2 навички
            },

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Divine Sense" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Lay on Hands" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Spellcasting (Paladin)" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Divine Smite" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Divine Health" } },
                        levelGranted: 3,
                    },
                    {
                        feature: { connect: { engName: "Sacred Oath" } },
                        levelGranted: 3,
                    },
                    {
                        feature: { connect: { engName: "Channel Divinity" } },
                        levelGranted: 3,
                    },
                    {
                        feature: { connect: { engName: "Oath Spells" } },
                        levelGranted: 3,
                    },
                    {
                        feature: { connect: { engName: "Extra Attack (Paladin)" } },
                        levelGranted: 5,
                    },
                    {
                        feature: { connect: { engName: "Aura of Protection" } },
                        levelGranted: 6,
                    },
                    {
                        feature: { connect: { engName: "Aura of Courage" } },
                        levelGranted: 10,
                    },
                    {
                        feature: { connect: { engName: "Improved Divine Smite" } },
                        levelGranted: 11,
                    },
                    {
                        feature: { connect: { engName: "Cleansing Touch" } },
                        levelGranted: 14,
                    },
                ],
            }
        },

        // У seedClasses додай:

        {
            name: Classes.ROGUE_2014,
            sortOrder: 9,
            hitDie: 8,
            spellcastingType: SpellcastingType.NONE,
            abilityScoreUpLevels: [4, 8, 10, 12, 16, 19], // ☝️ УВАГА: Rogue має ASI на 10 рівні!
            subclassLevel: 3,
            multiclassReqs: {
                required: ['DEX'],
                score: 13,
            },

            armorProficiencies: [ArmorType.LIGHT],
            weaponProficiencies: [WeaponType.SIMPLE_WEAPON],
            weaponProficienciesSpecial: {
                specific: [
                    WeaponCategory.LIGHT_CROSSBOW,
                    WeaponCategory.LONGSWORD,
                    WeaponCategory.RAPIER,
                    WeaponCategory.SHORTSWORD
                ]
            },
            savingThrows: [Ability.DEX, Ability.INT],
            skillProficiencies: {
                options: [
                    Skills.ACROBATICS,
                    Skills.ATHLETICS,
                    Skills.DECEPTION,
                    Skills.INSIGHT,
                    Skills.INTIMIDATION,
                    Skills.INVESTIGATION,
                    Skills.PERCEPTION,
                    Skills.PERFORMANCE,
                    Skills.PERSUASION,
                    Skills.SLEIGHT_OF_HAND,
                    Skills.STEALTH
                ],
                choiceCount: 4 // ☝️ Вибирає 4 навички - найбільше серед усіх класів!
            },
            toolProficiencies: [ToolCategory.THIEVES_TOOLS],

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Expertise" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Sneak Attack" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Thieves' Cant" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Cunning Action" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Roguish Archetype" } },
                        levelGranted: 3,
                    },
                    {
                        feature: { connect: { engName: "Uncanny Dodge" } },
                        levelGranted: 5,
                    },
                    {
                        feature: { connect: { engName: "Expertise 2" } },
                        levelGranted: 6,
                    },
                    {
                        feature: { connect: { engName: "Evasion" } },
                        levelGranted: 7,
                    },
                    {
                        feature: { connect: { engName: "Reliable Talent" } },
                        levelGranted: 11,
                    },
                    {
                        feature: { connect: { engName: "Blindsense" } },
                        levelGranted: 14,
                    },
                    {
                        feature: { connect: { engName: "Slippery Mind" } },
                        levelGranted: 15,
                    },
                    {
                        feature: { connect: { engName: "Elusive" } },
                        levelGranted: 18,
                    },
                    {
                        feature: { connect: { engName: "Stroke of Luck" } },
                        levelGranted: 20,
                    },
                ],
            }
        },


        {
            name: Classes.SORCERER_2014,
            sortOrder: 10,
            hitDie: 6,
            primaryCastingStat: Ability.CHA,
            spellcastingType: SpellcastingType.FULL,
            abilityScoreUpLevels: [4, 8, 12, 16, 19],
            subclassLevel: 1,
            multiclassReqs: {
                required: ['CHA'],
                score: 13,
            },

            armorProficiencies: [],
            weaponProficiencies: [],
            weaponProficienciesSpecial: {
                specific: [
                    WeaponCategory.DAGGER,
                    WeaponCategory.DART,
                    WeaponCategory.SLING,
                    WeaponCategory.QUARTERSTAFF,
                    WeaponCategory.LIGHT_CROSSBOW,
                ]
            },
            savingThrows: [Ability.CON, Ability.CHA],
            skillProficiencies: {
                options: [
                    Skills.ARCANA,
                    Skills.DECEPTION,
                    Skills.INSIGHT,
                    Skills.INTIMIDATION,
                    Skills.PERSUASION,
                    Skills.RELIGION,
                ],
                choiceCount: 2
            },

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Spellcasting (Sorcerer)" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Sorcerous Origin" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Font of Magic" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Metamagic" } },
                        levelGranted: 3,
                    },
                    {
                        feature: { connect: { engName: "Sorcerous Restoration" } },
                        levelGranted: 20,
                    },
                ],
            }
        },

        {
            name: Classes.WIZARD_2014,
            sortOrder: 12,
            hitDie: 6,
            primaryCastingStat: Ability.INT,
            spellcastingType: SpellcastingType.FULL,
            abilityScoreUpLevels: [4, 8, 12, 16, 19],
            subclassLevel: 2,
            multiclassReqs: {
                required: ['INT'],
                score: 13,
            },

            armorProficiencies: [],
            weaponProficiencies: [],
            weaponProficienciesSpecial: {
                specific: [
                    WeaponCategory.DAGGER,
                    WeaponCategory.DART,
                    WeaponCategory.SLING,
                    WeaponCategory.QUARTERSTAFF,
                    WeaponCategory.LIGHT_CROSSBOW,
                ]
            },
            savingThrows: [Ability.INT, Ability.WIS],
            skillProficiencies: {
                options: [
                    Skills.ARCANA,
                    Skills.HISTORY,
                    Skills.INSIGHT,
                    Skills.INVESTIGATION,
                    Skills.MEDICINE,
                    Skills.RELIGION,
                ],
                choiceCount: 2
            },

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Spellcasting (Wizard)" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Arcane Recovery" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Arcane Tradition" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Spell Mastery" } },
                        levelGranted: 18,
                    },
                    {
                        feature: { connect: { engName: "Signature Spells" } },
                        levelGranted: 20,
                    },
                ],
            }
        },


        {
            name: Classes.WARLOCK_2014,
            sortOrder: 11,
            hitDie: 8,
            primaryCastingStat: Ability.CHA,
            spellcastingType: SpellcastingType.PACT, // ☝️ Унікальна Pact Magic система!
            abilityScoreUpLevels: [4, 8, 12, 16, 19],
            subclassLevel: 1, // ☝️ УВАГА: Patron вибирається на 1 рівні!
            multiclassReqs: {
                required: ['CHA'],
                score: 13,
            },

            armorProficiencies: [ArmorType.LIGHT],
            weaponProficiencies: [WeaponType.SIMPLE_WEAPON],
            savingThrows: [Ability.WIS, Ability.CHA],
            skillProficiencies: {
                options: [
                    Skills.ARCANA,
                    Skills.DECEPTION,
                    Skills.HISTORY,
                    Skills.INTIMIDATION,
                    Skills.INVESTIGATION,
                    Skills.NATURE,
                    Skills.RELIGION
                ],
                choiceCount: 2 // Вибирає 2 навички
            },

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Pact Magic" } },
                        levelGranted: 1,
                        grantsSpellSlots: true,
                    },
                    {
                        feature: { connect: { engName: "Eldritch Invocations" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "Pact Boon" } },
                        levelGranted: 3,
                    },
                    {
                        feature: { connect: { engName: "Mystic Arcanum (6th level)" } },
                        levelGranted: 11,
                    },
                    {
                        feature: { connect: { engName: "Mystic Arcanum (7th level)" } },
                        levelGranted: 13,
                    },
                    {
                        feature: { connect: { engName: "Mystic Arcanum (8th level)" } },
                        levelGranted: 15,
                    },
                    {
                        feature: { connect: { engName: "Mystic Arcanum (9th level)" } },
                        levelGranted: 17,
                    },
                    {
                        feature: { connect: { engName: "Eldritch Master" } },
                        levelGranted: 20,
                    },
                ],
            }
        },

        {
            name: Classes.ARTIFICER_2014,
            hitDie: 8,
            primaryCastingStat: Ability.INT,
            spellcastingType: SpellcastingType.HALF,
            abilityScoreUpLevels: [4, 8, 12, 16, 19],
            subclassLevel: 3,
            multiclassReqs: {
                required: ['INT'],
                score: 13,
            },

            armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.SHIELD],
            weaponProficiencies: [WeaponType.SIMPLE_WEAPON],
            savingThrows: [Ability.CON, Ability.INT],
            skillProficiencies: {
                options: [
                    Skills.ARCANA,
                    Skills.HISTORY,
                    Skills.INVESTIGATION,
                    Skills.MEDICINE,
                    Skills.NATURE,
                    Skills.PERCEPTION,
                    Skills.SLEIGHT_OF_HAND
                ],
                choiceCount: 2
            },
            toolProficiencies: [ToolCategory.THIEVES_TOOLS],
            toolToChooseCount: 2, // Tinker's tools + 1 artisan's tool

            features: {
                create: [
                    {
                        feature: { connect: { engName: "Magical Tinkering" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Spellcasting (Artificer)" } },
                        levelGranted: 1,
                    },
                    {
                        feature: { connect: { engName: "Infuse Item" } },
                        levelGranted: 2,
                    },
                    {
                        feature: { connect: { engName: "The Right Tool for the Job" } },
                        levelGranted: 3,
                    },
                    {
                        feature: { connect: { engName: "Tool Expertise" } },
                        levelGranted: 6,
                    },
                    {
                        feature: { connect: { engName: "Flash of Genius" } },
                        levelGranted: 7,
                    },
                    {
                        feature: { connect: { engName: "Magic Item Adept" } },
                        levelGranted: 10,
                    },
                    {
                        feature: { connect: { engName: "Spell-Storing Item" } },
                        levelGranted: 11,
                    },
                    {
                        feature: { connect: { engName: "Magic Item Savant" } },
                        levelGranted: 14,
                    },
                    {
                        feature: { connect: { engName: "Magic Item Master" } },
                        levelGranted: 18,
                    },
                    {
                        feature: { connect: { engName: "Soul of Artifice" } },
                        levelGranted: 20,
                    },
                ],
            }
        }



    ]

    
    for (const class_ of classes) {
        const featureCreates = Array.isArray(class_.features?.create)
            ? class_.features?.create ?? []
            : class_.features?.create
                ? [class_.features.create]
                : [];

        const { features, ...classData } = class_;

        try {
            const savedClass = await prisma.class.upsert({
                where: { name: class_.name },
                update: classData,
                create: classData
            });

            for (const entry of featureCreates) {
                const engName = (entry as any)?.feature?.connect?.engName as string | undefined;
                if (!engName) continue;

                const feature = await prisma.feature.findUnique({ where: { engName } });
                if (!feature) {
                    console.warn(`Feature with engName=${engName} not found, skip linking to class ${class_.name}`);
                    continue;
                }

                const existing = await prisma.classFeature.findFirst({
                    where: { classId: savedClass.classId, featureId: feature.featureId },
                });

                const data = {
                    classId: savedClass.classId,
                    featureId: feature.featureId,
                    levelGranted: (entry as any)?.levelGranted ?? 1,
                    grantsSpellSlots: (entry as any)?.grantsSpellSlots ?? false,
                };

                if (existing) {
                    if (
                        existing.levelGranted !== data.levelGranted ||
                        existing.grantsSpellSlots !== data.grantsSpellSlots
                    ) {
                        await prisma.classFeature.update({
                            where: { classFeatureId: existing.classFeatureId },
                            data,
                        });
                    }
                } else {
                    await prisma.classFeature.create({ data });
                }
            }
        } catch (error) {
            console.error('Failed to upsert class:', class_.name);
            console.error('Class payload:', JSON.stringify(class_, null, 2));
            console.error('Error:', error);

            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                console.error('Prisma Error Code:', error.code);
                console.error('Meta:', error.meta);

                if (error.code === 'P2025') {
                    console.error('Record to connect not found:', error.meta?.cause);
                }
            }
        }
    }



    console.log(`✅ додано ${classes.length} класів!`)
}

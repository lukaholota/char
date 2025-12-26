import { PrismaClient, Subraces, Source, Races, Language, WeaponCategory, ArmorType } from "@prisma/client";

export const seedSubraces = async (prisma: PrismaClient) => {
    console.log('🧝 Додаємо підраси Ельфів...');
    console.log('🧔 Додаємо підраси Дварфів...');
    console.log('🧔‍♂️ Додаємо підраси Напівросликів...');
    console.log('🧙 Додаємо підраси Гномів...');

    const elf = await prisma.race.findFirst({ where: { name: Races.ELF_2014 } });
    if (!elf) {
        throw new Error("Elf race not found");
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

    const MPMM_ASI = {
        tasha: {
            flexible: {
                groups: [
                    {
                        groupName: '+1 до Двох',
                        value: 1,
                        choiceCount: 2,
                        unique: false
                    },
                    {
                        groupName: '+1 до Однієї',
                        value: 1,
                        choiceCount: 1,
                        unique: false
                    },
                ]
            },
        },
    };

    const connectFeature = (engName: string) => ({ feature: { connect: { engName } } });

    const subraces = [
        // ============ HIGH ELF (PHB) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_HIGH_2014,
            source: Source.PHB,
            additionalASI: { INT: 1 },
            languagesToChooseCount: 1, 
            weaponProficiencies: {
               category: [WeaponCategory.LONGSWORD, WeaponCategory.SHORTSWORD, WeaponCategory.SHORTBOW, WeaponCategory.LONGBOW]
            },
            traits: {
                create: [
                    connectFeature('Elf Weapon Training'),
                    connectFeature('High Elf Cantrip'),
                    connectFeature('Extra Language')
                ]
            }
        },
        // ============ WOOD ELF (PHB) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_WOOD_2014,
            source: Source.PHB,
            additionalASI: { WIS: 1 },
            speedModifier: 5,
            weaponProficiencies: {
               category: [WeaponCategory.LONGSWORD, WeaponCategory.SHORTSWORD, WeaponCategory.SHORTBOW, WeaponCategory.LONGBOW]
            },
            traits: {
                create: [
                    connectFeature('Elf Weapon Training'),
                    connectFeature('Mask of the Wild')
                ]
            }
        },
        // ============ DROW (PHB) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_DARK_DROW_2014,
            source: Source.PHB,
            additionalASI: { CHA: 1 },
            weaponProficiencies: {
               category: [WeaponCategory.RAPIER, WeaponCategory.SHORTSWORD, WeaponCategory.HAND_CROSSBOW]
            },
            traits: {
                create: [
                    connectFeature('Superior Darkvision (Drow)'),
                    connectFeature('Sunlight Sensitivity'),
                    connectFeature('Drow Magic'),
                    connectFeature('Drow Weapon Training')
                ]
            }
        },
        // ============ ELADRIN (DMG) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_ELADRIN_DMG,
            source: Source.DMG,
            additionalASI: { INT: 1 },
            weaponProficiencies: {
               category: [WeaponCategory.LONGSWORD, WeaponCategory.SHORTSWORD, WeaponCategory.SHORTBOW, WeaponCategory.LONGBOW]
            },
            traits: {
                create: [
                    connectFeature('Elf Weapon Training'),
                    connectFeature('Fey Step (DMG)')
                ]
            }
        },
        // ============ ELADRIN (MPMM) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_ELADRIN_MPMM,
            source: Source.MPMM,
            replacesASI: true,
            additionalASI: MPMM_ASI,
            traits: {
                create: [
                    connectFeature('Fey Step')
                ]
            }
        },
        // ============ SEA ELF (MTOF) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_SEA_MTOF,
            source: Source.MTOF,
            additionalASI: { CON: 1 },
            swimSpeed: 30,
            weaponProficiencies: {
                category: [WeaponCategory.SPEAR, WeaponCategory.TRIDENT, WeaponCategory.LIGHT_CROSSBOW, WeaponCategory.NET]
            },
            additionalLanguages: [Language.AQUAN],
            traits: {
                create: [
                    connectFeature('Child of the Sea'),
                    connectFeature('Friend of the Sea')
                ]
            }
        },
        // ============ SHADAR-KAI (MPMM) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_SHADAR_KAI_MPMM,
            source: Source.MPMM,
            replacesASI: true,
            additionalASI: MPMM_ASI,
            traits: {
                create: [
                    connectFeature('Necrotic Resistance'),
                    connectFeature('Blessing of the Raven Queen'),
                    connectFeature('Keen Senses')
                ]
            }
        },
        // ============ PALLID ELF (EGTW) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_PALLID_EGTW,
            source: Source.EGTW,
            additionalASI: { WIS: 1 },
            traits: {
                create: [
                    connectFeature('Incisive Sense'),
                    connectFeature('Blessing of the Moon Weaver')
                ]
            }
        },
        
        // ============ HILL DWARF (PHB) ============
        {
            raceId: dwarf.raceId,
            name: Subraces.DWARF_HILL_2014,
            source: Source.PHB,
            additionalASI: { WIS: 1 },
            traits: {
                create: [
                    connectFeature('Dwarven Toughness')
                ]
            }
        },
        // ============ MOUNTAIN DWARF (PHB) ============
        {
            raceId: dwarf.raceId,
            name: Subraces.DWARF_MOUNTAIN_2014,
            source: Source.PHB,
            additionalASI: { STR: 2 },
            armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM],
            traits: {
                create: [
                    connectFeature('Dwarven Armor Training')
                ]
            }
        },
        // ============ DUERGAR (GRAY DWARF) (SCAG) ============
        {
            raceId: dwarf.raceId,
            name: Subraces.DWARF_DUERGAR_GRAY_SCAG,
            source: Source.SCAG,
            additionalASI: { STR: 1 },
            traits: {
                create: [
                    connectFeature('Superior Darkvision (Duergar)'),
                    connectFeature('Duergar Resilience'),
                    connectFeature('Duergar Magic'),
                    connectFeature('Sunlight Sensitivity')
                ]
            }
        },
        
        // ============ LIGHTFOOT HALFLING (PHB) ============
        {
            raceId: halfling.raceId,
            name: Subraces.HALFLING_LIGHTFOOT_2014,
            source: Source.PHB,
            additionalASI: { CHA: 1 },
            traits: {
                create: [
                    connectFeature('Naturally Stealthy')
                ]
            }
        },
        // ============ STOUT HALFLING (PHB) ============
        {
            raceId: halfling.raceId,
            name: Subraces.HALFLING_STOUT_2014,
            source: Source.PHB,
            additionalASI: { CON: 1 },
            traits: {
                create: [
                    connectFeature('Stout Resilience')
                ]
            }
        },
        // ============ GHOSTWISE HALFLING (SCAG) ============
        {
            raceId: halfling.raceId,
            name: Subraces.HALFLING_GHOSTWISE_SCAG,
            source: Source.SCAG,
            additionalASI: { WIS: 1 },
            traits: {
                create: [
                    connectFeature('Silent Speech')
                ]
            }
        },
        
        // ============ FOREST GNOME (PHB) ============
        {
            raceId: gnome.raceId,
            name: Subraces.GNOME_FOREST_2014,
            source: Source.PHB,
            additionalASI: { DEX: 1 },
            traits: {
                create: [
                    connectFeature('Natural Illusionist'),
                    connectFeature('Speak with Small Beasts')
                ]
            }
        },
        // ============ ROCK GNOME (PHB) ============
        {
            raceId: gnome.raceId,
            name: Subraces.GNOME_ROCK_2014,
            source: Source.PHB,
            additionalASI: { CON: 1 },
            toolProficiencies: {
                category: ["ARTISAN_TINKER"]
            },
            traits: {
                create: [
                    connectFeature('Artificer\'s Lore'),
                    connectFeature('Tinker')
                ]
            }
        },
        // ============ DEEP GNOME (SVIRFNEBLIN) (SCAG) ============
        {
            raceId: gnome.raceId,
            name: Subraces.GNOME_DEEP_SCAG,
            source: Source.SCAG,
            additionalASI: { DEX: 1 },
            traits: {
                create: [
                    connectFeature('Superior Darkvision (Deep Gnome)'),
                    connectFeature('Stone Camouflage')
                ]
            }
        },
        
    ];

    for (const subrace of subraces) {
        await prisma.subrace.upsert({
            where: { name: subrace.name },
            update: subrace,
            create: subrace
        });
    }

    console.log(`✅ Додано ${subraces.length} підрас (Ельфи, Дварфи, Напіврослики, Гноми, Дракононароджені)!`);
}

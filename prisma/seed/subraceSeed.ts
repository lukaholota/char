import { PrismaClient, Subraces, Source, Races, Language, WeaponCategory, ArmorType, Ruleset } from "@prisma/client";

const ACTIVE_RULESET: Ruleset = "RULES_2014";

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

        // На повторних запусках seed-а в "subrace_trait" могли зʼявитися дублікати.
        // Прибираємо їх, залишаючи найменший subrace_trait_id для кожної пари (subrace_id, feature_id).
        await prisma.$executeRaw`
                DELETE FROM "subrace_trait" a
                USING "subrace_trait" b
                WHERE a."subrace_id" = b."subrace_id"
                    AND a."feature_id" = b."feature_id"
                    AND a."subrace_trait_id" > b."subrace_trait_id";
        `

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
            traitEngNames: ['Elf Weapon Training', 'High Elf Cantrip', 'Extra Language']
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
            traitEngNames: ['Elf Weapon Training', 'Mask of the Wild']
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
            traitEngNames: ['Superior Darkvision (Drow)', 'Sunlight Sensitivity', 'Drow Magic', 'Drow Weapon Training']
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
            traitEngNames: ['Elf Weapon Training', 'Fey Step (DMG)']
        },
        // ============ ELADRIN (MPMM) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_ELADRIN_MPMM,
            source: Source.MPMM,
            replacesASI: true,
            additionalASI: MPMM_ASI,
            traitEngNames: ['Fey Step']
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
            traitEngNames: ['Child of the Sea (Sea Elf Subrace)', 'Friend of the Sea (Sea Elf Subrace)']
        },
        // ============ SHADAR-KAI (MPMM) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_SHADAR_KAI_MPMM,
            source: Source.MPMM,
            replacesASI: true,
            additionalASI: MPMM_ASI,
            traitEngNames: ['Necrotic Resistance (Shadar-kai Subrace)', 'Blessing of the Raven Queen (Shadar-kai Subrace)', 'Keen Senses']
        },
        // ============ PALLID ELF (EGTW) ============
        {
            raceId: elf.raceId,
            name: Subraces.ELF_PALLID_EGTW,
            source: Source.EGTW,
            additionalASI: { WIS: 1 },
            traitEngNames: ['Incisive Sense', 'Blessing of the Moon Weaver']
        },
        
        // ============ HILL DWARF (PHB) ============
        {
            raceId: dwarf.raceId,
            name: Subraces.DWARF_HILL_2014,
            source: Source.PHB,
            additionalASI: { WIS: 1 },
            traitEngNames: ['Dwarven Toughness (Hill Dwarf Subrace)']
        },
        // ============ MOUNTAIN DWARF (PHB) ============
        {
            raceId: dwarf.raceId,
            name: Subraces.DWARF_MOUNTAIN_2014,
            source: Source.PHB,
            additionalASI: { STR: 2 },
            armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM],
            traitEngNames: ['Dwarven Armor Training (Mountain Dwarf Subrace)']
        },
        // ============ DUERGAR (GRAY DWARF) (SCAG) ============
        {
            raceId: dwarf.raceId,
            name: Subraces.DWARF_DUERGAR_GRAY_SCAG,
            source: Source.SCAG,
            additionalASI: { STR: 1 },
            traitEngNames: ['Superior Darkvision (Duergar)', 'Duergar Resilience (Duergar Subrace)', 'Duergar Magic (Duergar Subrace)', 'Sunlight Sensitivity']
        },
        
        // ============ LIGHTFOOT HALFLING (PHB) ============
        {
            raceId: halfling.raceId,
            name: Subraces.HALFLING_LIGHTFOOT_2014,
            source: Source.PHB,
            additionalASI: { CHA: 1 },
            traitEngNames: ['Naturally Stealthy']
        },
        // ============ STOUT HALFLING (PHB) ============
        {
            raceId: halfling.raceId,
            name: Subraces.HALFLING_STOUT_2014,
            source: Source.PHB,
            additionalASI: { CON: 1 },
            traitEngNames: ['Stout Resilience']
        },
        // ============ GHOSTWISE HALFLING (SCAG) ============
        {
            raceId: halfling.raceId,
            name: Subraces.HALFLING_GHOSTWISE_SCAG,
            source: Source.SCAG,
            additionalASI: { WIS: 1 },
            traitEngNames: ['Silent Speech']
        },
        
        // ============ FOREST GNOME (PHB) ============
        {
            raceId: gnome.raceId,
            name: Subraces.GNOME_FOREST_2014,
            source: Source.PHB,
            additionalASI: { DEX: 1 },
            traitEngNames: ['Natural Illusionist', 'Speak with Small Beasts']
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
            traitEngNames: ['Artificer\'s Lore', 'Tinker']
        },
        // ============ DEEP GNOME (SVIRFNEBLIN) (SCAG) ============
        {
            raceId: gnome.raceId,
            name: Subraces.GNOME_DEEP_SCAG,
            source: Source.SCAG,
            additionalASI: { DEX: 1 },
            traitEngNames: ['Superior Darkvision (Deep Gnome)', 'Stone Camouflage (Deep Gnome Subrace)']
        },
        
    ];

    for (const subrace of subraces) {
        // traits робимо окремо, щоб повторний seed не створював дублікати у join-таблиці
        const { traitEngNames, ...subraceData } = subrace as any;

        const saved = await prisma.subrace.upsert({
            where: { name_ruleset: { name: subraceData.name, ruleset: ACTIVE_RULESET } },
            update: subraceData,
            create: subraceData
        });

        const desiredFeatureRows = await prisma.feature.findMany({
            where: { engName: { in: traitEngNames } },
            select: { featureId: true, engName: true }
        });

        const found = new Set(desiredFeatureRows.map(f => f.engName));
        for (const engName of traitEngNames) {
            if (!found.has(engName)) {
                console.warn(`⚠️ Не знайдена фіча для підраси ${saved.name}: ${engName}`);
            }
        }

        const desiredFeatureIds = desiredFeatureRows.map(f => f.featureId);

        // Видаляємо звʼязки, яких більше не має бути
        await prisma.subraceTrait.deleteMany({
            where: {
                subraceId: saved.subraceId,
                ...(desiredFeatureIds.length
                    ? { NOT: { featureId: { in: desiredFeatureIds } } }
                    : {}),
            }
        });

        // Додаємо відсутні звʼязки
        if (desiredFeatureIds.length) {
            const existing = await prisma.subraceTrait.findMany({
                where: { subraceId: saved.subraceId, featureId: { in: desiredFeatureIds } },
                select: { featureId: true }
            });
            const existingIds = new Set(existing.map(e => e.featureId));
            const toCreate = desiredFeatureIds
                .filter(featureId => !existingIds.has(featureId))
                .map(featureId => ({ subraceId: saved.subraceId, featureId }));

            if (toCreate.length) {
                await prisma.subraceTrait.createMany({ data: toCreate });
            }
        }
    }

    console.log(`✅ Додано ${subraces.length} підрас (Ельфи, Дварфи, Напіврослики, Гноми, Дракононароджені)!`);
}

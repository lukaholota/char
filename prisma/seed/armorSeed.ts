import { PrismaClient, Prisma, ArmorCategory, ArmorType, Ability, AbilityBonusType } from "@prisma/client";

export const seedArmor = async (prisma: PrismaClient) => {
    console.log('Seeding armor...')

    const armors: Prisma.ArmorCreateInput[] = [
        // ==================== LIGHT ARMOR ====================
        {
            name: ArmorCategory.PADDED,
            armorType: ArmorType.LIGHT,
            baseAC: 11,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.FULL,
            strengthReq: null,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.LEATHER,
            armorType: ArmorType.LIGHT,
            baseAC: 11,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.FULL,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.STUDDED_LEATHER,
            armorType: ArmorType.LIGHT,
            baseAC: 12,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.FULL,
            strengthReq: null,
            stealthDisadvantage: false
        },

        // ==================== MEDIUM ARMOR ====================
        {
            name: ArmorCategory.HIDE,
            armorType: ArmorType.MEDIUM,
            baseAC: 12,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.MAX2,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.CHAIN_SHIRT,
            armorType: ArmorType.MEDIUM,
            baseAC: 13,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.MAX2,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.SCALE_MAIL,
            armorType: ArmorType.MEDIUM,
            baseAC: 14,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.MAX2,
            strengthReq: null,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.BREASTPLATE,
            armorType: ArmorType.MEDIUM,
            baseAC: 14,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.MAX2,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.HALF_PLATE,
            armorType: ArmorType.MEDIUM,
            baseAC: 15,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.MAX2,
            strengthReq: null,
            stealthDisadvantage: true
        },

        // ==================== HEAVY ARMOR ====================
        {
            name: ArmorCategory.RING_MAIL,
            armorType: ArmorType.HEAVY,
            baseAC: 14,
            abilityBonuses: [],
            abilityBonusType: AbilityBonusType.NONE,
            strengthReq: null,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.CHAIN_MAIL,
            armorType: ArmorType.HEAVY,
            baseAC: 16,
            abilityBonuses: [],
            abilityBonusType: AbilityBonusType.NONE,
            strengthReq: 13,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.SPLINT,
            armorType: ArmorType.HEAVY,
            baseAC: 17,
            abilityBonuses: [],
            abilityBonusType: AbilityBonusType.NONE,
            strengthReq: 15,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.PLATE,
            armorType: ArmorType.HEAVY,
            baseAC: 18,
            abilityBonuses: [],
            abilityBonusType: AbilityBonusType.NONE,
            strengthReq: 15,
            stealthDisadvantage: true
        },

        // ==================== SHIELD ====================
        {
            name: ArmorCategory.SHIELD,
            armorType: ArmorType.SHIELD,
            baseAC: 2,
            abilityBonuses: [],
            abilityBonusType: AbilityBonusType.NONE,
            strengthReq: null,
            stealthDisadvantage: false
        },

        // ==================== SPECIAL AC SOURCES ====================
        // These are used to represent unarmored defense / natural armor as explicit equipable entries.
        {
            name: ArmorCategory.UNARMORED_DEFENSE_MONK,
            armorType: ArmorType.LIGHT,
            baseAC: 10,
            abilityBonuses: [Ability.DEX, Ability.WIS],
            abilityBonusType: AbilityBonusType.FULL,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.UNARMORED_DEFENSE_BARBARIAN,
            armorType: ArmorType.LIGHT,
            baseAC: 10,
            abilityBonuses: [Ability.DEX, Ability.CON],
            abilityBonusType: AbilityBonusType.FULL,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.NATURAL_ARMOR_TORTLE,
            armorType: ArmorType.LIGHT,
            baseAC: 17,
            abilityBonuses: [],
            abilityBonusType: AbilityBonusType.NONE,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.NATURAL_ARMOR_13_DEX,
            armorType: ArmorType.LIGHT,
            baseAC: 13,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.FULL,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.NATURAL_ARMOR_12_DEX,
            armorType: ArmorType.LIGHT,
            baseAC: 12,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.FULL,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.NATURAL_ARMOR_12_CON,
            armorType: ArmorType.LIGHT,
            baseAC: 12,
            abilityBonuses: [Ability.CON],
            abilityBonusType: AbilityBonusType.FULL,
            strengthReq: null,
            stealthDisadvantage: false
        },

        // ==================== HOMEBREW ====================
        // Used for custom armor-like AC sources created by users.
        {
            name: ArmorCategory.HOMEBREW,
            armorType: ArmorType.LIGHT,
            baseAC: 10,
            abilityBonuses: [Ability.DEX],
            abilityBonusType: AbilityBonusType.FULL,
            strengthReq: null,
            stealthDisadvantage: false
        },
    ]

    for (const armor of armors) {
        await prisma.armor.upsert({
            where: {name: armor.name},
            update: armor,
            create: armor
        })
    }

    console.log(`✅ Seeded ${armors.length} armor pieces`)
}
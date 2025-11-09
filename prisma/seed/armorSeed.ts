import { PrismaClient, Prisma, ArmorCategory, ArmorType } from "@prisma/client";

export const seedArmor = async (prisma: PrismaClient) => {
    console.log('Seeding armor...')

    const armors: Prisma.ArmorCreateInput[] = [
        // ==================== LIGHT ARMOR ====================
        {
            name: ArmorCategory.PADDED,
            armorType: ArmorType.LIGHT,
            baseAC: 11,
            strengthReq: null,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.LEATHER,
            armorType: ArmorType.LIGHT,
            baseAC: 11,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.STUDDED_LEATHER,
            armorType: ArmorType.LIGHT,
            baseAC: 12,
            strengthReq: null,
            stealthDisadvantage: false
        },

        // ==================== MEDIUM ARMOR ====================
        {
            name: ArmorCategory.HIDE,
            armorType: ArmorType.MEDIUM,
            baseAC: 12,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.CHAIN_SHIRT,
            armorType: ArmorType.MEDIUM,
            baseAC: 13,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.SCALE_MAIL,
            armorType: ArmorType.MEDIUM,
            baseAC: 14,
            strengthReq: null,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.BREASTPLATE,
            armorType: ArmorType.MEDIUM,
            baseAC: 14,
            strengthReq: null,
            stealthDisadvantage: false
        },
        {
            name: ArmorCategory.HALF_PLATE,
            armorType: ArmorType.MEDIUM,
            baseAC: 15,
            strengthReq: null,
            stealthDisadvantage: true
        },

        // ==================== HEAVY ARMOR ====================
        {
            name: ArmorCategory.RING_MAIL,
            armorType: ArmorType.HEAVY,
            baseAC: 14,
            strengthReq: null,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.CHAIN_MAIL,
            armorType: ArmorType.HEAVY,
            baseAC: 16,
            strengthReq: 13,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.SPLINT,
            armorType: ArmorType.HEAVY,
            baseAC: 17,
            strengthReq: 15,
            stealthDisadvantage: true
        },
        {
            name: ArmorCategory.PLATE,
            armorType: ArmorType.HEAVY,
            baseAC: 18,
            strengthReq: 15,
            stealthDisadvantage: true
        },

        // ==================== SHIELD ====================
        {
            name: ArmorCategory.SHIELD,
            armorType: ArmorType.SHIELD,
            baseAC: 2,
            strengthReq: null,
            stealthDisadvantage: false
        },
    ]

    for (const armor of armors) {
        await prisma.armor.upsert({
            where: {name: armor.name},
            update: {},
            create: armor
        })
    }

    console.log(`✅ Seeded ${armors.length} armor pieces`)
}
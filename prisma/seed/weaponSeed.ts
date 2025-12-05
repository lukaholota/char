import { PrismaClient, DamageType, Prisma, WeaponCategory, WeaponProperty, WeaponType } from "@prisma/client";

export const seedWeapons = async (prisma: PrismaClient) => {
    console.log('Seeding weapons...')

    const weapons: Prisma.WeaponCreateInput[] = [
        {
            name: WeaponCategory.CLUB,
            damage: '1к4',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 1,
            properties: [WeaponProperty.LIGHT]
        },
        {
            name: WeaponCategory.DAGGER,
            damage: '1к4',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 2,
            properties: [WeaponProperty.FINESSE, WeaponProperty.LIGHT, WeaponProperty.THROWN],
            normalRange: 20,
            longRange: 60
        },
        {
            name: WeaponCategory.GREATCLUB,
            damage: '1к8',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 3,
            properties: [WeaponProperty.TWO_HANDED],
        },
        {
            name: WeaponCategory.HANDAXE,
            damage: '1к6',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 4,
            properties: [WeaponProperty.LIGHT, WeaponProperty.THROWN],
            normalRange: 20,
            longRange: 60
        },
        {
            name: WeaponCategory.JAVELIN,
            damage: '1к6',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 5,
            properties: [WeaponProperty.THROWN],
            normalRange: 30,
            longRange: 120
        },
        {
            name: WeaponCategory.LIGHT_HAMMER,
            damage: '1к4',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 6,
            properties: [WeaponProperty.LIGHT, WeaponProperty.THROWN],
            normalRange: 20,
            longRange: 60
        },
        {
            name: WeaponCategory.MACE,
            damage: '1к6',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 7,
            properties: []
        },
        {
            name: WeaponCategory.QUARTERSTAFF,
            damage: '1к6',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 8,
            properties: [WeaponProperty.VERSATILE],
            versatileDamage: '1к8'
        },
        {
            name: WeaponCategory.SICKLE,
            damage: '1к4',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 9,
            properties: [WeaponProperty.LIGHT]
        },
        {
            name: WeaponCategory.SPEAR,
            damage: '1к6',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 10,
            properties: [WeaponProperty.THROWN, WeaponProperty.VERSATILE],
            normalRange: 20,
            longRange: 60,
            versatileDamage: '1к8'
        },
        {
            name: WeaponCategory.UNARMED_STRIKE,
            damage: '1',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 11,
            properties: []
        },

        // ==================== SIMPLE RANGED WEAPONS ====================
        {
            name: WeaponCategory.LIGHT_CROSSBOW,
            damage: '1к8',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 12,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.LOADING, WeaponProperty.TWO_HANDED],
            normalRange: 80,
            longRange: 320,
            isRanged: true,
        },
        {
            name: WeaponCategory.DART,
            damage: '1к4',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 13,
            properties: [WeaponProperty.FINESSE, WeaponProperty.THROWN],
            normalRange: 20,
            longRange: 60,
            isRanged: true
        },
        {
            name: WeaponCategory.SHORTBOW,
            damage: '1к6',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 14,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.TWO_HANDED],
            normalRange: 80,
            longRange: 320,
            isRanged: true
        },
        {
            name: WeaponCategory.SLING,
            damage: '1к4',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.SIMPLE_WEAPON,
            sortOrder: 15,
            properties: [WeaponProperty.AMMUNITION],
            normalRange: 30,
            longRange: 120,
            isRanged: true
        },

        // ==================== MARTIAL MELEE WEAPONS ====================
        {
            name: WeaponCategory.BATTLEAXE,
            damage: '1к8',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 16,
            properties: [WeaponProperty.VERSATILE],
            versatileDamage: '1к10'
        },
        {
            name: WeaponCategory.FLAIL,
            damage: '1к8',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 17,
            properties: []
        },
        {
            name: WeaponCategory.GLAIVE,
            damage: '1к10',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 18,
            properties: [WeaponProperty.HEAVY, WeaponProperty.REACH, WeaponProperty.TWO_HANDED]
        },
        {
            name: WeaponCategory.GREATAXE,
            damage: '1к12',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 19,
            properties: [WeaponProperty.HEAVY, WeaponProperty.TWO_HANDED]
        },
        {
            name: WeaponCategory.GREATSWORD,
            damage: '2к6',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 20,
            properties: [WeaponProperty.HEAVY, WeaponProperty.TWO_HANDED]
        },
        {
            name: WeaponCategory.HALBERD,
            damage: '1к10',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 21,
            properties: [WeaponProperty.HEAVY, WeaponProperty.REACH, WeaponProperty.TWO_HANDED]
        },
        {
            name: WeaponCategory.LANCE,
            damage: '1к12',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 22,
            properties: [WeaponProperty.REACH, WeaponProperty.SPECIAL]
        },
        {
            name: WeaponCategory.LONGSWORD,
            damage: '1к8',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 23,
            properties: [WeaponProperty.VERSATILE],
            versatileDamage: '1к10'
        },
        {
            name: WeaponCategory.MAUL,
            damage: '2к6',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 24,
            properties: [WeaponProperty.HEAVY, WeaponProperty.TWO_HANDED]
        },
        {
            name: WeaponCategory.MORNINGSTAR,
            damage: '1к8',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 25,
            properties: []
        },
        {
            name: WeaponCategory.PIKE,
            damage: '1к10',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 26,
            properties: [WeaponProperty.HEAVY, WeaponProperty.REACH, WeaponProperty.TWO_HANDED]
        },
        {
            name: WeaponCategory.RAPIER,
            damage: '1к8',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 27,
            properties: [WeaponProperty.FINESSE]
        },
        {
            name: WeaponCategory.SCIMITAR,
            damage: '1к6',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 28,
            properties: [WeaponProperty.FINESSE, WeaponProperty.LIGHT]
        },
        {
            name: WeaponCategory.SHORTSWORD,
            damage: '1к6',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 29,
            properties: [WeaponProperty.FINESSE, WeaponProperty.LIGHT]
        },
        {
            name: WeaponCategory.TRIDENT,
            damage: '1к6',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 30,
            properties: [WeaponProperty.THROWN, WeaponProperty.VERSATILE],
            normalRange: 20,
            longRange: 60,
            versatileDamage: '1к8'
        },
        {
            name: WeaponCategory.WAR_PICK,
            damage: '1к8',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 31,
            properties: []
        },
        {
            name: WeaponCategory.WARHAMMER,
            damage: '1к8',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 32,
            properties: [WeaponProperty.VERSATILE],
            versatileDamage: '1к10'
        },
        {
            name: WeaponCategory.WHIP,
            damage: '1к4',
            damageType: DamageType.SLASHING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 33,
            properties: [WeaponProperty.FINESSE, WeaponProperty.REACH]
        },

        // ==================== MARTIAL RANGED WEAPONS ====================
        {
            name: WeaponCategory.BLOWGUN,
            damage: '1',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 34,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.LOADING],
            normalRange: 25,
            longRange: 100,
            isRanged: true
        },
        {
            name: WeaponCategory.HAND_CROSSBOW,
            damage: '1к6',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 35,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.LIGHT, WeaponProperty.LOADING],
            normalRange: 30,
            longRange: 120,
            isRanged: true
        },
        {
            name: WeaponCategory.HEAVY_CROSSBOW,
            damage: '1к10',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 36,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.HEAVY, WeaponProperty.LOADING, WeaponProperty.TWO_HANDED],
            normalRange: 100,
            longRange: 400,
            isRanged: true
        },
        {
            name: WeaponCategory.LONGBOW,
            damage: '1к8',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 37,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.HEAVY, WeaponProperty.TWO_HANDED],
            normalRange: 150,
            longRange: 600,
            isRanged: true
        },
        {
            name: WeaponCategory.NET,
            damage: '0',
            damageType: DamageType.BLUDGEONING,
            weaponType: WeaponType.MARTIAL_WEAPON,
            sortOrder: 38,
            properties: [WeaponProperty.SPECIAL, WeaponProperty.THROWN],
            normalRange: 5,
            longRange: 15,
            isRanged: true
        },
        // ==================== RENAISSANCE FIREARMS ====================
        {
            name: WeaponCategory.PISTOL_RENAISSANCE,
            damage: '1к10',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.LOADING],
            normalRange: 30,
            longRange: 90,
            isRanged: true
        },
        {
            name: WeaponCategory.MUSKET,
            damage: '1к12',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.LOADING, WeaponProperty.TWO_HANDED],
            normalRange: 40,
            longRange: 120,
            isRanged: true
        },

        // ==================== MODERN FIREARMS ====================
        {
            name: WeaponCategory.PISTOL_AUTOMATIC,
            damage: '2к6',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.RELOAD],
            normalRange: 50,
            longRange: 150,
            isRanged: true,
            isAdditional: true,
        },
        {
            name: WeaponCategory.REVOLVER,
            damage: '2к8',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.RELOAD],
            normalRange: 40,
            longRange: 120,
            isRanged: true,
            isAdditional: true,
        },
        {
            name: WeaponCategory.RIFLE_HUNTING,
            damage: '2к10',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.RELOAD, WeaponProperty.TWO_HANDED],
            normalRange: 80,
            longRange: 240,
            isRanged: true,
            isAdditional: true,
        },
        {
            name: WeaponCategory.RIFLE_AUTOMATIC,
            damage: '2к8',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.BURST_FIRE, WeaponProperty.RELOAD, WeaponProperty.TWO_HANDED],
            normalRange: 80,
            longRange: 240,
            isRanged: true,
            isAdditional: true,
        },
        {
            name: WeaponCategory.SHOTGUN,
            damage: '2к8',
            damageType: DamageType.PIERCING,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.RELOAD, WeaponProperty.TWO_HANDED],
            normalRange: 30,
            longRange: 90,
            isRanged: true,
            isAdditional: true,
        },

        // ==================== FUTURISTIC FIREARMS ====================
        {
            name: WeaponCategory.LASER_PISTOL,
            damage: '3к6',
            damageType: DamageType.RADIANT,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.RELOAD],
            normalRange: 40,
            longRange: 120,
            isRanged: true,
            isAdditional: true,
        },
        {
            name: WeaponCategory.ANTIMATTER_RIFLE,
            damage: '6к8',
            damageType: DamageType.NECROTIC,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.RELOAD, WeaponProperty.TWO_HANDED],
            normalRange: 120,
            longRange: 360,
            isRanged: true,
            isAdditional: true,
        },
        {
            name: WeaponCategory.LASER_RIFLE,
            damage: '3к8',
            damageType: DamageType.RADIANT,
            weaponType: WeaponType.FIREARMS,
            properties: [WeaponProperty.AMMUNITION, WeaponProperty.RELOAD, WeaponProperty.TWO_HANDED],
            normalRange: 100,
            longRange: 300,
            isRanged: true,
            isAdditional: true,
        },
    ]

    for (const weapon of weapons) {
        await prisma.weapon.upsert({
            where: {name: weapon.name},
            update: weapon,
            create: weapon
        })
    }

    console.log(`✅ Seeded ${weapons.length} weapons`)
}
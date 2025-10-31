import { InfusionTargetType, Prisma, PrismaClient } from "../../src/generated/prisma";

export const seedInfusions = async ( prisma: PrismaClient ) => {
    console.log( "🧪 Додаємо Вливання (Infusions)..." );

    const infusions: Prisma.InfusionCreateInput[] = [
        {
            name: "Покращений арканний фокус",
            engName: "Enhanced Arcane Focus",
            minArtificerLevel: 2,
            targetType: InfusionTargetType.WAND_ROD_STAFF,
            requiresAttunement: true,
            spellAttackBonus: 1,
            increasesAtLevel10By: 1,
        },
        {
            name: "Покращений захист",
            engName: "Enhanced Defense",
            minArtificerLevel: 2,
            targetType: InfusionTargetType.ARMOR,
            requiresAttunement: false,
            bonusToAC: 1,
            increasesAtLevel10By: 1,
        },
        {
            name: "Покращена зброя",
            engName: "Enhanced Weapon",
            minArtificerLevel: 2,
            targetType: InfusionTargetType.WEAPON,
            requiresAttunement: false,
            bonusToAttackRoll: 1,
            bonusToDamage: 1,
            increasesAtLevel10By: 1,
        },
        {
            name: "Повертальна зброя",
            engName: "Returning Weapon",
            minArtificerLevel: 2,
            targetType: InfusionTargetType.WEAPON,
            requiresAttunement: false,
            bonusToAttackRoll: 1,
            bonusToDamage: 1,
        },
        {
            name: "Повторний постріл",
            engName: "Repeating Shot",
            minArtificerLevel: 2,
            targetType: InfusionTargetType.WEAPON,
            requiresAttunement: false,
            bonusToAttackRoll: 1,
            bonusToDamage: 1,
        },
        {
            name: "Промениста зброя",
            engName: "Radiant Weapon",
            minArtificerLevel: 2,
            targetType: InfusionTargetType.WEAPON,
            requiresAttunement: true,
            bonusToAttackRoll: 1,
            bonusToDamage: 1,
        },
        {
            name: "Загострювач розуму",
            engName: "Mind Sharpener",
            minArtificerLevel: 2,
            targetType: InfusionTargetType.ARMOR,
            requiresAttunement: false,
        },
        {
            name: "Кільце підживлення заклять",
            engName: "Spell-Refueling Ring",
            minArtificerLevel: 6,
            targetType: InfusionTargetType.RING,
            requiresAttunement: true,
            restoresSpellSlotUpToLevel: 3,
        },
        {
            name: "Відштовхувальний щит",
            engName: "Repulsion Shield",
            minArtificerLevel: 6,
            targetType: InfusionTargetType.SHIELD,
            requiresAttunement: true,
            bonusToAC: 1,
        },
        {
            name: "Стійка броня",
            engName: "Resistant Armor",
            minArtificerLevel: 6,
            targetType: InfusionTargetType.ARMOR,
            requiresAttunement: true,
        },
        {
            name: "Чоботи звивистої стежки",
            engName: "Boots of the Winding Path",
            minArtificerLevel: 6,
            targetType: InfusionTargetType.BOOTS,
            requiresAttunement: true,
        },
        {
            name: "Шолом обізнаності",
            engName: "Helm of Awareness",
            minArtificerLevel: 10,
            targetType: InfusionTargetType.HELMET,
            requiresAttunement: true,
        },
        {
            name: "Арканний бронепривід",
            engName: "Arcane Propulsion Armor",
            minArtificerLevel: 14,
            targetType: InfusionTargetType.ARMOR,
            requiresAttunement: true,
            speedBonus: 5,
        },
        {
            name: "Слуга-гомункул",
            engName: "Homunculus Servant",
            minArtificerLevel: 6,
            targetType: InfusionTargetType.GEM_CRYSTAL,
            requiresAttunement: false,
        },
    ];

    const featureEngByInfusionEng: Record<string, string> = {
        "Enhanced Arcane Focus": "Infusion: Enhanced Arcane Focus",
        "Enhanced Defense": "Infusion: Enhanced Defense",
        "Enhanced Weapon": "Infusion: Enhanced Weapon",
        "Returning Weapon": "Infusion: Returning Weapon",
        "Repeating Shot": "Infusion: Repeating Shot",
        "Radiant Weapon": "Infusion: Radiant Weapon",
        "Mind Sharpener": "Infusion: Mind Sharpener",
        "Spell-Refueling Ring": "Infusion: Spell-Refueling Ring",
        "Repulsion Shield": "Infusion: Repulsion Shield",
        "Resistant Armor": "Infusion: Resistant Armor",
        "Boots of the Winding Path": "Infusion: Boots of the Winding Path",
        "Helm of Awareness": "Infusion: Helm of Awareness",
        "Arcane Propulsion Armor": "Infusion: Arcane Propulsion Armor",
        "Homunculus Servant": "Infusion: Homunculus Servant",
    };

    for ( const it of infusions ) {
        const featureEng = featureEngByInfusionEng[it.engName];
        await prisma.infusion.upsert( {
            where: { engName: it.engName },
            update: {},
            create: ( {
                ...it,
                ...( featureEng ? { feature: { connect: { engName: featureEng } } } : {} ),
            } as any ),
        } );
    }

    // Replicate Magic Item — зв'яжемо з уже створеними предметами
    const replicateList: { engName: string; display: string }[] = [
        {
            engName: "Boots of Elvenkind",
            display: "Репліка: Чоботи ельфів",
        },
        {
            engName: "Cloak of Elvenkind",
            display: "Репліка: Плащ ельфів",
        },

        {
            engName: "Cloak of the Manta Ray",
            display: "Репліка: Плащ манти",
        },
        {
            engName: "Eyes of Charming",
            display: "Репліка: Очі чарування",
        },
        {
            engName: "Gloves of Thievery",
            display: "Репліка: Рукавички злодія",
        },
        {
            engName: "Lantern of Revealing",
            display: "Репліка: Ліхтар викриття",
        },
        {
            engName: "Pipes of Haunting",
            display: "Репліка: Свистки жаху",
        },
        {
            engName: "Ring of Water Walking",
            display: "Репліка: Перстень ходіння по воді",
        },
        {
            engName: "Boots of Striding and Springing",
            display: "Репліка: Чоботи кроку і стрибка",
        },
        {
            engName: "Boots of the Winterlands",
            display: "Репліка: Чоботи Зимокраю",
        },
        {
            engName: "Bracers of Archery",
            display: "Репліка: Налучники стрільця",
        },
        {
            engName: "Brooch of Shielding",
            display: "Репліка: Брошка захисту",
        },
        {
            engName: "Cloak of Protection",
            display: "Репліка: Плащ захисту",
        },
        {
            engName: "Eyes of the Eagle",
            display: "Репліка: Очі орла",
        },
        {
            engName: "Gauntlets of Ogre Power",
            display: "Репліка: Рукавиці сили огра",
        },
        {
            engName: "Gloves of Missile Snaring",
            display: "Репліка: Рукавиці перехоплення",
        },
        {
            engName: "Gloves of Swimming and Climbing",
            display: "Репліка: Рукавиці плавання й лазіння",
        },
        {
            engName: "Hat of Disguise",
            display: "Репліка: Капелюх маскування",
        },
        {
            engName: "Headband of Intellect",
            display: "Репліка: Обруч інтелекту",
        },
        {
            engName: "Helm of Telepathy",
            display: "Репліка: Шолом телепатії",
        },
        {
            engName: "Medallion of Thoughts",
            display: "Репліка: Медальйон думок",
        },
        {
            engName: "Necklace of Adaptation",
            display: "Репліка: Оберіг пристосування",
        },
        {
            engName: "Periapt of Wound Closure",
            display: "Репліка: Амулет загоєння",
        },
        {
            engName: "Pipes of the Sewers",
            display: "Репліка: Свистки каналізації",
        },
        {
            engName: "Quiver of Ehlonna",
            display: "Репліка: Колчан Елонни",
        },
        {
            engName: "Ring of Jumping",
            display: "Репліка: Перстень стрибка",
        },
        {
            engName: "Ring of Mind Shielding",
            display: "Репліка: Перстень захисту розуму",
        },
        {
            engName: "Slippers of Spider Climbing",
            display: "Репліка: Капці павучого лазіння",
        },
        {
            engName: "Ventilating Lungs",
            display: "Репліка: Вентиляційні легені",
        },
        {
            engName: "Winged Boots",
            display: "Репліка: Крилаті чоботи",
        },
        {
            engName: "Amulet of Health",
            display: "Репліка: Амулет здоровʼя",
        },
        {
            engName: "Arcane Propulsion Arm",
            display: "Репліка: Арканна пропульсійна рука",
        },
        {
            engName: "Belt of Hill Giant Strength",
            display: "Репліка: Пояс сили пагорбового велетня",
        },
        {
            engName: "Boots of Levitation",
            display: "Репліка: Чоботи левітації",
        },
        {
            engName: "Boots of Speed",
            display: "Репліка: Чоботи швидкості",
        },
        {
            engName: "Bracers of Defense",
            display: "Репліка: Наручі захисту",
        },
        {
            engName: "Cloak of the Bat",
            display: "Репліка: Плащ кажана",
        },
        {
            engName: "Dimensional Shackles",
            display: "Репліка: Вимірні кайдани",
        },
        {
            engName: "Gem of Seeing",
            display: "Репліка: Самоцвіт бачення",
        },
        {
            engName: "Horn of Blasting",
            display: "Репліка: Ріг вибуху",
        },
        {
            engName: "Ring of Free Action",
            display: "Репліка: Перстень вільної дії",
        },
        {
            engName: "Ring of Protection",
            display: "Репліка: Перстень захисту",
        },
        {
            engName: "Ring of the Ram",
            display: "Репліка: Перстень барана",
        },
    ];

    for ( const entry of replicateList ) {
        const mi = await prisma.magicItem.findUnique( { where: { name: entry.engName } } );
        if ( !mi ) continue;
        await prisma.infusion.upsert( {
            where: { engName: `Replicate: ${entry.engName}` },
            update: {},
            create: {
                name: entry.display,
                engName: `Replicate: ${entry.engName}`,
                minArtificerLevel: 6,
                requiresAttunement: mi.requiresAttunement,
                targetType: InfusionTargetType.ANY,
                replicatedMagicItem: { connect: { magicItemId: mi.magicItemId } },
            },
        } );
    }

    console.log( "✅ Додано/оновлено Вливання" );
};

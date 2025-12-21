import { PrismaClient, Races, WeaponCategory } from "@prisma/client";

export const seedRaceChoiceOptions = async (prisma: PrismaClient) => {
    console.log('🐉 Додаємо вибір родоводу Дракононароджених...');
    console.log('🧝‍♂️ Додаємо варіанти Half-Elf Versatility...');

    const dragonborn = await prisma.race.findFirst({ where: { name: Races.DRAGONBORN_2014 } });
    if (!dragonborn) {
        throw new Error("Dragonborn race not found");
    }

    const halfElf = await prisma.race.findFirst({ where: { name: Races.HALF_ELF_2014 } });
    if (!halfElf) {
        throw new Error("Half-Elf race not found");
    }

    const aasimar = await prisma.race.findFirst({ where: { name: Races.AASIMAR_MPMM } });
    if (!aasimar) {
        throw new Error("Aasimar race not found");
    }

    const shifter = await prisma.race.findFirst({ where: { name: Races.SHIFTER_MPMM } });
    if (!shifter) {
        throw new Error("Shifter race not found");
    }

    const connectFeature = (engName: string) => ({ feature: { connect: { engName } } });

    const choices = [
        // ============ DRAGONBORN ANCESTRY ============
        // Black Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Чорний дракон",
            description: "Тип шкоди: кислота. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (Black)'),
                    connectFeature('Breath Weapon (Acid - Line)')
                ]
            }
        },
        // Blue Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Синій дракон",
            description: "Тип шкоди: блискавка. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (Blue)'),
                    connectFeature('Breath Weapon (Lightning - Line)')
                ]
            }
        },
        // Brass Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Латунний дракон",
            description: "Тип шкоди: вогонь. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (Brass)'),
                    connectFeature('Breath Weapon (Fire - Line)')
                ]
            }
        },
        // Bronze Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Бронзовий дракон",
            description: "Тип шкоди: блискавка. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (Bronze)'),
                    connectFeature('Breath Weapon (Lightning - Line)')
                ]
            }
        },
        // Copper Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Мідний дракон",
            description: "Тип шкоди: кислота. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (Copper)'),
                    connectFeature('Breath Weapon (Acid - Line)')
                ]
            }
        },
        // Gold Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Золотий дракон",
            description: "Тип шкоди: вогонь. Форма зброї дихання: конус 15 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (Gold)'),
                    connectFeature('Breath Weapon (Fire - Cone)')
                ]
            }
        },
        // Green Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Зелений дракон",
            description: "Тип шкоди: отрута. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (Green)'),
                    connectFeature('Breath Weapon (Poison - Cone)')
                ]
            }
        },
        // Red Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Червоний дракон",
            description: "Тип шкоди: вогонь. Форма зброї дихання: конус 15 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (Red)'),
                    connectFeature('Breath Weapon (Fire - Cone)')
                ]
            }
        },
        // Silver Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Срібний дракон",
            description: "Тип шкоди: холод. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (Silver)'),
                    connectFeature('Breath Weapon (Cold - Cone)')
                ]
            }
        },
        // White Dragon
        {
            raceId: dragonborn.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Білий дракон",
            description: "Тип шкоди: холод. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Draconic Ancestry (White)'),
                    connectFeature('Breath Weapon (Cold - Cone)')
                ]
            }
        },

        // ============ HALF-ELF VERSATILITY (SCAG) ============
        // Skill Versatility (базова PHB опція - дві додаткові навички)
        {
            raceId: halfElf.raceId,
            subraceId: null,
            choiceGroupName: "Half-Elf Versatility",
            optionName: "Skill Versatility",
            description: "Ви отримуєте володіння двома навичками на ваш вибір.",
            selectMultiple: false,
            maxSelection: 1,
            skillProficiencies: {
                choiceCount: 2,
                options: ["ANY", "ANY"]
            }
        },
        // Elf Weapon Training
        {
            raceId: halfElf.raceId,
            subraceId: null,
            choiceGroupName: "Half-Elf Versatility",
            optionName: "Elf Weapon Training",
            description: "Ви володієте довгим мечем, коротким мечем, коротким луком та довгим луком.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Elf Weapon Training')
                ]
            }
        },
        // Cantrip (High Elf)
        {
            raceId: halfElf.raceId,
            subraceId: null,
            choiceGroupName: "Half-Elf Versatility",
            optionName: "Cantrip",
            description: "Ви знаєте одне замовляння на ваш вибір зі списку заклинань чарівника. Інтелект є вашою заклинальною характеристикою для нього.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('High Elf Cantrip')
                ]
            }
        },
        // Fleet of Foot
        {
            raceId: halfElf.raceId,
            subraceId: null,
            choiceGroupName: "Half-Elf Versatility",
            optionName: "Fleet of Foot",
            description: "Ваша базова швидкість ходьби збільшується до 35 футів.",
            selectMultiple: false,
            maxSelection: 1,
            modifiesSpeed: 5,
            traits: {
                create: [
                    connectFeature('Fleet of Foot')
                ]
            }
        },
        // Mask of the Wild
        {
            raceId: halfElf.raceId,
            subraceId: null,
            choiceGroupName: "Half-Elf Versatility",
            optionName: "Mask of the Wild",
            description: "Ви можете спробувати сховатися навіть за легким природним укриттям, таким як листя, сильний дощ, сніг, туман та інші природні явища.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Mask of the Wild')
                ]
            }
        },
        // Drow Magic
        {
            raceId: halfElf.raceId,
            subraceId: null,
            choiceGroupName: "Half-Elf Versatility",
            optionName: "Drow Magic",
            description: "Ви знаєте замовляння Танцюючі вогники [Dancing Lights]. Коли ви досягаєте 3-го рівня, ви можете використати заклинання Чарівний вогонь [Faerie Fire]. Коли ви досягаєте 5-го рівня, ви також можете використати заклинання Темрява [Darkness]. Харизма є вашою заклинальною характеристикою для цих заклинань.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Drow Magic')
                ]
            }
        },
        // Swim Speed
        {
            raceId: halfElf.raceId,
            subraceId: null,
            choiceGroupName: "Half-Elf Versatility",
            optionName: "Swim Speed",
            description: "Ви отримуєте швидкість плавання 30 футів.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Child of the Sea')
                ]
            }
        },

        // ============ AASIMAR CELESTIAL REVELATION ============
        {
            raceId: aasimar.raceId,
            subraceId: null,
            choiceGroupName: "Небесне одкровення",
            optionName: "Necrotic Shroud",
            description: "Некротичне покривало: налякування + 1к10 некротичної шкоди.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Necrotic Shroud')
                ]
            }
        },
        {
            raceId: aasimar.raceId,
            subraceId: null,
            choiceGroupName: "Небесне одкровення",
            optionName: "Radiant Consumption",
            description: "Променеве спалювання: аура променевого світла + 1к10 променевої шкоди.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Radiant Consumption')
                ]
            }
        },
        {
            raceId: aasimar.raceId,
            subraceId: null,
            choiceGroupName: "Небесне одкровення",
            optionName: "Radiant Soul",
            description: "Променева душа: політ 30 футів + 1к10 променевої шкоди.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Radiant Soul')
                ]
            }
        },

        // ============ SHIFTER SHIFTING FORMS ============
        {
            raceId: shifter.raceId,
            subraceId: null,
            choiceGroupName: "Риса перевертання",
            optionName: "Beasthide",
            description: "Звіроша шкіра: 1к6+СОН тимчасових HP + AC +1.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Shifting: Beasthide')
                ]
            }
        },
        {
            raceId: shifter.raceId,
            subraceId: null,
            choiceGroupName: "Риса перевертання",
            optionName: "Longtooth",
            description: "Довгий ікл: 1к6+СТА тимчасових HP + укус 1к6+СИЛ.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Shifting: Longtooth')
                ]
            }
        },
        {
            raceId: shifter.raceId,
            subraceId: null,
            choiceGroupName: "Риса перевертання",
            optionName: "Swiftstride",
            description: "Швидкий крок: 1к6+СТА тимчасових HP + швидкість +10 фт.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Shifting: Swiftstride')
                ]
            }
        },
        {
            raceId: shifter.raceId,
            subraceId: null,
            choiceGroupName: "Риса перевертання",
            optionName: "Wildhunt",
            description: "Дикий мисливець: 1к6+СТА тимчасових HP + перевага на МДР.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Shifting: Wildhunt')
                ]
            }
        }
    ];

    for (const choice of choices) {
        const { traits, ...data } = choice;
        
        const existing = await prisma.raceChoiceOption.findFirst({
            where: {
                raceId: data.raceId,
                subraceId: data.subraceId,
                choiceGroupName: data.choiceGroupName,
                optionName: data.optionName
            }
        });

        if (existing) {
            // Оновлюємо та чистимо старі тріти
            await prisma.raceChoiceOption.update({
                where: { optionId: existing.optionId },
                data: {
                    ...data,
                    traits: {
                        deleteMany: {},
                        create: traits?.create
                    }
                }
            });
        } else {
            // Створюємо нову
            await prisma.raceChoiceOption.create({
                data: choice
            });
        }
    }

    console.log(`✅ Додано ${choices.length} варіантів вибору рас (Dragonborn, Half-Elf, Aasimar, Shifter)!`);
}

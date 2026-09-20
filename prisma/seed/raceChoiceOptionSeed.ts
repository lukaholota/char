import { PrismaClient, Races } from "@prisma/client";

export const seedRaceChoiceOptions = async (prisma: PrismaClient) => {
    console.log('🐉 Додаємо вибір родоводу Дракононароджених...');
    console.log('🧝‍♂️ Додаємо варіанти Half-Elf Versatility...');

    const dragonborn = await prisma.race.findFirst({ where: { name: Races.DRAGONBORN_2014 } });
    if (!dragonborn) {
        throw new Error("Dragonborn race not found");
    }

    const dragonbornChromatic = await prisma.race.findFirst({ where: { name: Races.DRAGONBORN_CHROMATIC } });
    if (!dragonbornChromatic) {
        throw new Error("Dragonborn (Chromatic) race not found");
    }

    const dragonbornMetallic = await prisma.race.findFirst({ where: { name: Races.DRAGONBORN_METALLIC } });
    if (!dragonbornMetallic) {
        throw new Error("Dragonborn (Metallic) race not found");
    }

    const dragonbornGem = await prisma.race.findFirst({ where: { name: Races.DRAGONBORN_GEM } });
    if (!dragonbornGem) {
        throw new Error("Dragonborn (Gem) race not found");
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

    const simicHybrid = await prisma.race.findFirst({ where: { name: Races.SIMIC_HYBRID_GGTR } });
    if (!simicHybrid) {
        throw new Error("Simic Hybrid race not found");
    }

    const koboldMPMM = await prisma.race.findFirst({ where: { name: Races.KOBOLD_MPMM } });
    if (!koboldMPMM) {
        throw new Error("Kobold MPMM race not found");
    }

    const customLineage = await prisma.race.findFirst({ where: { name: Races.CUSTOM_LINEAGE_TCE } });
    if (!customLineage) {
        throw new Error("Custom Lineage race not found");
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

        // ============ DRAGONBORN (CHROMATIC) ANCESTRY (FTOD) ============
        {
            raceId: dragonbornChromatic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Чорний дракон",
            description: "Тип шкоди: кислота. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Acid - Line)'),
                    connectFeature('Draconic Ancestry (Black)')
                ]
            }
        },
        {
            raceId: dragonbornChromatic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Синій дракон",
            description: "Тип шкоди: блискавка. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Lightning - Line)'),
                    connectFeature('Draconic Ancestry (Blue)')
                ]
            }
        },
        {
            raceId: dragonbornChromatic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Зелений дракон",
            description: "Тип шкоди: отрута. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Poison - Cone)'),
                    connectFeature('Draconic Ancestry (Green)')
                ]
            }
        },
        {
            raceId: dragonbornChromatic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Червоний дракон",
            description: "Тип шкоди: вогонь. Форма зброї дихання: конус 15 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Fire - Cone)'),
                    connectFeature('Draconic Ancestry (Red)')
                ]
            }
        },
        {
            raceId: dragonbornChromatic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Білий дракон",
            description: "Тип шкоди: холод. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Cold - Cone)'),
                    connectFeature('Draconic Ancestry (White)')
                ]
            }
        },

        // ============ DRAGONBORN (METALLIC) ANCESTRY (FTOD) ============
        {
            raceId: dragonbornMetallic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Латунний дракон",
            description: "Тип шкоди: вогонь. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Fire - Line)'),
                    connectFeature('Draconic Ancestry (Brass)')
                ]
            }
        },
        {
            raceId: dragonbornMetallic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Бронзовий дракон",
            description: "Тип шкоди: блискавка. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Lightning - Line)'),
                    connectFeature('Draconic Ancestry (Bronze)')
                ]
            }
        },
        {
            raceId: dragonbornMetallic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Мідний дракон",
            description: "Тип шкоди: кислота. Форма зброї дихання: лінія 5x30 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Acid - Line)'),
                    connectFeature('Draconic Ancestry (Copper)')
                ]
            }
        },
        {
            raceId: dragonbornMetallic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Золотий дракон",
            description: "Тип шкоди: вогонь. Форма зброї дихання: конус 15 футів (ряткидок Спритності).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Fire - Cone)'),
                    connectFeature('Draconic Ancestry (Gold)')
                ]
            }
        },
        {
            raceId: dragonbornMetallic.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Срібний дракон",
            description: "Тип шкоди: холод. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Cold - Cone)'),
                    connectFeature('Draconic Ancestry (Silver)')
                ]
            }
        },

        // ============ DRAGONBORN (GEM) ANCESTRY (FTOD) ============
        {
            raceId: dragonbornGem.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Аметистовий дракон",
            description: "Тип шкоди: сила. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Force - Cone)'),
                    connectFeature('Draconic Ancestry (Amethyst)')
                ]
            }
        },
        {
            raceId: dragonbornGem.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Кришталевий дракон",
            description: "Тип шкоди: променева. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Radiant - Cone)'),
                    connectFeature('Draconic Ancestry (Crystal)')
                ]
            }
        },
        {
            raceId: dragonbornGem.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Смарагдовий дракон",
            description: "Тип шкоди: психічна. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Psychic - Cone)'),
                    connectFeature('Draconic Ancestry (Emerald)')
                ]
            }
        },
        {
            raceId: dragonbornGem.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Сапфіровий дракон",
            description: "Тип шкоди: громова. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Thunder - Cone)'),
                    connectFeature('Draconic Ancestry (Sapphire)')
                ]
            }
        },
        {
            raceId: dragonbornGem.raceId,
            subraceId: null,
            choiceGroupName: "Родовід дракона",
            optionName: "Топазовий дракон",
            description: "Тип шкоди: некротична. Форма зброї дихання: конус 15 футів (ряткидок Статури).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Breath Weapon (Necrotic - Cone)'),
                    connectFeature('Draconic Ancestry (Topaz)')
                ]
            }
        },

        // ============ HALF-ELF VERSATILITY (SCAG) ============
        // Skill Versatility (базова PHB опція - дві додаткові навички)
        {
            raceId: halfElf.raceId,
            subraceId: null,
            choiceGroupName: "Універсальність напівельфа",
            optionName: "Універсальність навичок",
            legacy: { choiceGroupName: "Half-Elf Versatility", optionName: "Skill Versatility" },
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
            choiceGroupName: "Універсальність напівельфа",
            optionName: "Ельфійське бойове навчання",
            legacy: { choiceGroupName: "Half-Elf Versatility", optionName: "Elf Weapon Training" },
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
            choiceGroupName: "Універсальність напівельфа",
            optionName: "Замовляння",
            legacy: { choiceGroupName: "Half-Elf Versatility", optionName: "Cantrip" },
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
            choiceGroupName: "Універсальність напівельфа",
            optionName: "Прудконогість",
            legacy: { choiceGroupName: "Half-Elf Versatility", optionName: "Fleet of Foot" },
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
            choiceGroupName: "Універсальність напівельфа",
            optionName: "Маскування в дикій природі",
            legacy: { choiceGroupName: "Half-Elf Versatility", optionName: "Mask of the Wild" },
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
            choiceGroupName: "Універсальність напівельфа",
            optionName: "Магія дроу",
            legacy: { choiceGroupName: "Half-Elf Versatility", optionName: "Drow Magic" },
            description: 'Ви знаєте замовляння <a href="/spell/1350">Танцюючі вогники [Dancing Lights]</a>. Коли ви досягаєте 3-го рівня, ви можете використати заклинання <a href="/spell/1041">Чарівний вогонь [Faerie Fire]</a>. Коли ви досягаєте 5-го рівня, ви також можете використати заклинання <a href="/spell/1249">Темрява [Darkness]</a>. Харизма є вашою заклинальною характеристикою для цих заклинань.',
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
            choiceGroupName: "Універсальність напівельфа",
            optionName: "Швидкість плавання",
            legacy: { choiceGroupName: "Half-Elf Versatility", optionName: "Swim Speed" },
            description: "Ви отримуєте швидкість плавання 30 футів.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Child of the Sea (Sea Elf Subrace)')
                ]
            }
        },

        // ============ AASIMAR CELESTIAL REVELATION ============
        {
            raceId: aasimar.raceId,
            subraceId: null,
            choiceGroupName: "Небесне одкровення",
            optionName: "Некротичне покривало",
            legacy: { choiceGroupName: "Небесне одкровення", optionName: "Necrotic Shroud" },
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
            optionName: "Променеве спалювання",
            legacy: { choiceGroupName: "Небесне одкровення", optionName: "Radiant Consumption" },
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
            optionName: "Променева душа",
            legacy: { choiceGroupName: "Небесне одкровення", optionName: "Radiant Soul" },
            description: "Променева душа: політ 30 футів + 1к10 променевої шкоди.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Radiant Soul (Aasimar)')
                ]
            }
        },

        // ============ SHIFTER SHIFTING FORMS ============
        {
            raceId: shifter.raceId,
            subraceId: null,
            choiceGroupName: "Риса перевертання",
            optionName: "Звіроша шкіра",
            legacy: { choiceGroupName: "Риса перевертання", optionName: "Beasthide" },
            description: "Звіроша шкіра: 1к6+СОН тимчасових ОЗ + КБ +1.",
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
            optionName: "Довгий ікл",
            legacy: { choiceGroupName: "Риса перевертання", optionName: "Longtooth" },
            description: "Довгий ікл: 1к6+СТА тимчасових ОЗ + укус 1к6+СИЛ.",
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
            optionName: "Швидкий крок",
            legacy: { choiceGroupName: "Риса перевертання", optionName: "Swiftstride" },
            description: "Швидкий крок: 1к6+СТА тимчасових ОЗ + швидкість +10 фт.",
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
            optionName: "Дикий мисливець",
            legacy: { choiceGroupName: "Риса перевертання", optionName: "Wildhunt" },
            description: "Дикий мисливець: 1к6+СТА тимчасових ОЗ + <a href=\"/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage\">перевага</a> на МДР.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Shifting: Wildhunt')
                ]
            }
        },

        // ============ SIMIC HYBRID ENHANCEMENTS ============
        {
            raceId: simicHybrid.raceId,
            subraceId: null,
            choiceGroupName: "Тваринні вдосконалення (1 рівень)",
            optionName: "Планерування манти",
            description: "Manta Glide: сповільнення падіння та планерування (2 фути вбік за 1 фут вниз).",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Animal Enhancements')
                ]
            }
        },
        {
            raceId: simicHybrid.raceId,
            subraceId: null,
            choiceGroupName: "Тваринні вдосконалення (1 рівень)",
            optionName: "Вправний скелелаз",
            description: "Nimble Climber: швидкість лазіння дорівнює вашій швидкості ходьби.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Animal Enhancements')
                ]
            }
        },
        {
            raceId: simicHybrid.raceId,
            subraceId: null,
            choiceGroupName: "Тваринні вдосконалення (1 рівень)",
            optionName: "Підводна адаптація",
            description: "Underwater Adaptation: швидкість плавання дорівнює вашій швидкості ходьби, ви можете дихати під водою.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Animal Enhancements')
                ]
            }
        },

        // ============ KOBOLD LEGACY ============
        {
            raceId: koboldMPMM.raceId,
            subraceId: null,
            choiceGroupName: "Спадщина кобольдів",
            optionName: "Драконяча винахідливість",
            description: "Ви отримуєте володіння однією з навичок: Магія, Історія, Розслідування, Медицина або Виживання.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Kobold Legacy')
                ]
            }
        },
        {
            raceId: koboldMPMM.raceId,
            subraceId: null,
            choiceGroupName: "Спадщина кобольдів",
            optionName: "Непокора",
            description: "Ви маєте <a href=\"/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage\">перевагу</a> на ряткидки для уникнення або завершення стану Переляканості на собі.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Kobold Legacy')
                ]
            }
        },
        {
            raceId: koboldMPMM.raceId,
            subraceId: null,
            choiceGroupName: "Спадщина кобольдів",
            optionName: "Драконяче чаклунство",
            description: "Ви знаєте одне замовляння на ваш вибір зі списку заклинань чарівника.",
            selectMultiple: false,
            maxSelection: 1,
            traits: {
                create: [
                    connectFeature('Kobold Legacy')
                ]
            }
        },

        // ============ CUSTOM LINEAGE ============
        {
            raceId: customLineage.raceId,
            subraceId: null,
            choiceGroupName: "Розмір",
            optionName: "Середній",
            description: "Ваш розмір — Середній.",
            selectMultiple: false,
            maxSelection: 1,
            // Size is already handled in the base race, but we can use this to explicitly set it if needed
            // or just leave it as a descriptive choice.
        },
        {
            raceId: customLineage.raceId,
            subraceId: null,
            choiceGroupName: "Розмір",
            optionName: "Малий",
            description: "Ваш розмір — Малий.",
            selectMultiple: false,
            maxSelection: 1,
        },
        {
            raceId: customLineage.raceId,
            subraceId: null,
            choiceGroupName: "Своя раса",
            optionName: "Темнозір",
            description: "Ви маєте темнозір на відстані 60 футів.",
            selectMultiple: false,
            maxSelection: 1,
            // No feature connection needed - this is a simple choice that grants darkvision
        },
        {
            raceId: customLineage.raceId,
            subraceId: null,
            choiceGroupName: "Своя раса",
            optionName: "Навичка",
            description: "Ви отримуєте володіння однією навичкою на ваш вибір.",
            selectMultiple: false,
            maxSelection: 1,
            skillProficiencies: {
                choiceCount: 1,
                options: ["ANY"]
            }
        }
    ];

    for (const choice of choices) {
        const { traits, legacy, ...data } = choice as any;
        
        let existing = await prisma.raceChoiceOption.findFirst({
            where: {
                raceId: data.raceId,
                subraceId: data.subraceId,
                choiceGroupName: data.choiceGroupName,
                optionName: data.optionName
            }
        });

        // Backwards-compatible lookup: if an older DB has English group/option names, update that row in-place.
        if (!existing && legacy?.choiceGroupName && legacy?.optionName) {
            existing = await prisma.raceChoiceOption.findFirst({
                where: {
                    raceId: data.raceId,
                    subraceId: data.subraceId,
                    choiceGroupName: legacy.choiceGroupName,
                    optionName: legacy.optionName,
                }
            });
        }

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
                data: {
                    ...(data as any),
                    ...(traits ? { traits } : {}),
                }
            });
        }
    }

    console.log(`✅ Додано ${choices.length} варіантів вибору рас (Dragonborn, Half-Elf, Aasimar, Shifter)!`);
}

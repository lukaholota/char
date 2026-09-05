import {
    PrismaClient,
    Prisma,
    Ruleset,
    WeaponCategory, ArmorCategory, Classes, WeaponType, EquipmentPackCategory
} from "@prisma/client";

const ACTIVE_RULESET: Ruleset = "RULES_2014";

export const seedClassEquipment = async (prisma: PrismaClient) => {
    console.log('🌟 Додаємо класове спорядження...')
    const equipment: Prisma.ClassStartingEquipmentOptionCreateInput[] = [
        // GROUP 1: Armor choice
        // Option A: Chain mail
        {
            choiceGroup: 1,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.CHAIN_MAIL, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'кольчуга (16 КБ)'
        },
        {
            choiceGroup: 1,
            option: 'b',
            armor: { connect: { name_ruleset: { name: ArmorCategory.LEATHER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'шкіряна (11 + СПР КБ)'
        },
        {
            choiceGroup: 1,
            option: 'b',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.LONGBOW, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Довгий лук (1к8)'
        },
        {
            choiceGroup: 1,
            option: 'b',
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 20,
            item: 'Стріли',
            description: '20 стріл'
        },

        // ГРУПА 2: Основна зброя
        // Варіант А: Бойова зброя
        {
            choiceGroup: 2,
            option: 'a',
            chooseAnyWeapon: true,
            weaponType: WeaponType.MARTIAL_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Одна бойова зброя на вибір'
        },
        // Варіант А: Щит
        {
            choiceGroup: 2,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.SHIELD, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Щит (+2 до КБ)'
        },
        // Варіант Б: Дві бойові зброї
        {
            choiceGroup: 2,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.MARTIAL_WEAPON,
            weaponCount: 2,
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Дві бойові зброї на вибір'
        },

        // ГРУПА 3: Дальнобійна зброя
        // Варіант А: Легкий арбалет
        {
            choiceGroup: 3,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.LIGHT_CROSSBOW, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Легкий арбалет (1к8)'
        },
        // Варіант А: Болти
        {
            choiceGroup: 3,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 20,
            item: 'Арбалетний болт',
            description: '20 болтів',
        },
        // Варіант Б: Ручні сокири
        {
            choiceGroup: 3,
            option: 'b',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.HANDAXE, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 2,
            description: 'Дві ручні сокири (1к6), метальні'
        },

        // ГРУПА 4: Набори спорядження
        // Варіант А: Набір дослідника підземель
        {
            choiceGroup: 4,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.DUNGEONEERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір дослідника підземель'
        },
        // Варіант Б: Набір мандрівника
        {
            choiceGroup: 4,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },





        // BARBARIAN STARTING EQUIPMENT
// ГРУПА 1: Основна зброя
// Варіант А: Велика сокира
        {
            choiceGroup: 1,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.GREATAXE, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARBARIAN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Велика сокира (1к12)'
        },
// Варіант Б: Будь-яка бойова рукопашна зброя
        {
            choiceGroup: 1,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.MARTIAL_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.BARBARIAN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Бойова рукопашна зброя на вибір'
        },

// ГРУПА 2: Вторинна зброя
// Варіант А: Дві ручні сокири
        {
            choiceGroup: 2,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.HANDAXE, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARBARIAN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 2,
            description: 'Дві ручні сокири (1к6), метальні'
        },
// Варіант Б: Будь-яка проста зброя
        {
            choiceGroup: 2,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.BARBARIAN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Проста зброя на вибір'
        },

// ГРУПА 3: Набір спорядження (фіксований)
// Набір мандрівника
        {
            choiceGroup: 3,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARBARIAN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },
        {
            choiceGroup: 3,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.JAVELIN, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARBARIAN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 4,
            description: '4 списи (1к6), метальні'
        },


        // СТАРТОВЕ СПОРЯДЖЕННЯ МОНАХА
        // ГРУПА 1: Основна зброя
        // Варіант А: Короткий меч
        {
            choiceGroup: 1,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.SHORTSWORD, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.MONK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Короткий меч (1к6)'
        },
        // Варіант Б: Будь-яка проста зброя
        {
            choiceGroup: 1,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.MONK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Проста зброя на вибір'
        },

        // ГРУПА 2: Набір спорядження
        // Варіант А: Набір дослідника підземель
        {
            choiceGroup: 2,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.DUNGEONEERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.MONK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір дослідника підземель'
        },
        // Варіант Б: Набір мандрівника
        {
            choiceGroup: 2,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.MONK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },

        // ГРУПА 3: Фіксоване спорядження
        // 10 дротиків (завжди)
        {
            choiceGroup: 3,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.DART, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.MONK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 10,
            description: '10 дротиків (1к4), метальні'
        },




        // ===== RANGER STARTING EQUIPMENT =====

// ГРУПА 1: Броня
// Варіант А: Лускова броня
        {
            choiceGroup: 1,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.SCALE_MAIL, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Лускова броня (14 + СПР [макс 2] КБ)'
        },
// Варіант Б: Шкіряна броня
        {
            choiceGroup: 1,
            option: 'b',
            armor: { connect: { name_ruleset: { name: ArmorCategory.LEATHER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Шкіряна броня (11 + СПР КБ)'
        },

// ГРУПА 2: Основна зброя
// Варіант А: Два короткі мечі
        {
            choiceGroup: 2,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.SHORTSWORD, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 2,
            description: 'Два короткі мечі (1к6)'
        },
// Варіант Б: Дві прості рукопашні зброї
        {
            choiceGroup: 2,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 2,
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Дві прості рукопашні зброї на вибір'
        },

// ГРУПА 3: Набір спорядження
// Варіант А: Набір дослідника підземель
        {
            choiceGroup: 3,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.DUNGEONEERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір дослідника підземель'
        },
// Варіант Б: Набір мандрівника
        {
            choiceGroup: 3,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },

// ГРУПА 4: Фіксоване спорядження (завжди)
// Довгий лук
        {
            choiceGroup: 4,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.LONGBOW, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Довгий лук (1к8)'
        },
// Колчан з 20 стрілами
        {
            choiceGroup: 4,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 20,
            item: 'Стріли',
            description: 'Колчан з 20 стрілами'
        },



        // У seedClassStartingEquipment додай:

// ===== PALADIN STARTING EQUIPMENT =====

// ГРУПА 1: Основна зброя
// Варіант А: Бойова зброя + щит
        {
            choiceGroup: 1,
            option: 'a',
            chooseAnyWeapon: true,
            weaponType: WeaponType.MARTIAL_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Бойова зброя на вибір'
        },
        {
            choiceGroup: 1,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.SHIELD, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Щит (+2 КБ)'
        },
// Варіант Б: Дві бойові зброї
        {
            choiceGroup: 1,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.MARTIAL_WEAPON,
            weaponCount: 2,
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Дві бойові зброї на вибір'
        },

// ГРУПА 2: Метальна/додаткова зброя
// Варіант А: 5 дротиків
        {
            choiceGroup: 2,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.JAVELIN, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 5,
            description: '5 списів (1к6)'
        },
// Варіант Б: Будь-яка проста рукопашна зброя
        {
            choiceGroup: 2,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Проста рукопашна зброя на вибір'
        },

// ГРУПА 3: Набір спорядження
// Варіант А: Набір священика
        {
            choiceGroup: 3,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.PRIESTS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір священика'
        },
// Варіант Б: Набір мандрівника
        {
            choiceGroup: 3,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },

// ГРУПА 4: Фіксоване спорядження (завжди)
// Кольчужна броня
        {
            choiceGroup: 4,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.CHAIN_MAIL, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Кольчуга (16 КБ)'
        },
// Святий символ
        {
            choiceGroup: 4,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Святий символ',
            description: 'Святий символ (чаротворчий фокус)'
        },




// ===== ROGUE STARTING EQUIPMENT =====

// ГРУПА 1: Основна зброя
// Варіант А: Рапіра
        {
            choiceGroup: 1,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.RAPIER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Рапіра (1к8, фехтувальна)'
        },
// Варіант Б: Короткий меч
        {
            choiceGroup: 1,
            option: 'b',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.SHORTSWORD, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Короткий меч (1к6, фехтувальна, легка)'
        },

// ГРУПА 2: Дальня/додаткова зброя
// Варіант А: Короткий лук + 20 стріл
        {
            choiceGroup: 2,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.SHORTBOW, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Короткий лук (1к6)'
        },
        {
            choiceGroup: 2,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 20,
            item: 'Стріли',
            description: 'Колчан з 20 стрілами'
        },
// Варіант Б: Короткий меч
        {
            choiceGroup: 2,
            option: 'b',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.SHORTSWORD, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Короткий меч (1к6, фехтувальна, легка)'
        },

// ГРУПА 3: Набір спорядження (3 варіанти!)
// Варіант А: Набір грабіжника
        {
            choiceGroup: 3,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.BURGLARS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір грабіжника'
        },
// Варіант Б: Набір дослідника підземель
        {
            choiceGroup: 3,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.DUNGEONEERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір дослідника підземель'
        },
// Варіант В: Набір мандрівника
        {
            choiceGroup: 3,
            option: 'c',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },

// ГРУПА 4: Фіксоване спорядження (завжди)
// Шкіряна броня
        {
            choiceGroup: 4,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.LEATHER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Шкіряна броня (11 + СПР КБ)'
        },
// Два кинджали
        {
            choiceGroup: 4,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.DAGGER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 2,
            description: 'Два кинджали (1к4, фехтувальна, легка, метальна)'
        },
// Інструменти злодія
        {
            choiceGroup: 4,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Інструменти злодія',
            description: 'Інструменти злодія'
        },




        // ===== WARLOCK STARTING EQUIPMENT =====

// ГРУПА 1: Основна зброя
// Варіант А: Легкий арбалет + 20 болтів
        {
            choiceGroup: 1,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.LIGHT_CROSSBOW, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Легкий арбалет (1к8)'
        },
        {
            choiceGroup: 1,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 20,
            item: 'Болти',
            description: '20 болтів для арбалета'
        },
// Варіант Б: Будь-яка проста зброя
        {
            choiceGroup: 1,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Будь-яка проста зброя на вибір'
        },

// ГРУПА 2: Чаротворчий фокус
// Варіант А: Мішечок компонентів
        {
            choiceGroup: 2,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Мішечок компонентів',
            description: 'Мішечок компонентів (component pouch)'
        },
// Варіант Б: Окультний фокус
        {
            choiceGroup: 2,
            option: 'b',
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Окультний фокус (arcane focus)',
            description: 'Окультний фокус (arcane focus)'
        },

// ГРУПА 3: Набір спорядження
// Варіант А: Набір вченого
        {
            choiceGroup: 3,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.SCHOLARS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір вченого'
        },
// Варіант Б: Набір дослідника підземель
        {
            choiceGroup: 3,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.DUNGEONEERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір дослідника підземель'
        },

// ГРУПА 4: Фіксоване спорядження (завжди)
// Шкіряна броня
        {
            choiceGroup: 4,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.LEATHER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Шкіряна броня (11 + СПР КБ)'
        },
// Будь-яка проста зброя (друга)
        {
            choiceGroup: 4,
            option: 'a',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Будь-яка проста зброя'
        },
// Два кинджали
        {
            choiceGroup: 4,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.DAGGER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 2,
            description: 'Два кинджали (1к4)'
        },


// ===== ARTIFICER (Винахідник) STARTING EQUIPMENT =====

        // ГРУПА 1: Дві прості зброї
        {
            choiceGroup: 1,
            option: 'a',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 2,
            class: { connect: { name_ruleset: { name: Classes.ARTIFICER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Будь-які дві прості зброї на вибір'
        },

        // ГРУПА 2: Легкий арбалет і 20 болтів АБО будь-яка проста зброя
        {
            choiceGroup: 2,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.LIGHT_CROSSBOW, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ARTIFICER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Легкий арбалет (1к8)'
        },
        {
            choiceGroup: 2,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.ARTIFICER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 20,
            item: 'Болти',
            description: '20 болтів'
        },
        {
            choiceGroup: 2,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.ARTIFICER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Будь-яка проста зброя на вибір'
        },

        // ГРУПА 3: Броня — клепана шкіряна або лускова
        {
            choiceGroup: 3,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.STUDDED_LEATHER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ARTIFICER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Клепана шкіряна броня (12 + СПР КБ)'
        },
        {
            choiceGroup: 3,
            option: 'b',
            armor: { connect: { name_ruleset: { name: ArmorCategory.SCALE_MAIL, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ARTIFICER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Лускова броня (14 + СПР [макс 2] КБ)'
        },

        // ГРУПА 4: Фіксоване спорядження — інструменти злодія та набір дослідника підземель
        {
            choiceGroup: 4,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.DUNGEONEERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.ARTIFICER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір дослідника підземель'
        },
        {
            choiceGroup: 4,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.ARTIFICER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Інструменти злодія',
            description: 'Інструменти злодія'
        },


        // ===== SORCERER STARTING EQUIPMENT =====
        // ГРУПА 1: Основна зброя
        {
            choiceGroup: 1,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.LIGHT_CROSSBOW, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Легкий арбалет (1к8)'
        },
        {
            choiceGroup: 1,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 20,
            item: 'Арбалетні болти',
            description: '20 арбалетних болтів'
        },
        {
            choiceGroup: 1,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Одна проста зброя на вибір'
        },

        // ГРУПА 2: Фокус чи компоненти
        {
            choiceGroup: 2,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.COMPONENT_POUCH, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Мішечок компонентів'
        },
        {
            choiceGroup: 2,
            option: 'b',
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Арканний фокус',
            description: 'Арканний фокус на вибір'
        },

        // ГРУПА 3: Набори спорядження
        {
            choiceGroup: 3,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.DUNGEONEERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір дослідника підземель'
        },
        {
            choiceGroup: 3,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },

        // ГРУПА 4: Фіксовані предмети
        {
            choiceGroup: 4,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.DAGGER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 2,
            description: 'Два кинджали'
        },

        // ===== WIZARD STARTING EQUIPMENT =====
        // ГРУПА 1: Зброя
        {
            choiceGroup: 1,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.QUARTERSTAFF, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WIZARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Бойовий посох (1к6/1к8)'
        },
        {
            choiceGroup: 1,
            option: 'b',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.DAGGER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WIZARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Кинджал (1к4)'
        },

        // ГРУПА 2: Фокус чи компоненти
        {
            choiceGroup: 2,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.COMPONENT_POUCH, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WIZARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Мішечок компонентів'
        },
        {
            choiceGroup: 2,
            option: 'b',
            class: { connect: { name_ruleset: { name: Classes.WIZARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Арканний фокус',
            description: 'Арканний фокус на вибір'
        },

        // ГРУПА 3: Набори спорядження
        {
            choiceGroup: 3,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.SCHOLARS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WIZARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір ученого'
        },
        {
            choiceGroup: 3,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WIZARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },

        // ГРУПА 4: Фіксовані предмети
        {
            choiceGroup: 4,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.SPELLBOOK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WIZARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Книга Чарів чарівника'
        },
        {
            choiceGroup: 4,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.DAGGER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.WIZARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Кинджал (1к4)'
        },


        // ===== DRUID STARTING EQUIPMENT =====
        // You start with the following equipment, in addition to the equipment granted by your background:
        // • (a) a wooden shield or (b) any simple weapon
        // • (a) a scimitar or (b) any simple melee weapon
        // • Leather armor, an explorer's pack, and a druidic focus

        // ГРУПА 1: Щит або проста зброя
        {
            choiceGroup: 1,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.SHIELD, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.DRUID_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Деревʼяний щит (+2 КБ)'
        },
        {
            choiceGroup: 1,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.DRUID_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Будь-яка проста зброя на вибір'
        },

        // ГРУПА 2: Шабля або проста рукопашна зброя
        {
            choiceGroup: 2,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.SCIMITAR, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.DRUID_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Шабля (1к6, фехтувальна, легка)'
        },
        {
            choiceGroup: 2,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.DRUID_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Будь-яка проста рукопашна зброя на вибір'
        },

        // ГРУПА 3: Фіксоване спорядження (завжди)
        {
            choiceGroup: 3,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.LEATHER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.DRUID_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Шкіряна броня (11 + СПР КБ)'
        },
        {
            choiceGroup: 3,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.DRUID_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },
        {
            choiceGroup: 3,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.DRUID_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Друїдичний фокус',
            description: 'Друїдичний фокус (druidic focus)'
        },


        // ===== BARD STARTING EQUIPMENT =====
        // You start with the following equipment, in addition to the equipment granted by your background:
        // (a) a rapier, (b) a longsword, or (c) any simple weapon
        // (a) a diplomat's pack or (b) an entertainer's pack
        // (a) a lute or (b) any other musical instrument
        // Leather armor and a dagger

        // ГРУПА 1: Зброя
        {
            choiceGroup: 1,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.RAPIER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Рапіра (1к8, фехтувальна)'
        },
        {
            choiceGroup: 1,
            option: 'b',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.LONGSWORD, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Довгий меч (1к8/1к10)'
        },
        {
            choiceGroup: 1,
            option: 'c',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.BARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Будь-яка проста зброя на вибір'
        },

        // ГРУПА 2: Набір спорядження
        {
            choiceGroup: 2,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.DIPLOMATS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір дипломата'
        },
        {
            choiceGroup: 2,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.ENTERTAINERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір артиста'
        },

        // ГРУПА 3: Музичний інструмент
        {
            choiceGroup: 3,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.BARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Лютня',
            description: 'Лютня'
        },
        {
            choiceGroup: 3,
            option: 'b',
            class: { connect: { name_ruleset: { name: Classes.BARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Музичний інструмент',
            description: 'Будь-який інший музичний інструмент'
        },

        // ГРУПА 4: Фіксоване спорядження (завжди)
        {
            choiceGroup: 4,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.LEATHER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Шкіряна броня (11 + СПР КБ)'
        },
        {
            choiceGroup: 4,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.DAGGER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.BARD_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Кинджал (1к4, фехтувальна, легка, метальна)'
        },


        // ===== CLERIC STARTING EQUIPMENT =====
        // You start with the following equipment, in addition to the equipment granted by your background:
        // (a) a mace or (b) a warhammer (if proficient)
        // (a) scale mail, (b) leather armor, or (c) chain mail (if proficient)
        // (a) a light crossbow and 20 bolts or (b) any simple weapon
        // (a) a priest's pack or (b) an explorer's pack
        // A shield and a holy symbol

        // ГРУПА 1: Зброя
        {
            choiceGroup: 1,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.MACE, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Булава (1к6)'
        },
        {
            choiceGroup: 1,
            option: 'b',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.WARHAMMER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Бойовий молот (1к8/1к10) — якщо є володіння'
        },

        // ГРУПА 2: Броня
        {
            choiceGroup: 2,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.SCALE_MAIL, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Лускова броня (14 + СПР [макс 2] КБ)'
        },
        {
            choiceGroup: 2,
            option: 'b',
            armor: { connect: { name_ruleset: { name: ArmorCategory.LEATHER, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Шкіряна броня (11 + СПР КБ)'
        },
        {
            choiceGroup: 2,
            option: 'c',
            armor: { connect: { name_ruleset: { name: ArmorCategory.CHAIN_MAIL, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Кольчуга (16 КБ) — якщо є володіння'
        },

        // ГРУПА 3: Дальня/проста зброя
        {
            choiceGroup: 3,
            option: 'a',
            weapon: { connect: { name_ruleset: { name: WeaponCategory.LIGHT_CROSSBOW, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Легкий арбалет (1к8)'
        },
        {
            choiceGroup: 3,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 20,
            item: 'Болти',
            description: '20 болтів для арбалета'
        },
        {
            choiceGroup: 3,
            option: 'b',
            chooseAnyWeapon: true,
            weaponType: WeaponType.SIMPLE_WEAPON,
            weaponCount: 1,
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Будь-яка проста зброя на вибір'
        },

        // ГРУПА 4: Набір спорядження
        {
            choiceGroup: 4,
            option: 'a',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.PRIESTS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір священика'
        },
        {
            choiceGroup: 4,
            option: 'b',
            equipmentPack: { connect: { name_ruleset: { name: EquipmentPackCategory.EXPLORERS_PACK, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Набір мандрівника'
        },

        // ГРУПА 5: Фіксоване спорядження (завжди)
        {
            choiceGroup: 5,
            option: 'a',
            armor: { connect: { name_ruleset: { name: ArmorCategory.SHIELD, ruleset: ACTIVE_RULESET } } },
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            description: 'Щит (+2 до КБ)'
        },
        {
            choiceGroup: 5,
            option: 'a',
            class: { connect: { name_ruleset: { name: Classes.CLERIC_2014, ruleset: ACTIVE_RULESET } } },
            quantity: 1,
            item: 'Святий символ',
            description: 'Святий символ (holy symbol)'
        }
    ];

    let seedIndex = 1;

    for (const piece of equipment) {
        await prisma.classStartingEquipmentOption.upsert({
            where: { seedIndex },
            update: piece,
            create: {
                seedIndex,
                ...piece
            }
        })

        seedIndex++;
    }

    console.log(`✅ додано ${equipment.length} класового спорядження!`)
}
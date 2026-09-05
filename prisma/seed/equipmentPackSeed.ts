import { PrismaClient, EquipmentPackCategory, Prisma, Ruleset } from "@prisma/client";

/// Вміст наборів звіряється з `items-base.json` пінутої ревізії — див.
/// `tests/content/5etools-equipment.test.ts`. Тому перелік винесений із сідера: звірці
/// потрібні ті самі рядки, а не їхня копія.
export const EQUIPMENT_PACKS_2014: Prisma.EquipmentPackCreateInput[] = [
        {
            name: EquipmentPackCategory.BURGLARS_PACK,
            description: 'Колекція інструментів ідеальна для непомітності, злому та виживання в дорозі.',
            items: [
                { name: 'Рюкзак', quantity: 1 },
                { name: 'Мішок з 1000 кульок', quantity: 1 },
                { name: 'Нитка (10 футів)', quantity: 1 },
                { name: 'Дзвіночок', quantity: 1 },
                { name: 'Свічка', quantity: 5 },
                { name: 'Лом', quantity: 1 },
                { name: 'Молоток', quantity: 1 },
                { name: 'Кілок', quantity: 10 },
                { name: 'Ліхтар з капюшоном', quantity: 1 },
                { name: 'Фляга олії', quantity: 2 },
                { name: 'Раціони (1 день)', quantity: 5 },
                { name: 'Вогниво', quantity: 1 },
                { name: 'Бурдюк', quantity: 1 },
                { name: 'Конопляна мотузка (50 футів)', quantity: 1 }
            ]
        },
        {
            name: EquipmentPackCategory.DIPLOMATS_PACK,
            description: 'Необхідне спорядження для переговорів із знаттю та ведення офіційних справ.',
            items: [
                { name: 'Скриня', quantity: 1 },
                { name: 'Футляр для мап та сувоїв', quantity: 2 },
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'Пляшка чорнила', quantity: 1 },
                { name: 'Чорнильне перо', quantity: 1 },
                { name: 'Лампа', quantity: 1 },
                { name: 'Фляга олії', quantity: 2 },
                { name: 'Аркуш паперу', quantity: 5 },
                { name: 'Флакон парфумів', quantity: 1 },
                { name: 'Сургуч', quantity: 1 },
                { name: 'Мило', quantity: 1 }
            ]
        },
        {
            name: EquipmentPackCategory.DUNGEONEERS_PACK,
            description: 'Базове спорядження для дослідження підземель та підземних комплексів.',
            items: [
                { name: 'Рюкзак', quantity: 1 },
                { name: 'Лом', quantity: 1 },
                { name: 'Молоток', quantity: 1 },
                { name: 'Кілок', quantity: 10 },
                { name: 'Смолоскип', quantity: 10 },
                { name: 'Вогниво', quantity: 1 },
                { name: 'Раціони (1 день)', quantity: 10 },
                { name: 'Бурдюк', quantity: 1 },
                { name: 'Конопляна мотузка (50 футів)', quantity: 1 }
            ]
        },
        {
            name: EquipmentPackCategory.ENTERTAINERS_PACK,
            description: 'Спорядження для артистів, включаючи костюми та інструменти ремесла.',
            items: [
                { name: 'Рюкзак', quantity: 1 },
                { name: 'Спальний мішок', quantity: 1 },
                { name: 'Костюм', quantity: 2 },
                { name: 'Свічка', quantity: 5 },
                { name: 'Раціони (1 день)', quantity: 5 },
                { name: 'Бурдюк', quantity: 1 },
                { name: 'Набір для маскування', quantity: 1 }
            ]
        },
        {
            name: EquipmentPackCategory.EXPLORERS_PACK,
            description: 'Найпопулярніший набір для пригодників з усім необхідним для подорожей дикою місцевістю.',
            items: [
                { name: 'Рюкзак', quantity: 1 },
                { name: 'Спальний мішок', quantity: 1 },
                { name: 'Набір для приготування їжі', quantity: 1 },
                { name: 'Вогниво', quantity: 1 },
                { name: 'Смолоскип', quantity: 10 },
                { name: 'Раціони (1 день)', quantity: 10 },
                { name: 'Бурдюк', quantity: 1 },
                { name: 'Конопляна мотузка (50 футів)', quantity: 1 }
            ]
        },
        {
            name: EquipmentPackCategory.PRIESTS_PACK,
            description: 'Священні предмети та припаси для мандрівних кліриків та інших божественних служителів.',
            items: [
                { name: 'Рюкзак', quantity: 1 },
                { name: 'Ковдра', quantity: 1 },
                { name: 'Свічка', quantity: 10 },
                { name: 'Вогниво', quantity: 1 },
                { name: 'Скринька для милостині', quantity: 1 },
                { name: 'Брусок ладану', quantity: 2 },
                { name: 'Кадило', quantity: 1 },
                { name: 'Ризи', quantity: 1 },
                { name: 'Раціони (1 день)', quantity: 2 },
                { name: 'Бурдюк', quantity: 1 }
            ]
        },
        {
            name: EquipmentPackCategory.SCHOLARS_PACK,
            description: 'Письмове приладдя та дослідницькі інструменти для вчених пригодників.',
            items: [
                { name: 'Рюкзак', quantity: 1 },
                { name: 'Книга знань', quantity: 1 },
                { name: 'Пляшка чорнила', quantity: 1 },
                { name: 'Чорнильне перо', quantity: 1 },
                { name: 'Аркуш пергаменту', quantity: 10 },
                { name: 'Маленький мішечок піску', quantity: 1 },
                { name: 'Маленький ніж', quantity: 1 }
            ]
        },
        {
            name: EquipmentPackCategory.COMPONENT_POUCH,
            description: 'Невелика водонепроникна шкіряна поясна сумка для зберігання матеріальних компонентів заклинань.',
            items: [
                { name: 'Мішечок компонентів', quantity: 1 }
            ]
        },
        {
            name: EquipmentPackCategory.SPELLBOOK,
            description: 'Книга в шкіряній палітурці із сотнею чистих сторінок з пергаменту для запису заклинань.',
            items: [
                { name: 'Книга заклинань', quantity: 1 }
            ]
        },
        {
            name: EquipmentPackCategory.HOMEBREW,
            description: 'Власний набір спорядження.',
            items: []
        }
]

/// Набори 2024 — дослівно з `data/2024/srd/equipment.md` (розділ Equipment Packs), українські
/// назви речей — з ратифікованого перекладу тієї самої глави, `data/2024/rules-uk/batch-31.json`.
/// Книга 2024 переписала вміст: у мандрівника зникло приладдя кухаря й додалися дві фляги олії,
/// у підземному наборі зʼявилися шипи-часник, мотузка більше не «конопляна на 50 футів».
/// Тут лише шість категорій, на які посилаються класи 2024 — див. KR26.2.
export const EQUIPMENT_PACKS_2024: Prisma.EquipmentPackCreateInput[] = [
    {
        name: EquipmentPackCategory.BURGLARS_PACK,
        description: 'Набір для тихої роботи: чим підважити, чим присвітити і чим засипати підлогу за собою.',
        items: [
            { name: 'Рюкзак', quantity: 1 },
            { name: 'Металеві кульки', quantity: 1 },
            { name: 'Дзвіночок', quantity: 1 },
            { name: 'Свічка', quantity: 10 },
            { name: 'Лом', quantity: 1 },
            { name: 'Ліхтар з капюшоном', quantity: 1 },
            { name: 'Фляга олії', quantity: 7 },
            { name: 'Раціони (1 день)', quantity: 5 },
            { name: 'Мотузка', quantity: 1 },
            { name: 'Вогниво', quantity: 1 },
            { name: 'Бурдюк', quantity: 1 }
        ]
    },
    {
        name: EquipmentPackCategory.DUNGEONEERS_PACK,
        description: 'Спорядження для спуску в підземелля: чим світити, чим підважити двері й чим прикрити відхід.',
        items: [
            { name: 'Рюкзак', quantity: 1 },
            { name: 'Шипи-часник', quantity: 1 },
            { name: 'Лом', quantity: 1 },
            { name: 'Фляга олії', quantity: 2 },
            { name: 'Раціони (1 день)', quantity: 10 },
            { name: 'Мотузка', quantity: 1 },
            { name: 'Вогниво', quantity: 1 },
            { name: 'Смолоскип', quantity: 10 },
            { name: 'Бурдюк', quantity: 1 }
        ]
    },
    {
        name: EquipmentPackCategory.ENTERTAINERS_PACK,
        description: 'Реквізит мандрівного артиста: три костюми, дзеркало та ліхтар-прожектор для виступу.',
        items: [
            { name: 'Рюкзак', quantity: 1 },
            { name: 'Спальний мішок', quantity: 1 },
            { name: 'Дзвіночок', quantity: 1 },
            { name: 'Ліхтар-прожектор', quantity: 1 },
            { name: 'Костюм', quantity: 3 },
            { name: 'Дзеркало', quantity: 1 },
            { name: 'Фляга олії', quantity: 8 },
            { name: 'Раціони (1 день)', quantity: 9 },
            { name: 'Вогниво', quantity: 1 },
            { name: 'Бурдюк', quantity: 1 }
        ]
    },
    {
        name: EquipmentPackCategory.EXPLORERS_PACK,
        description: 'Дорожній набір мандрівника: нічліг, світло та їжа на десять днів у дикій місцевості.',
        items: [
            { name: 'Рюкзак', quantity: 1 },
            { name: 'Спальний мішок', quantity: 1 },
            { name: 'Фляга олії', quantity: 2 },
            { name: 'Раціони (1 день)', quantity: 10 },
            { name: 'Мотузка', quantity: 1 },
            { name: 'Вогниво', quantity: 1 },
            { name: 'Смолоскип', quantity: 10 },
            { name: 'Бурдюк', quantity: 1 }
        ]
    },
    {
        name: EquipmentPackCategory.PRIESTS_PACK,
        description: 'Похідні речі мандрівного служителя: чим укритися, чим світити та свята вода.',
        items: [
            { name: 'Рюкзак', quantity: 1 },
            { name: 'Ковдра', quantity: 1 },
            { name: 'Свята вода', quantity: 1 },
            { name: 'Лампа', quantity: 1 },
            { name: 'Раціони (1 день)', quantity: 7 },
            { name: 'Мантія', quantity: 1 },
            { name: 'Вогниво', quantity: 1 }
        ]
    },
    {
        name: EquipmentPackCategory.SCHOLARS_PACK,
        description: 'Письмове приладдя дослідника: книга, чорнило з пером і світло на довгі ночі над текстом.',
        items: [
            { name: 'Рюкзак', quantity: 1 },
            { name: 'Книга', quantity: 1 },
            { name: 'Чорнило', quantity: 1 },
            { name: 'Чорнильне перо', quantity: 1 },
            { name: 'Лампа', quantity: 1 },
            { name: 'Фляга олії', quantity: 10 },
            { name: 'Аркуш пергаменту', quantity: 10 },
            { name: 'Вогниво', quantity: 1 }
        ]
    }
]

export const seedEquipmentPacks = async (prisma: PrismaClient) => {
    console.log('Seeding equipment packs...')

    await writePacksOfRuleset(prisma, EQUIPMENT_PACKS_2014, Ruleset.RULES_2014)
    await writePacksOfRuleset(prisma, EQUIPMENT_PACKS_2024, Ruleset.RULES_2024)

    await verifyPacksMatchSeed(prisma, EQUIPMENT_PACKS_2014, Ruleset.RULES_2014)
    await verifyPacksMatchSeed(prisma, EQUIPMENT_PACKS_2024, Ruleset.RULES_2024)

    console.log(`✅ Seeded ${EQUIPMENT_PACKS_2014.length} + ${EQUIPMENT_PACKS_2024.length} equipment packs`)
}

/// Пошук іде через `findFirst` за парою (name, ruleset), а не через `upsert` за унікальним
/// ключем: bare-unique `name` більше не описує рядок, а складений `name_ruleset` зʼявиться в
/// клієнті лише після owner-apply і `bun run db:pull`. Так сід працює обома поколіннями клієнта.
/// `update` бере весь набір, а не порожній обʼєкт: із порожнім виправлення вмісту не
/// доїжджало б до бази, яка вже має ці рядки, і сід тихо лишався б декоративним.
const writePacksOfRuleset = async (
    prisma: PrismaClient,
    packs: Prisma.EquipmentPackCreateInput[],
    ruleset: Ruleset
) => {
    for (const pack of packs) {
        const existing = await prisma.equipmentPack.findFirst({
            where: { name: pack.name, ruleset },
            select: { equipmentPackId: true }
        })

        if (existing) {
            await prisma.equipmentPack.update({
                where: { equipmentPackId: existing.equipmentPackId },
                data: { ...pack, ruleset }
            })
        } else {
            await prisma.equipmentPack.create({ data: { ...pack, ruleset } })
        }
    }
}

/// Сід сам себе перевіряє: без цього «прогнали, воно зелене» означало б лише те, що запити не
/// кинули помилку. Урок KR16.5 — рядок може лежати в базі й розходитися з тим, що тут написано.
const verifyPacksMatchSeed = async (
    prisma: PrismaClient,
    packs: Prisma.EquipmentPackCreateInput[],
    ruleset: Ruleset
) => {
    const written = await prisma.equipmentPack.findMany({
        where: { ruleset },
        select: { name: true, description: true, items: true }
    })
    const byName = new Map(written.map((pack) => [pack.name, pack]))

    const mismatched = packs.flatMap((expected) => {
        const found = byName.get(expected.name as EquipmentPackCategory)
        if (!found) return [`${expected.name}: у базі немає`]
        if (found.description !== expected.description) return [`${expected.name}: description`]
        if (JSON.stringify(found.items) !== JSON.stringify(expected.items)) return [`${expected.name}: items`]
        return []
    })

    if (mismatched.length > 0) {
        throw new Error(`Набори ${ruleset} розійшлися з сідом: ${mismatched.join('; ')}`)
    }
}

import { PrismaClient, EquipmentPackCategory, Prisma } from "@prisma/client";

export const seedEquipmentPacks = async (prisma: PrismaClient) => {
    console.log('Seeding equipment packs...')

    const packs: Prisma.EquipmentPackCreateInput[] = [
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
                { name: 'Набір для маскування', quantity: 1 },
                { name: 'Музичний інструмент ', quantity: 1}
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
                { name: 'Бурдюк', quantity: 1 },
                { name: 'Священний символ', quantity: 1}
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
                { name: 'Сумка компонентів', quantity: 1 }
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

    for (const pack of packs) {
        await prisma.equipmentPack.upsert({
            where: { name: pack.name },
            update: {},
            create: pack
        })
    }

    console.log(`✅ Seeded ${packs.length} equipment packs`)
}

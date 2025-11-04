import { FeatureDisplayType, Prisma, PrismaClient, RestType } from "../../../src/generated/prisma"

export const seedInfusionFeatures = async ( prisma: PrismaClient ) => {
	console.log( '🧪 Додаємо Feature для Вливань...' )
	const features: Prisma.FeatureCreateInput[] = [
		{
			name: 'Покращений арканний фокус',
			engName: 'Infusion: Enhanced Arcane Focus',
			description: 'Ви вливаєте у жезл/посох/палицю. +1 до кидків атак заклять; ігнорує половинне укриття. +2 з 10 рівня.',
			shortDescription: '+1 (з 10 р. +2) до атак заклять; ігнор 1/2 укриття',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Покращений захист',
			engName: 'Infusion: Enhanced Defense',
			description: '+1 до КБ броні/щита (з 10 рівня +2).',
			shortDescription: '+1 до КБ (з 10 р. +2)',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Покращена зброя',
			engName: 'Infusion: Enhanced Weapon',
			description: '+1 до кидків атаки і шкоди (з 10 рівня +2).',
			shortDescription: '+1 до атаки/шкоди (з 10 р. +2)',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Повертальна зброя',
			engName: 'Infusion: Returning Weapon',
			description: '+1 до атаки/шкоди; зброя повертається до руки після кидка.',
			shortDescription: '+1 до атаки/шкоди; повертається після кидка',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Повторний постріл',
			engName: 'Infusion: Repeating Shot',
			description: '+1 до атаки/шкоди; зброя створює боєприпаси і ігнорує перезаряджання.',
			shortDescription: '+1; створює боєприпаси; без перезаряджання',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Промениста зброя',
			engName: 'Infusion: Radiant Weapon',
			description: '+1 до атаки/шкоди; світло; реакцією осліпити нападника.',
			shortDescription: '+1; світло; реакцією осліпити',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Загострювач розуму',
			engName: 'Infusion: Mind Sharpener',
			description: 'Броня допомагає зосередженню на закляттях (перевизначення провалу).',
			shortDescription: 'Полегшує підтримку концентрації',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Броня магічної сили',
			engName: 'Infusion: Armor of Magical Strength',
			description: 'Використовуйте модифікатор Інтелекту для перевірок і кидків Сили. Бонусною дією: отримайте тимчасові ОЗ = ваш модифікатор Інтелекту (кількість разів = БМ, відновлюється після довгого відпочинку).',
			shortDescription: 'Інт для перевірок Сили; бонус. дією темп. ОЗ',
			displayType: [FeatureDisplayType.PASSIVE, FeatureDisplayType.BONUSACTION],
		},
		{
			name: 'Кільце підживлення заклять',
			engName: 'Infusion: Spell-Refueling Ring',
			description: 'Раз на світанок: дією відновіть один осередок заклять 3 рівня або нижче.',
			shortDescription: 'Дією: відновіть слот ≤ 3 р. (1/день)',
			displayType: [FeatureDisplayType.ACTION],
			limitedUsesPer: RestType.DAY,
			usesCount: 1,
		},
		{
			name: 'Відштовхувальний щит',
			engName: 'Infusion: Repulsion Shield',
			description: '+1 до КБ; 4 заряди (світанок 1к4). Реакцією — штовхнути нападника на 15 фт.',
			shortDescription: '+1 до КБ; реакцією штовхнути (заряди)',
			displayType: [FeatureDisplayType.REACTION],
		},
		{
			name: 'Стійка броня',
			engName: 'Infusion: Resistant Armor',
			description: 'Опір до обраного типу шкоди (кислота, холод, вогонь, сила, блискавка, некротична, отрута, психічна, промениста, гуркіт).',
			shortDescription: 'Опір до обраного типу шкоди',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Чоботи звивистої стежки',
			engName: 'Infusion: Boots of the Winding Path',
			description: 'Бонусною дією телепортуйтесь до 15 фт у простір, який займали цього ходу.',
			shortDescription: 'Бонусною дією: телепорт до 15 фт',
			displayType: [FeatureDisplayType.BONUSACTION],
		},
		{
			name: 'Шолом обізнаності',
			engName: 'Infusion: Helm of Awareness',
			description: 'Перевага на ініціативу; ви не заскочені зненацька, якщо не непрацездатні.',
			shortDescription: 'Перевага на ініціативу; не заскочені',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Арканний бронепривід',
			engName: 'Infusion: Arcane Propulsion Armor',
			description: '+5 фт до швидкості; рукавички-озброєння 1к8 сила, кинджальні 20/60, повертаються; броню не можна зняти проти волі; заміна відсутніх кінцівок.',
			shortDescription: '+5 фт; рукавички 1к8 сила (20/60), повертаються',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Слуга-гомункул',
			engName: 'Infusion: Homunculus Servant',
			description: 'Створює гомункула-супутника. Статблок використовує ваш Бонус Майстерності.',
			shortDescription: 'Створює гомункула-супутника',
			displayType: [FeatureDisplayType.PASSIVE],
		},
	]

	for ( const f of features ) {
		await prisma.feature.upsert( {
			where: { engName: f.engName },
			update: {},
			create: f,
		} )
	}
	console.log( `✅ Додано/оновлено infusion features: ${features.length}` )
}

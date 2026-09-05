import { FeatureDisplayType, PrismaClient, RestType } from "@prisma/client"
import { normalizeFeatureCreateInput, type SeedFeatureCreateInput } from "./helpers/featureDisplayType"

/// Дані лежать на рівні модуля, бо їх читає ще й адресний синк тексту
/// `subclassFeatureText2014.ts`. Другого примірника рядка бути не може — саме розбіжність
/// копій ховала зняті форми термінів у корпусі.
const INFUSION_FEATURE_SEED_INPUTS: SeedFeatureCreateInput[] = [
		{
			name: 'Покращений арканний фокус',
			engName: 'Infusion: Enhanced Arcane Focus',
			description: 'Тримаючи цей предмет, істота отримує **+1** до кидків атак заклять. Крім того, істота ігнорує половинне укриття при здійсненні атаки закляттям. Бонус збільшується до **+2** на 10-му рівні цього класу.',
			shortDescription: '+1 (з 10 р. +2) до атак заклять; ігнор 1/2 укриття',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Покращений захист',
			engName: 'Infusion: Enhanced Defense',
			description: 'Ціллю може бути броня або щит. Істота отримує **+1** до Класу Броні під час носіння цієї броні або роботи з цим щитом. Бонус збільшується до **+2** на 10-му рівні цього класу.',
			shortDescription: '+1 до КБ (з 10 р. +2)',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Покращена зброя',
			engName: 'Infusion: Enhanced Weapon',
			description: 'Ця магічна зброя надає **+1** до кидків атаки та шкоди. Бонус збільшується до **+2** на 10-му рівні цього класу.',
			shortDescription: '+1 до атаки/шкоди (з 10 р. +2)',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Повертальна зброя',
			engName: 'Infusion: Returning Weapon',
			description: 'Ця магічна зброя надає **+1** до кидків атаки та шкоди. Зброя повертається до руки того, хто нею користується, миттєво після того, як бути використана для здійснення дальної атаки.',
			shortDescription: '+1 до атаки/шкоди; повертається після кидка',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Повторний постріл',
			engName: 'Infusion: Repeating Shot',
			description: 'Ця магічна зброя надає **+1** до кидків атаки та шкоди при здійсненні дальної атаки. Вона ігнорує властивість завантаження, якщо вона її має. Якщо зброї не вистачає боєприпасів, вона виробляє свої власні, автоматично створюючи один снаряд магічних боєприпасів, коли той, хто нею користується, здійснює далеку атаку. Боєприпаси, створені зброєю, зникають миттєво після попадання або промаху у ціль.',
			shortDescription: '+1; створює боєприпаси; без перезаряджання',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Променева зброя',
			engName: 'Infusion: Radiant Weapon',
			description: 'Ця магічна зброя надає **+1** до кидків атаки та шкоди. Тримаючи її, той, хто нею користується, може здійснити бонусну дію, щоб вона випромінювала яскраве світло на відстань 30 футів та тьмяне світло на додаткові 30 футів. Той, хто нею користується, може гасити світло бонусною дією.\n\nЗброя має 4 заряди. Реакцією одразу після того, як бути вражений атакою, той, хто нею користується, може витратити 1 заряд, щоб ослепити нападника до кінця його наступного ходу, якщо нападник провалить рятувальний кидок Статури проти СК рятування вашого заклинання. Зброя отримує 1к4 витрачених зарядів щодня на світанку.',
			shortDescription: '+1; світло; реакцією ослепити',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Загострювач розуму',
			engName: 'Infusion: Mind Sharpener',
			description: 'Цей предмет може надати поштовх носієві, щоб перекопцентрувати його розум. Предмет має 4 заряди. Коли носій провалює рятувальний кидок Статури, щоб підтримати концентрацію на закляттях, носій може використати свою реакцію, щоб витратити 1 заряд предмета, щоб замість цього успішно пройти. Предмет отримує 1к4 витрачених зарядів щодня на світанку.',
			shortDescription: 'Полегшує підтримку концентрації',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Броня магічної сили',
			engName: 'Infusion: Armor of Magical Strength',
			description: 'Ця броня має 6 зарядів. Носій може витратити заряди броні наступними способами:\n\nКоли носій здійснює перевірку Сили або рятувальний кидок Сили, він може витратити 1 заряд, щоб додати бонус до кидка, що дорівнює його модифікатору Інтелекту.\n\nЯкщо істоту збиває з ніг, вона може використати свою реакцію, щоб витратити 1 заряд, щоб уникнути збивання з ніг.\n\nБроня отримує 1к6 витрачених зарядів щодня на світанку.',
			shortDescription: 'Інт для перевірок Сили; бонус. дією темп. ОЗ',
			limitedUsesPer: RestType.LONG_REST,
			usesCountDependsOnProficiencyBonus: true,
			displayType: [FeatureDisplayType.PASSIVE, FeatureDisplayType.BONUSACTION],
		},
		{
			name: 'Кільце підживлення заклять',
			engName: 'Infusion: Spell-Refueling Ring',
			description: 'Тримаючи це кільце, істота може відновити один витрачений осередок заклять дією. Відновлений осередок може бути 3-го рівня або нижче. Один раз використані кільце не можна використовувати знову до наступного світанку.',
			shortDescription: 'Дією: відновіть слот ≤ 3 р. (1/день)',
			displayType: [FeatureDisplayType.ACTION],
			limitedUsesPer: RestType.DAY,
			usesCount: 1,
		},
		{
			name: 'Відштовхувальний щит',
			engName: 'Infusion: Repulsion Shield',
			description: 'Істота отримує **+1** до Класу Броні під час роботи зі щитом. Щит має 4 заряди. Тримаючи його, той, хто ним користується, може використати реакцію одразу після того, як бути вражений атакою вруконош, щоб витратити 1 заряд щита та відштовхнути нападника на 15 футів. Щит отримує 1к4 витрачених зарядів щодня на світанку.',
			shortDescription: '+1 до КБ; реакцією штовхнути (заряди)',
			displayType: [FeatureDisplayType.REACTION],
		},
		{
			name: 'Стійка броня',
			engName: 'Infusion: Resistant Armor',
			description: 'Під час носіння цієї броні істота отримує опір одному з наступних типів шкоди, який ви обираєте, коли робите вливання: кислотна, холодна, вогняна, силовим полем, блискавична, некротична, отруйна, психічна, променева чи громова.',
			shortDescription: 'Опір до обраного типу шкоди',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Чоботи звивистої стежки',
			engName: 'Infusion: Boots of the Winding Path',
			description: 'Під час носіння цих чобіт істота може телепортуватися до 15 футів як бонусну дію в незайнятий простір, який вона може бачити. Істота повинна займати цей простір в якийсь момент упродовж поточного ходу.',
			shortDescription: 'Бонусною дією: телепорт до 15 фт',
			displayType: [FeatureDisplayType.BONUSACTION],
		},
		{
			name: 'Шолом обізнаності',
			engName: 'Infusion: Helm of Awareness',
			description: 'Під час носіння цього шолома істота отримує перевагу на кидки ініціативи. Крім того, носій не може бути застигнутий зненацька, за умови, що він не недієздатний.',
			shortDescription: 'Перевага на ініціативу; не заскочені',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Арканний бронепривід',
			engName: 'Infusion: Arcane Propulsion Armor',
			description: 'Швидкість руху носія броні збільшується на 5 футів.\n\nБроня включає рукавиці, кожна з яких є магічною зброєю ближнього бою, якою можна користуватися тільки коли рука нічого не тримає. Носій володіє рукавицами, і кожна завдає 1к8 шкоди силовим полем при попаданні та має властивість кидання, з нормальною дальністю 20 футів і дальню дальність 60 футів. При кидку рукавиця відокремлюється і летить до цілі атаки, потім миттєво повертається до носія й приєднується.',
			shortDescription: '+5 фт; рукавички 1к8 сила (20/60), повертаються',
			displayType: [FeatureDisplayType.PASSIVE],
		},
		{
			name: 'Слуга-гомункул',
			engName: 'Infusion: Homunculus Servant',
			description: 'Ви вивчаєте складні методи для магічного створення спеціального гомункула, який вам служить. Гомункул дружелюбний до вас та ваших супутників, і він підкоряється вашим наказам.',
			shortDescription: 'Створює гомункула-супутника',
			displayType: [FeatureDisplayType.PASSIVE],
		},
];

export function readInfusionFeatureSeedInputs(): SeedFeatureCreateInput[] {
  return INFUSION_FEATURE_SEED_INPUTS;
}

export const seedInfusionFeatures = async ( prisma: PrismaClient ) => {
	console.log( '🧪 Додаємо Feature для Вливань...' )
	const features = INFUSION_FEATURE_SEED_INPUTS;

	for ( const f of features ) {
		const normalized = normalizeFeatureCreateInput(f)
		await prisma.feature.upsert( {
			where: { engName: normalized.engName },
			update: normalized,
			create: normalized,
		} )
	}
	console.log( `✅ Додано/оновлено infusion features: ${features.length}` )
}

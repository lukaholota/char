import {
  Ability,
  ArmorType,
  Classes,
  Prisma,
  PrismaClient,
  Ruleset,
  SpellcastingType,
  Subclasses,
  WeaponType,
} from "@prisma/client";

type SubclassSeed = Omit<Prisma.SubclassCreateInput, "class" | "name"> & {
  name: Subclasses;
  classConnect: Classes;
};

const ACTIVE_RULESET: Ruleset = "RULES_2014";

/// Дані лежать на рівні модуля, бо їх читає ще й адресний синк тексту
/// `subclassFeatureText2014.ts`. Другого примірника рядка бути не може — саме розбіжність
/// копій ховала зняті форми термінів у корпусі.
const SUBCLASS_SEED_INPUTS: SubclassSeed[] = [
    // ==== Artificer ====
    {
      name: Subclasses.ALCHEMIST,
      description:
        "Алхімік є експертом у поєднанні реагентів для створення містичних ефектів. Алхіміки використовують свої витвори, щоб дарувати життя і висмоктувати його.",
      spellcastingType: SpellcastingType.HALF,
      classConnect: Classes.ARTIFICER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ARMORER,
      description:
        "Зброяр модифікує броню, щоб вона діяла майже як друга шкіра. Броня розкриває потужні атаки та захист.",
      spellcastingType: SpellcastingType.HALF,
      classConnect: Classes.ARTIFICER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ARTILLERIST,
      description:
        "Артилерист спеціалізується на вивільненні енергії, створюючи вибухи та захисні позиції за допомогою магічних гармат.",
      spellcastingType: SpellcastingType.HALF,
      classConnect: Classes.ARTIFICER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.BATTLE_SMITH,
      description:
        "Бойовий коваль поєднує магію та інженерію для створення захисників та ремонту матеріалів. Вони супроводжуються сталевим захисником.",
      spellcastingType: SpellcastingType.HALF,
      classConnect: Classes.ARTIFICER_2014,
      expandedSpells: { connect: [] },
    },

    {
      name: Subclasses.ARCANE_ARCHER,
      description:
        "Магічний лучник поєднує стрільбу та чари, щоб наділяти стріли надприродними ефектами й контролювати поле бою з відстані.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.BANNERET,
      description:
        "Пурпурний драконовий рицар надихає союзників своєю відвагою та підтримує їх у бою, перетворюючи власну доблесть на спільну силу.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.BATTLE_MASTER,
      description:
        "Майстер бою вивчає маневри й тактику, керуючи сутичкою через точні прийоми та перевагу на полі бою.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CAVALIER,
      description:
        "Кавалер охороняє союзників, утримує лінію фронту та контролює ворогів поруч із собою, часто з верха коня.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CHAMPION,
      description:
        "Чемпіон покладається на природну силу та витривалість, зосереджуючись на чистій бойовій майстерності.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ECHO_KNIGHT,
      description:
        "Лицар луни викликає магічну копію себе, атакуючи та захищаючись через цей відбиток на полі бою.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ELDRITCH_KNIGHT,
      description:
        "Містичний лицар поєднує магію чарівника зі збройною майстерністю, накладаючи заклинання поряд із ударами.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.THIRD,
      grantsSpells: true,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PSI_WARRIOR,
      description:
        "Псі-воїн спрямовує телекінетичну й психічну енергію, щоб захищати союзників та посилювати власні удари.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.RUNE_KNIGHT,
      description:
        "Рунний лицар черпає силу у магії велетнів, наносячи руни на спорядження та посилюючи власну міць.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SAMURAI,
      description:
        "Самурай спирається на дисципліну та незламний дух, щоб витримувати натиск і завдавати вирішальних ударів.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Barbarian ====
    {
      name: Subclasses.PATH_OF_THE_ANCESTRAL_GUARDIAN,
      description:
        "Шлях пращурів закликає духів предків, щоб оберігати союзників і спрямовувати удари ворогів у гнівного варвара.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_BATTLERAGER,
      description:
        "Берсерк у шипованих обладунках кидається в бій, завдаючи ударів власним тілом і тримаючи натиск силою сталі.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_BEAST,
      description:
        "Звірячий шлях вивільняє первісну іскру: під час люті тіло змінюється, зʼявляються пазурі, хвости чи щелепи.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_BERSERKER,
      description:
        "Класичний берсерк занурюється в лють без стримувань, отримуючи шалений натиск, але ризикуючи виснаженням.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_GIANT,
      description:
        "Гігантський шлях наділяє варвара силою велетів і стихій: збільшення зросту, кидання союзників і енергетичні удари.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_STORM_HERALD,
      description:
        "Вісник бурі огортає себе стихійною аурою пустелі, моря чи тундри, завдаючи магічних вибухів під час люті.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_TOTEM_WARRIOR,
      description:
        "Тотемний варвар приймає духа-звіря як наставника: чаклунські ритуали, опір і нові здібності ведуть його в бій.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_WILD_MAGIC,
      description:
        "Дика магія вирує в крові: лють викликає випадкові магічні сплески, підсилення союзників і вибухи хаосу.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_ZEALOT,
      description:
        "Ревний воїн сповнений божественного гніву: додаткова променева чи некротична шкода, стійкість до смерті й натхнення союзників.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Cleric ====
    {
      name: Subclasses.ARCANA_DOMAIN,
      description:
        "Арканний домен поєднує божественне служіння з вивченням магії: закляття чарівника, усунення чарів та покарання порушників магічного порядку.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.DEATH_DOMAIN,
      description:
        "Домен смерті служить богам кінця, некромантії та смертоносної сили, посилюючи удари та керуючи енергією смерті.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FORGE_DOMAIN,
      description:
        "Ковальський домен благословляє ремісників і воїнів: посилює зброю й обладунки, надає захист і керує вогнем кузні.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.GRAVE_DOMAIN,
      description:
        "Домен могили стереже межу між життям і смертю: виявляє наближення кінця, стримує некромантію та підтримує союзників на межі.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.KNOWLEDGE_DOMAIN,
      description:
        "Домен знань відкриває приховані істини: навички та мови, магія одкровення, контроль розуму та проникнення в таємниці.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.LIFE_DOMAIN,
      description:
        "Домен життя уособлює зцілення та захист: посилює лікування, дарує додаткові хіти й стоїть на сторожі життєвої сили.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.LIGHT_DOMAIN,
      description:
        "Домен світла бореться з темрявою: засліплення ворогів, променева шкода й контролювання битви ясним сяйвом.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.NATURE_DOMAIN,
      description:
        "Домен природи поєднує молитви та дикі сили: керування рослинами й тваринами, додаткові природні заклинання та захист землі.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ORDER_DOMAIN,
      description:
        "Домен порядку підтримує закон і дисципліну: влада слова, накази в бою та покарання за непослух.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PEACE_DOMAIN,
      description:
        "Домен миру зцілює й підтримує союзників через містичні звʼязки, гармонію й захист від конфліктів.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.TEMPEST_DOMAIN,
      description:
        "Домен бурі керує громом і блискавками: відповідає на удари відплатою, керує вітрами й нищівною силою стихій.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.TRICKERY_DOMAIN,
      description:
        "Домен хитрості дарує ілюзії та обман: дублікати, невидимість, підступні благословення й пастки для ворогів.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.TWILIGHT_DOMAIN,
      description:
        "Присмерковий домен захищає у сутінках: темнозір для союзників, аура тимчасових хітів і спокій проти страху.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAR_DOMAIN,
      description:
        "Домен війни підтримує солдатів: додаткові атаки, благословення зброї та божественні накази на полі бою.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Warlock ====
    {
      name: Subclasses.ARCHFEY,
      description:
        "Ваш покровитель — архіфея, володар або володарка фей, істота з легенд, що зберігає таємниці ще з часів до народження смертних рас. Такий покровитель наділяє вас чарами, туманом і примхливою, але грізною фейською силою.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FIEND,
      description:
        "Ваш покровитель — нечистий із Нижніх планів, істота, чиї наміри лихі, навіть якщо ви самі опираєтеся їм. Такий союз дарує вам пекельну міць, жорстоку удачу та магію вогню, страху й загибелі.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.GREAT_OLD_ONE,
      description:
        "Ваш покровитель — Великий Древній, загадкова сутність, чужа самій тканині реальності. Його знання незбагненні для смертних, а дарована ним сила проявляється в телепатії, психічному захисті й викривленні розуму.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.HEXBLADE,
      description:
        "Ваш пакт укладений із таємничою силою з Тіньокраю, що виявляється в розумній магічній зброї. Відьмацький клинок дарує вам прокляття, бойову вправність і владу над душами вбитих.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      armorProficiencies: [ArmorType.MEDIUM, ArmorType.SHIELD],
      weaponProficiencies: [WeaponType.MARTIAL_WEAPON],
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CELESTIAL,
      description:
        "Ваш покровитель — могутня істота з Верхніх планів, що дозволяє вам торкнутися священного світла, яке осяює мультивсесвіт. Його дари несуть зцілення, променеву міць і захист від смерті.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FATHOMLESS,
      description:
        "Ваш пакт повʼязує вас із безоднею океану, Планом Стихії Води чи іншою потойбічною морською сутністю. Вона кличе вас до глибин і наділяє щупальцями, морською витривалістю та водяною магією.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.THE_GENIE,
      description:
        "Ваш покровитель — благородний джин, один із найрідкісніших і наймогутніших представників свого роду. Через його судину ви черпаєте стихійну силу, здобуваєте прихисток поза світом і навчаєтеся здійснювати малі бажання.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.UNDEAD,
      description:
        "Ваш покровитель — безсмертна істота, що знехтувала колом життя і смерті, аби вічно переслідувати свої незбагненні цілі. Вона наділяє вас жахливою подобою, некротичною міццю та владою над духом і тілом.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.UNDYING,
      description:
        "Смерть не має влади над вашим покровителем, який осягнув секрети вічного життя. Його дари віддаляють вас від смертної природи, захищають від хвороб і дозволяють знову підніматися після тяжких ушкоджень.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Sorcerer ====
    {
      name: Subclasses.ABERRANT_MIND,
      description:
        "Психічна порода, що відкриває телепатію й спотворені закляття: щупальця, захист розуму та викривлення реальності.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CLOCKWORK_SOUL,
      description:
        "Душа годинникового порядку приносить закляття стабільності, скасовує перевагу та захищає союзників ліченими механізмами.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.DRACONIC_BLOODLINE,
      description:
        "Драконяча кров додає луски, крилатий політ і стихійну лють із підвищеною витривалістю та присутністю дракона.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.DIVINE_SOUL,
      description:
        "Божественна іскра відкриває список клірика для чародія: підтримка союзників, крила й небесне відновлення.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.LUNAR_SORCERY,
      description:
        "Місячна магія змінює фази: різні списки заклять, знижена вартість метамагії та потужні явища повні й нові.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SHADOW_MAGIC,
      description:
        "Тіньова магія дарує темнозір, пес омени, переміщення крізь темряву та невразливу тіньову форму.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.STORM_SORCERY,
      description:
        "Буревій у крові: польоти на вітрі, вибухи блискавок і громів, відштовхування ворогів та поділ польоту з союзниками.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WILD_MAGIC,
      description:
        "Дика магія породжує хаос: вибухи випадкових ефектів, вплив на кидки й контроль над спалахами сили.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Wizard ====
    {
      name: Subclasses.SCHOOL_OF_ABJURATION,
      description:
        "Школа захисту зміцнює магічні барʼєри: покращені контрчари, захисний резерв і стійкість проти заклять.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_BLADESINGING,
      description:
        "Блейдспів поєднує меч і магію: легкі обладунки, додаткові атаки, укривні маневри й посилена магія під час пісні.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_CHRONURGY,
      description:
        "Хронургія керує часом: зміщення кидків, зупинка ворогів у стазисі, сховище заклять і спотворення майбутнього.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_CONJURATION,
      description:
        "Школа виклику створює й переносить обʼєкти та істот: миттєві предмети, телепортація, надійні виклики.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_DIVINATION,
      description:
        "Ворожіння відкриває ймовірності: передбачення кидків, швидке відновлення чар і всевидюче око.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_ENCHANTMENT,
      description:
        "Причарування маніпулює волею: гіпноз, інстинктивний перенапрям атак, розділені чари та стирання спогадів.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_EVOCATION,
      description:
        "Втілення формує енергію: ліплення зон, посилені замовляння, контроль над шкодою й безпечні потужні вибухи.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_GRAVITURGY,
      description:
        "Гравітургія керує тяжінням: зміна щільності, притягнення, підсилені влучання та аура сповільнення ворогів.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_ILLUSION,
      description:
        "Ілюзії надають форму обману: покращені дрібні ілюзії, змінні чари, псевдотіла та наділення ілюзій реальністю.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_NECROMANCY,
      description:
        "Некромантія керує життям і смертю: збір енергії з убитих, сильніші скелети/зомбі, опір смерті й контроль над нежиттю.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ORDER_OF_SCRIBES,
      description:
        "Порядок переписувачів живить магію через книги: пробуджена книжка, маніфестований дух, створення свитків і захист від втрати заклять.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_TRANSMUTATION,
      description:
        "Трансмутація змінює матерію: перетворення речовин, камінь трансмутатора з корисними властивостями, зміна форми.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_WAR_MAGIC,
      description:
        "Військова магія поєднує оборону й напад: арканний відбій, бонус ініціативи, запас енергії та стійкість під час концентрації.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Druid ====
    {
      name: Subclasses.CIRCLE_OF_DREAMS,
      description:
        "Друїд мрій черпає силу з Фейвайлду: лікує союзників силою літа, укриває табір у тіні місяця, телепортує друзів і мандрує крізь сни.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_THE_LAND,
      description:
        "Коло землі привʼязане до певного біому: додаткові закляття землі, швидке відновлення магії, вільний рух крізь хащі та захист природи.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_THE_MOON,
      description:
        "Коло місяця спеціалізується на Дикій формі: бойова трансформація, сильніші звірі, елементалі та магічні удари.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_THE_SHEPHERD,
      description:
        "Друїд-пастух спілкується зі звірами й феями, викликає духів-тотемів, посилює закликаних істот і захищає їх.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_SPORES,
      description:
        "Споровий друїд носить грибковий симбіоз: аура спор, заражені тіла, некротичні посилення й імунітет до страху та отрути.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_STARS,
      description:
        "Коло зірок читає небесні знаки: зоряна мапа, сузірʼя, що дають стрілу, кубок чи дракона, космічні передвістя та сяйво, що захищає.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_WILDFIRE,
      description:
        "Дике полумʼя балансує руйнування й оновлення: дух вогню, додаткові вогняні й лікувальні закляття, запечатані спалахи та відродження з попелу.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Paladin ====
    {
      name: Subclasses.OATH_OF_THE_ANCIENTS,
      description:
        "Клятва древніх зобовʼязує паладина берегти світло й життя, захищаючи природу та радість від темряви.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_CONQUEST,
      description:
        "Клятва завоювання вимагає абсолютної перемоги: знищувати ворогів, сіяти страх і встановлювати залізний порядок.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_THE_CROWN,
      description:
        "Клятва корони присвячує паладина служінню закону, монарху або цивілізації, ставлячи обовʼязок вище за все.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_DEVOTION,
      description:
        "Клятва відданості — це ідеал білого лицаря: честь, чесність, співчуття та захист слабких від зла.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_GLORY,
      description:
        "Клятва слави вірить, що доля вирішується вчинками: паладин прагне героїзму, фізичної досконалості та легендарних подвигів.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_REDEMPTION,
      description:
        "Клятва спокути проповідує ненасильство й прощення, вдаючись до зброї лише як до останнього засобу для порятунку.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_VENGEANCE,
      description:
        "Клятва помсти — це обітниця карати злочинців будь-якою ціною, ставлячи знищення зла вище за власний спокій.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_THE_WATCHERS,
      description:
        "Клятва вартових захищає смертний світ від позавимірних загроз, стоячи на сторожі проти чужинців із інших планів.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATHBREAKER,
      description:
        "Клятвопорушник зрадив свої ідеали заради темної сили та амбіцій, керуючи нежиттю й сіючи жах.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Ranger ====
    {
      name: Subclasses.BEAST_MASTER_CONCLAVE,
      description:
        "Володар звірів формує містичний звʼязок із вірним звіром-супутником, котрий бʼється пліч-о-пліч із слідопитом.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.DRAKEWARDEN,
      description:
        "Драконячий охоронець повʼязує свою душу з духом дракона, викликаючи дрейка-супутника та володіючи силою дихання.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FEY_WANDERER,
      description:
        "Мандрівник фей черпає магію з Фейвайлду: чарівні атаки, опір до причарування та вміння маніпулювати розумом ворогів.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.GLOOM_STALKER_CONCLAVE,
      description:
        "Мисливець у темряві — майстер засідок у підземеллях: невидимість для темнозору, раптові удари та залізна воля.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.HORIZON_WALKER_CONCLAVE,
      description:
        "Мандрівник горизонту охороняє межі світів: телепортація, перетворення атак на силову енергію та захист від планарних загроз.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.HUNTER_CONCLAVE,
      description:
        "Мисливець спеціалізується на знищенні конкретних загроз: вбивця велетнів, винищувач орд або захисник від жахів.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.MONSTER_SLAYER_CONCLAVE,
      description:
        "Вбивця чудовиськ вивчає надприродних ворогів, щоб руйнувати їхню магію, протистояти їхнім прокльонам і знищувати їх.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SWARMKEEPER,
      description:
        "Охоронець рою керує духами природи у формі комах або птахів: рій атакує ворогів, захищає слідопита і переносить його.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Bard ====
    {
      name: Subclasses.COLLEGE_OF_CREATION,
      description:
        "Колегія творення звертається до первісної Пісні творення — гармонії, що досі відлунює в бутті. Її барди через музику, танець і поезію творять із нічого речі та пробуджують неживе до руху.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_ELOQUENCE,
      description:
        "Прихильники Колегії красномовства опановують мистецтво ораторства. Вони поєднують логіку, майстерність слова й гру на почуттях, щоб схиляти на свій бік скептиків, противників і цілі натовпи.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_GLAMOUR,
      description:
        "Колегія гламуру походить із яскравого Фейвайлду та вчить бардів зачаровувати публіку фейською магією. Їхні виступи викликають водночас захват і страх, а сама їхня присутність полонить чужу волю.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_LORE,
      description:
        "Барди Колегії знань збирають уривки відомостей з учених трактатів і народних переказів. Їхня відданість належить красі й правді, а знання вони обертають і на гостре слово, і на доступ до чужої магії.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_SPIRITS,
      description:
        "Барди Колегії духів шукають історії, що мають власну силу — легенди, хроніки й навіть вигадки. За допомогою окультних атрибутів вони втілюють духів могутніх сил, хоча ті не завжди охоче підкоряються.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_SWORDS,
      description:
        "Бардів Колегії мечів звуть клинками: вони розважають публіку зухвалими демонстраціями володіння зброєю. Їхні трюки — це водночас вистава і справжнє бойове мистецтво.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_VALOR,
      description:
        "Барди Колегії доблесті — відважні скальди, що зберігають памʼять про великих героїв минулого й сучасності. Їхні пісні надихають інших на подвиги, а самі вони без вагань стають до бою.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_WHISPERS,
      description:
        "Колегія шепотів обертає добру славу бардів собі на користь. Її барди збирають таємниці, сіють страх і використовують знання та магію, щоб шантажем і погрозами впливати на тих, хто має владу.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Rogue ====
    {
      name: Subclasses.ARCANE_TRICKSTER,
      description:
        "Містичний шахрай поєднує спритність рук зі знанням ілюзій та чарівництва, щоб заплутати та пограбувати ворогів.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.THIRD,
      grantsSpells: true,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ASSASSIN,
      description:
        "Убивця — майстер маскування та отрут, що спеціалізується на швидкому та смертоносному усуненні цілей.",
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.INQUISITIVE,
      description:
        "Допитливий використовує гострий розум та спостережливість, щоб розгадувати таємниці та знаходити вразливі місця ворогів навіть у запалі бою.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.MASTERMIND,
      description:
        "Майстер інтриг — фахівець з маніпуляцій та стратегії, який здатен бачити наскрізь чужі плани та керувати союзниками на відстані.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PHANTOM,
      description:
        "Фантом має звʼязок зі світом мертвих, використовуючи енергію смерті для атак та отримання знань від духів.",
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCOUT,
      description:
        "Скаут — майстер виживання та розвідки, що відрізняється неймовірною мобільністю серед дикої природи.",
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SOULKNIFE,
      description:
        "Душевний ніж викликає леза з чистої психічної енергії та використовує свій розум для посилення власних можливостей та звʼязку з іншими.",
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SWASHBUCKLER,
      description:
        "Дуелянт — шляхетний та зухвалий боєць, що покладається на швидкість, чарівність та майстерність фехтування один на один.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.THIEF,
      description:
        "Злодій фокусується на класичних навичках шахрайства: зломі замків, спритності рухів та швидкому використанні магічних предметів.",
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },

    {
      name: Subclasses.WAY_OF_MERCY,
      description:
        "Шлях милосердя вчить маніпулювати життєвою силою, щоб зцілювати стражденних і карати ворогів. Монахи носять маски, як символ своєї ролі між життям і смертю.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_ASCENDANT_DRAGON,
      description:
        "Шлях висхідного дракона дозволяє монаху втілювати силу драконів. Вони видихають руйнівну енергію, літають на примарних крилах і наповнюють свої удари стихійною силою.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_ASTRAL_SELF,
      description:
        'Шлях астрального "я" вірить, що тіло — це ілюзія. Монахи викликають астральні руки, маски та обладунки, що є проявом їхньої істинної душі та волі.',
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_DRUNKEN_MASTER,
      description:
        "Шлях пʼяного майстра навчає рухатися з непередбачуваною грацією пʼяниці. Монах хитається й ухиляється, збиваючи ворогів з пантелику та завдаючи швидких ударів.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_FOUR_ELEMENTS,
      description:
        "Шлях чотирьох стихій дозволяє монаху керувати вогнем, водою, повітрям і землею. Вони використовують свою ци, щоб створювати вибухи полумʼя, крижані стіни та пориви вітру.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_KENSEI,
      description:
        "Шлях кенсея фокусується на майстерності володіння зброєю. Для цих монахів меч або лук є продовженням тіла, а бойове мистецтво перетворюється на витончену каліграфію.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_LONG_DEATH,
      description:
        "Шлях довгої смерті вивчає механізми вмирання. Монахи цього шляху поглинають життєву силу ворогів, щоб зцілювати себе, і випромінюють ауру жаху.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_OPEN_HAND,
      description:
        "Шлях відкритої долоні — це класичне бойове мистецтво. Монахи маніпулюють енергією ци ворога, збиваючи його з ніг, відштовхуючи або навіть миттєво зупиняючи серце.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_SHADOW,
      description:
        "Шлях тіні навчає мистецтву непомітності та вбивства. Монахи переміщуються між тінями, стають невидимими й використовують темряву, щоб дезорієнтувати ворогів.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_SUN_SOUL,
      description:
        "Шлях сонячної душі дозволяє каналізувати внутрішнє світло. Монахи вистрілюють променями променевої енергії та створюють вибухи світла, спалюючи темряву.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
];

export function readSubclassSeedInputs(): SubclassSeed[] {
  return SUBCLASS_SEED_INPUTS;
}

export const seedSubclasses = async (prisma: PrismaClient) => {
  console.log("Створюємо підкласи...");

  const subclasses = SUBCLASS_SEED_INPUTS;

  for (const subclass of subclasses) {
    const { classConnect, ...data } = subclass;
    const cls = await prisma.class.findUnique({
      where: { name_ruleset: { name: classConnect, ruleset: ACTIVE_RULESET } },
    });

    if (!cls) {
      console.error(
        "💀 КЛАС НЕ ЗНАЙДЕНО:",
        classConnect,
        "для підкласу:",
        subclass.name,
      );
      throw new Error(
        `Class ${classConnect} not found for subclass ${subclass.name}`,
      );
    }

    await prisma.subclass.upsert({
      where: {
        classId_name: {
          classId: cls.classId,
          name: subclass.name,
        },
      },
      update: {
        ...data,
        class: {
          connect: { name_ruleset: { name: classConnect, ruleset: ACTIVE_RULESET } },
        },
      },
      create: {
        ...data,
        class: {
          connect: { name_ruleset: { name: classConnect, ruleset: ACTIVE_RULESET } },
        },
      },
    });
  }

  console.log(`Готово. Оновлено ${subclasses.length} підкласів.`);
};

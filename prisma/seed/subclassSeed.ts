import { Ability, Classes, Prisma, PrismaClient, SpellcastingType, Subclasses } from "@prisma/client"

type SubclassSeed = Omit<Prisma.SubclassCreateInput, "class" | "name"> & {
  name: Subclasses
  classConnect: Classes
}

export const seedSubclasses = async (prisma: PrismaClient) => {
  console.log("Створюємо підкласи...")

  const subclasses: SubclassSeed[] = [
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
      description: "Чемпіон покладається на природну силу та витривалість, зосереджуючись на чистій бойовій майстерності.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ECHO_KNIGHT,
      description: "Лицар луни викликає магічну копію себе, атакуючи та захищаючись через цей відбиток на полі бою.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ELDRITCH_KNIGHT,
      description: "Містичний лицар поєднує магію чарівника зі збройною майстерністю, накладаючи заклинання поряд із ударами.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.THIRD,
      grantsSpells: true,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PSI_WARRIOR,
      description: "Псі-воїн спрямовує телекінетичну й психічну енергію, щоб захищати союзників та посилювати власні удари.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.RUNE_KNIGHT,
      description: "Рунний лицар черпає силу у магії велетнів, наносячи руни на спорядження та посилюючи власну міць.",
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SAMURAI,
      description: "Самурай спирається на дисципліну та незламний дух, щоб витримувати натиск і завдавати вирішальних ударів.",
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
        "Звірячий шлях вивільняє первісну іскру: під час люті тіло змінюється, з’являються пазурі, хвости чи щелепи.",
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
        "Ревний воїн сповнений божественного гніву: додаткова радіантна чи некротична шкода, стійкість до смерті й натхнення союзників.",
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
        "Домен світла бореться з темрявою: засліплення ворогів, промениста шкода й контролювання битви ясним сяйвом.",
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
        "Домен миру зцілює й підтримує союзників через містичні зв’язки, гармонію й захист від конфліктів.",
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
        "Покровитель-архіфея дарує силу обману, чарів і туману: присутність феї, невидимість і видіння зводять ворогів з розуму.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FIEND,
      description:
        "Бісівський покровитель укріплює вас пекельною удачею та опором: додаткові закляття вогню, благословення при перемозі й безжальне вигнання ворогів.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.GREAT_OLD_ONE,
      description:
        "Древній жах дарує телепатію та захист думок: викривлення ймовірності, психічний захист і створення слуг-трилів.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.HEXBLADE,
      description:
        "Хексблейд черпає силу з потойбічної зброї: прокляття цілей, майстерність зброї на Харизмі й прислужники-спектри.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CELESTIAL,
      description:
        "Небесний покровитель дарує світло й зцілення: запас лікування, опір радіантній шкоді та відродження в променистому спалаху.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FATHOMLESS,
      description:
        "Безодня наділяє силами океану: примарні щупальця, опір холоду, контроль води й телепортація крізь глибини.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.THE_GENIE,
      description:
        "Благородний джинн дає судину, що містить силу стихій: розширений список заклять, додаткову шкоду його стихією та польоти на дарованих вітрах.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.UNDEAD,
      description:
        "Покровитель-некроархон дозволяє ставати формою жаху, посилює некротичну шкоду й дарує безсмертні спалахи.",
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.UNDYING,
      description:
        "Невмерлий покровитель захищає від смерті: опір хворобам, ігнорування голоду та відновлення тіла після поранень.",
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
        "Школа захисту зміцнює магічні бар’єри: покращені контрчари, захисний резерв і стійкість проти заклять.",
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
        "Школа виклику створює й переносить об’єкти та істот: миттєві предмети, телепортація, надійні виклики.",
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
        "Коло землі прив’язане до певного біому: додаткові закляття землі, швидке відновлення магії, вільний рух крізь хащі та захист природи.",
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
        "Коло зірок читає небесні знаки: зоряна мапа, сузір’я, що дають стрілу, кубок чи дракона, космічні передвістя та сяйво, що захищає.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_WILDFIRE,
      description:
        "Дике полум’я балансує руйнування й оновлення: дух вогню, додаткові вогняні й лікувальні закляття, запечатані спалахи та відродження з попелу.",
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
  ]

  for (const subclass of subclasses) {
    const { classConnect, ...data } = subclass
    const cls = await prisma.class.findUnique({ where: { name: classConnect } })

    await prisma.subclass.upsert({
      where: {
        classId_name: {
          classId: cls!.classId,
          name: subclass.name,
        },
      },
      update: {
        ...data,
        class: {
          connect: { name: classConnect },
        },
      },
      create: {
        ...data,
        class: {
          connect: { name: classConnect },
        },
      },
    })
  }

  console.log(`Готово. Оновлено ${subclasses.length} підкласів.`)
}

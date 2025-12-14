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
      description: "Містичний лицар поєднує магію мага зі збройною майстерністю, накладаючи заклинання поряд із ударами.",
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
        "Арканний домен поєднує божественне служіння з вивченням магії: заклинання мага, усунення чарів та покарання порушників магічного порядку.",
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

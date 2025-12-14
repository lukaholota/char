import { Ability, Classes, Prisma, PrismaClient, SpellcastingType, Subclasses } from "@prisma/client"

type SubclassSeed = Omit<Prisma.SubclassUncheckedCreateInput, "classId" | "name"> & {
  name: Subclasses
  className: Classes
}

export const seedSubclasses = async (prisma: PrismaClient) => {
  console.log("Створюємо підкласи...")

  const subclasses: SubclassSeed[] = [
    {
      name: Subclasses.ARCANE_ARCHER,
      description:
        "Магічний лучник поєднує стрільбу та чари, щоб наділяти стріли надприродними ефектами й контролювати поле бою з відстані.",
      spellcastingType: SpellcastingType.NONE,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.BANNERET,
      description:
        "Пурпурний драконовий рицар надихає союзників своєю відвагою та підтримує їх у бою, перетворюючи власну доблесть на спільну силу.",
      spellcastingType: SpellcastingType.NONE,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.BATTLE_MASTER,
      description:
        "Майстер бою вивчає маневри й тактику, керуючи сутичкою через точні прийоми та перевагу на полі бою.",
      spellcastingType: SpellcastingType.NONE,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CAVALIER,
      description:
        "Кавалер охороняє союзників, утримує лінію фронту та контролює ворогів поруч із собою, часто з верха коня.",
      spellcastingType: SpellcastingType.NONE,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CHAMPION,
      description: "Чемпіон покладається на природну силу та витривалість, зосереджуючись на чистій бойовій майстерності.",
      spellcastingType: SpellcastingType.NONE,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ECHO_KNIGHT,
      description: "Лицар луни викликає магічну копію себе, атакуючи та захищаючись через цей відбиток на полі бою.",
      spellcastingType: SpellcastingType.NONE,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ELDRITCH_KNIGHT,
      description: "Містичний лицар поєднує магію мага зі збройною майстерністю, накладаючи заклинання поряд із ударами.",
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.THIRD,
      grantsSpells: true,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PSI_WARRIOR,
      description: "Псі-воїн спрямовує телекінетичну й психічну енергію, щоб захищати союзників та посилювати власні удари.",
      spellcastingType: SpellcastingType.NONE,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.RUNE_KNIGHT,
      description: "Рунний лицар черпає силу у магії велетнів, наносячи руни на спорядження та посилюючи власну міць.",
      spellcastingType: SpellcastingType.NONE,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SAMURAI,
      description: "Самурай спирається на дисципліну та незламний дух, щоб витримувати натиск і завдавати вирішальних ударів.",
      spellcastingType: SpellcastingType.NONE,
      className: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
  ]

  for (const subclass of subclasses) {
    const { className, ...data } = subclass
    const cls = await prisma.class.findUnique({ where: { name: className } })
    if (!cls) continue

    await prisma.subclass.upsert({
      where: {
        classId_name: {
          classId: cls.classId,
          name: subclass.name,
        },
      },
      update: data,
      create: {
        ...data,
        classId: cls.classId,
      },
    })
  }

  console.log(`Готово. Оновлено ${subclasses.length} підкласів.`)
}

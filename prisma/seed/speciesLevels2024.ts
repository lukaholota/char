/**
 * KR18.5 — рівні персонажа на рисах і заклинаннях видів 2024.
 *
 * До цього сіду всі шість рівневих рис лежали в `race_trait` як безумовні, тобто персонаж
 * діставав Драконячий політ на 1-му рівні. Умову нема куди було записати — стовпця не було.
 * Тепер він є, і сід проставляє рівні з PHB 2024, а заклинання родоводу 3-го й 5-го рівня
 * кладе в `race_choice_option_spell` — рівно колонки Level 3 і Level 5 таблиці родоводів.
 *
 * Нічого не коіновано: усі риси й заклинання вже в базі під цими англійськими назвами.
 * Ідемпотентний — повторний прогін дає ті самі числа.
 */

import { PrismaClient, Ruleset } from "@prisma/client";

const RULESET: Ruleset = "RULES_2024";

/** Риси видів, які PHB 2024 відкриває пізніше за 1-й рівень персонажа. */
const TRAIT_LEVELS: Array<{ featureEngName: string; level: number }> = [
  { featureEngName: "Dragonborn: Draconic Flight (2024)", level: 5 },
  { featureEngName: "Goliath: Large Form (2024)", level: 5 },
  { featureEngName: "Aasimar: Celestial Revelation (2024)", level: 3 },
  // Форми прояву йдуть разом із самим Проявом: варіант обирається під час кожної
  // трансформації, а не один раз у майстрі, тож вибором вони не є.
  { featureEngName: "Aasimar: Heavenly Wings (2024)", level: 3 },
  { featureEngName: "Aasimar: Necrotic Shroud (2024)", level: 3 },
  { featureEngName: "Aasimar: Inner Radiance (2024)", level: 3 },
];

/**
 * Таблиці «Elven Lineages» і «Fiendish Legacies» з SRD 5.2.1: у рядку родоводу колонки
 * Level 3 і Level 5 несуть просто назву заклинання, без окремої риси.
 */
const LINEAGE_SPELLS: Array<{ choiceGroupName: string; optionNameEng: string; spells: Array<[engName: string, characterLevel: number]> }> = [
  { choiceGroupName: "Ельфійський родовід", optionNameEng: "Drow", spells: [["Faerie Fire", 3], ["Darkness", 5]] },
  { choiceGroupName: "Ельфійський родовід", optionNameEng: "High Elf", spells: [["Detect Magic", 3], ["Misty Step", 5]] },
  { choiceGroupName: "Ельфійський родовід", optionNameEng: "Wood Elf", spells: [["Longstrider", 3], ["Pass without Trace", 5]] },
  { choiceGroupName: "Демонічна спадщина", optionNameEng: "Abyssal", spells: [["Ray of Sickness", 3], ["Hold Person", 5]] },
  { choiceGroupName: "Демонічна спадщина", optionNameEng: "Chthonic", spells: [["False Life", 3], ["Ray of Enfeeblement", 5]] },
  { choiceGroupName: "Демонічна спадщина", optionNameEng: "Infernal", spells: [["Hellish Rebuke", 3], ["Darkness", 5]] },
];

export const seedSpeciesLevels2024 = async (prisma: PrismaClient) => {
  console.log("🪜 Рівні рис і заклинань видів 2024…");

  const gatedTraits = await raiseTraitLevels(prisma);
  const lineageSpells = await seedLineageSpells(prisma);

  console.log(`  • ${gatedTraits} рис виду привʼязано до рівня персонажа`);
  console.log(`  • ${lineageSpells} рівневих заклинань родоводу`);
};

async function raiseTraitLevels(prisma: PrismaClient): Promise<number> {
  let updated = 0;

  for (const { featureEngName, level } of TRAIT_LEVELS) {
    const { count } = await prisma.raceTrait.updateMany({
      where: { ruleset: RULESET, feature: { engName: featureEngName } },
      data: { level },
    });
    if (!count) console.warn(`  ⚠️ Риси "${featureEngName}" немає в race_trait — рівень ${level} не проставлено`);
    updated += count;
  }

  return updated;
}

async function seedLineageSpells(prisma: PrismaClient): Promise<number> {
  let written = 0;

  for (const { choiceGroupName, optionNameEng, spells } of LINEAGE_SPELLS) {
    const option = await prisma.raceChoiceOption.findFirst({
      where: { ruleset: RULESET, choiceGroupName, optionNameEng },
      select: { optionId: true },
    });
    if (!option) {
      console.warn(`  ⚠️ Опції "${optionNameEng}" (${choiceGroupName}) немає — рівневі заклинання пропущено`);
      continue;
    }

    for (const [engName, characterLevel] of spells) {
      const spell = await findSpell2024(prisma, engName);
      if (!spell) {
        console.warn(`  ⚠️ Заклинання "${engName}" немає в базі — ${optionNameEng} @${characterLevel} пропущено`);
        continue;
      }

      await prisma.raceChoiceOptionSpell.upsert({
        where: { optionId_spellId: { optionId: option.optionId, spellId: spell.spellId } },
        create: { optionId: option.optionId, spellId: spell.spellId, characterLevel, ruleset: RULESET },
        update: { characterLevel, ruleset: RULESET },
      });
      written += 1;
    }
  }

  return written;
}

/** Заклинання 2024 і 2014 ділять англійську назву — родовід має брати саме запис своєї редакції. */
async function findSpell2024(prisma: PrismaClient, engName: string) {
  return prisma.spell.findFirst({ where: { engName, ruleset: RULESET }, select: { spellId: true } });
}

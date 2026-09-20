/**
 * KR31.4 — риси 2024, що міняють числа персонажа.
 *
 * До цієї цілі риса могла дати лише характеристику: швидкості, ініціативи й плоских хітів
 * `Feature` не несла взагалі. Колонки додав
 * `db/changes/2026-09-06-kr31.4-feat-mechanics-columns.sql`, а цей сід кладе в них числа з книги.
 *
 * Шлях до листа — той самий, яким уже їдуть бойові стилі: риса дає `Feature`
 * (`Feat.grantsFeature`), `collectActiveFeatures` збирає її в пул, `bonus-calculator` читає число.
 */

import { FeatureDisplayType, PrismaClient, Ruleset, Skills } from "@prisma/client";
import { engEnumSkills } from "../../src/lib/refs/translation";
import { CHOICE_GROUPS_2024, linkFeatChoiceOption, upsertChoiceOption2024 } from "./helpers/choiceOptions2024";

const RULESET: Ruleset = "RULES_2024";

type StatGrant = {
  featEngName: string;
  featureEngName: string;
  name: string;
  description: string;
  speedBonus?: number;
  initiativeProficiency?: boolean;
  bonusHitPoints?: number;
};

/** Джерело кожного рядка — `data/2024/normalized/feats.json`, поле `benefitsEng` названої риси. */
const STAT_GRANTS_2024: readonly StatGrant[] = [
  {
    featEngName: "Speedy",
    featureEngName: "Speedy: Speed Increase (2024)",
    name: "Швидкий: приріст швидкості",
    description: "Ваша швидкість зростає на 10 футів.",
    speedBonus: 10,
  },
  {
    featEngName: "Boon Of Speed",
    featureEngName: "Boon of Speed: Quickness (2024)",
    name: "Дар швидкості: прудкість",
    description: "Ваша швидкість зростає на 30 футів.",
    speedBonus: 30,
  },
  {
    featEngName: "Alert",
    featureEngName: "Alert: Initiative Proficiency (2024)",
    name: "Пильність: володіння ініціативою",
    description: "Кидаючи ініціативу, ви можете додати до кидка свій бонус майстерності.",
    initiativeProficiency: true,
  },
  {
    featEngName: "Boon Of Fortitude",
    featureEngName: "Boon of Fortitude: Fortified Health (2024)",
    name: "Дар витривалості: укріплене здоровʼя",
    description: "Ваш максимум хітів зростає на 40.",
    bonusHitPoints: 40,
  },
  // Рішення власника 2026-09-14: Істинний зір — лише риса у списку фіч, без колонки чуття.
  {
    featEngName: "Boon Of Truesight",
    featureEngName: "Boon of Truesight: Truesight (2024)",
    name: "Дар істинного зору: істинний зір",
    description: "Ви маєте {{Істинний зір|Truesight}} на відстань 60 футів.",
  },
];

export const seedFeatStatGrants2024 = async (prisma: PrismaClient) => {
  console.log("📈 Числові надання рис 2024: швидкість, ініціатива, хіти…");

  for (const grant of STAT_GRANTS_2024) {
    await grantFeatureToFeat(prisma, grant);
  }

  await seedBoonOfSkill(prisma);

  console.log("✅ Числові надання рис 2024 на місці");
};

async function grantFeatureToFeat(prisma: PrismaClient, grant: StatGrant) {
  const feat = await findFeat2024(prisma, grant.featEngName);
  if (!feat) return;

  const data = {
    name: grant.name,
    description: grant.description,
    shortDescription: grant.description,
    displayType: [FeatureDisplayType.PASSIVE],
    ruleset: RULESET,
    speedBonus: grant.speedBonus ?? null,
    initiativeProficiency: grant.initiativeProficiency ?? null,
    bonusHitPoints: grant.bonusHitPoints ?? null,
  };

  const feature = await prisma.feature.upsert({
    where: { engName: grant.featureEngName },
    update: data,
    create: { ...data, engName: grant.featureEngName },
  });

  await prisma.feat.update({
    where: { featId: feat.featId },
    data: { grantsFeature: { connect: { featureId: feature.featureId } } },
  });
  console.log(`  • ${grant.featEngName} → ${grant.name}`);
}

/**
 * «All-Around Adept. You gain proficiency in all skills» — фіксована видача через
 * `feat.grantedSkills`, яку рушій уже читає. «Expertise. Choose one skill in which you lack
 * Expertise» — окрема група вибору, як у Експерта у навичках.
 */
async function seedBoonOfSkill(prisma: PrismaClient) {
  const boon = await findFeat2024(prisma, "Boon Of Skill");
  if (!boon) return;

  const allSkills = Object.values(Skills);
  await prisma.feat.update({ where: { featId: boon.featId }, data: { grantedSkills: allSkills } });

  for (const skill of allSkills) {
    const option = await upsertChoiceOption2024(prisma, {
      groupName: CHOICE_GROUPS_2024.EXPERTISE,
      optionName: engEnumSkills.find((entry) => entry.eng === skill)?.ukr ?? skill,
      optionNameEng: `Boon of Skill 2024 expertise (${skill})`,
      effectKind: "SKILL_EXPERTISE",
      effectSkill: skill,
    });
    await linkFeatChoiceOption(prisma, boon.featId, option.choiceOptionId);
  }
  console.log(`  • Дар умілості: володіння ${allSkills.length} навичками плюс експертиза на вибір`);
}

async function findFeat2024(prisma: PrismaClient, engName: string) {
  const feat = await prisma.feat.findFirst({
    where: { ruleset: RULESET, engName },
    select: { featId: true },
  });
  if (!feat) console.warn(`  ⚠️ Риси "${engName}" (2024) немає в базі — спершу запусти seedFeats2024`);
  return feat;
}


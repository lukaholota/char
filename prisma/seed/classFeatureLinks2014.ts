import { Classes, PrismaClient, Ruleset } from "@prisma/client";

/// `seedClasses` вміє звʼязок класу з фічею лише додати або оновити — прибрати зайвий рядок
/// воно не може за побудовою, бо читає список «що має бути» і ніколи не питає, що вже є.
/// Два дефекти KR31.12 саме такої форми: клірик носить паладинську «Channel Divinity», а
/// чарівник — порожню загальну «Spellcasting», і жодного з цих рядків у сіді класів немає.
/// Тому корекція звʼязків їде окремим сідом, тим самим шляхом, що й текст у
/// `classFeatureText2014.ts`: спершу показати розбіжність, потім записати.

const ACTIVE_RULESET: Ruleset = "RULES_2014";

export type RequiredClassFeatureLink = {
  className: Classes;
  featureEngName: string;
  levelGranted: number;
};

export type ForbiddenClassFeatureLink = {
  className: Classes;
  featureEngName: string;
  why: string;
};

/// «Вигнання нежиті» лежить у `classFeatureSeed.ts` як фіча, але в жодному класовому списку не
/// названа, тож класового звʼязку не має — клірик її не отримує ніколи, а «Знищення нежиті» на
/// 5 рівні описує покращення риси, якої в персонажа немає.
export const REQUIRED_CLASS_FEATURE_LINKS_2014: RequiredClassFeatureLink[] = [
  { className: Classes.CLERIC_2014, featureEngName: "Turn Undead", levelGranted: 2 },
];

export const FORBIDDEN_CLASS_FEATURE_LINKS_2014: ForbiddenClassFeatureLink[] = [
  {
    className: Classes.CLERIC_2014,
    featureEngName: "Channel Divinity",
    why: "риса паладина (клятва, СК ряткидку паладина); у клірика власна «Channel Divinity (Cleric)»",
  },
  {
    className: Classes.WIZARD_2014,
    featureEngName: "Spellcasting",
    why: "порожній дублікат «Spellcasting (Wizard)» — «Ви можете чаклувати» і нічого більше",
  },
];

export type ClassFeatureLinkDrift = {
  missing: RequiredClassFeatureLink[];
  extra: ForbiddenClassFeatureLink[];
};

export async function findClassFeatureLinkDrift(
  prisma: PrismaClient
): Promise<ClassFeatureLinkDrift> {
  const missing: RequiredClassFeatureLink[] = [];
  const extra: ForbiddenClassFeatureLink[] = [];

  for (const link of REQUIRED_CLASS_FEATURE_LINKS_2014) {
    if (!(await findLinkId(prisma, link))) missing.push(link);
  }

  for (const link of FORBIDDEN_CLASS_FEATURE_LINKS_2014) {
    if (await findLinkId(prisma, link)) extra.push(link);
  }

  return { missing, extra };
}

export async function syncClassFeatureLinksFromSeed(
  prisma: PrismaClient
): Promise<ClassFeatureLinkDrift> {
  const drift = await findClassFeatureLinkDrift(prisma);

  for (const link of drift.missing) {
    const ids = await findClassAndFeatureIds(prisma, link);
    if (!ids) continue;

    await prisma.classFeature.create({
      data: { ...ids, levelGranted: link.levelGranted, ruleset: ACTIVE_RULESET },
    });
  }

  for (const link of drift.extra) {
    const classFeatureId = await findLinkId(prisma, link);
    if (!classFeatureId) continue;

    await prisma.classFeature.delete({ where: { classFeatureId } });
  }

  return drift;
}

async function findLinkId(
  prisma: PrismaClient,
  link: { className: Classes; featureEngName: string }
): Promise<number | null> {
  const ids = await findClassAndFeatureIds(prisma, link);
  if (!ids) return null;

  const row = await prisma.classFeature.findUnique({
    where: { classId_featureId: ids },
    select: { classFeatureId: true },
  });

  return row?.classFeatureId ?? null;
}

async function findClassAndFeatureIds(
  prisma: PrismaClient,
  link: { className: Classes; featureEngName: string }
): Promise<{ classId: number; featureId: number } | null> {
  const [classRow, feature] = await Promise.all([
    prisma.class.findUnique({
      where: { name_ruleset: { name: link.className, ruleset: ACTIVE_RULESET } },
      select: { classId: true },
    }),
    prisma.feature.findUnique({
      where: { engName: link.featureEngName },
      select: { featureId: true },
    }),
  ]);

  if (!classRow || !feature) return null;

  return { classId: classRow.classId, featureId: feature.featureId };
}

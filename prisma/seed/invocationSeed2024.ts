/**
 * KR18.8 — потойбічні виклики 2024.
 *
 * `data/2024/normalized/invocations.json` (31 записів) уже давно живить каталог
 * `/2024/invocations`, але жодного рядка `RULES_2024` не було в `choice_option` — Чорнокнижник
 * 2024 їх ніде не пропонував. Цей сід додає механіку: Feature + ChoiceOption на кожен виклик,
 * звʼязок ChoiceOptionFeature і ClassChoiceOption на WARLOCK_2024.
 *
 * `Feature.engName` і `ChoiceOption.optionNameEng` унікальні на всю базу (не за редакцією), а
 * 28 із 31 назв 2024 збігаються з викликами 2014. Замість DDL на складений ключ — той самий
 * прийом, яким уже названо всі 516 фіч 2024 і викликами 2024 феат-опцій (KR18.3):
 * суфікс `" (2024)"` у ключі. Користувач його не бачить — на екрані завжди українська назва.
 *
 * Ідемпотентний: усе на upsert, повторний прогін нічого не дублює.
 */

import { PrismaClient, Ruleset } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHOICE_GROUPS } from "../../src/lib/logic/choicePoolRules";
import { stripToPlainText } from "../../src/lib/logic/plain-text";
import { linkChoiceOptionFeature, linkClassChoiceOption, upsertChoiceOption2024 } from "./helpers/choiceOptions2024";

const RULESET: Ruleset = "RULES_2024";

// SRD 5.2, Warlock Features table, колонка Eldritch Invocations: нові вибори на рівнях
// 1, 2, 5, 7, 9, 12, 15, 18 (те саме, що picksAtLevel у choicePoolRules.ts). Кожен виклик несе
// однаковий набір рівнів-гейтів — реальне обмеження (рівень, пакт) перевіряє передумова під час
// вибору, а не цей список; так само влаштовано всі 2014-виклики в classChoiceOptionSeed.ts.
const INVOCATION_GRANT_LEVELS = [1, 2, 5, 7, 9, 12, 15, 18];

type Invocation2024 = {
  id: number;
  name: string;
  nameUa: string;
  engName: string;
  minLevel: number | null;
  pactRequirement: string | null;
  prerequisite: string | null;
  description: string;
  shortDescription: string;
  ruleset: string;
  source: string;
};

const suffixed = (engName: string) => `${engName} (2024)`;

function readInvocations2024(): Invocation2024[] {
  const raw = readFileSync(join(process.cwd(), "data/2024/normalized/invocations.json"), "utf-8");
  return JSON.parse(raw);
}

async function upsertInvocationFeature(prisma: PrismaClient, invocation: Invocation2024) {
  const data = {
    name: invocation.nameUa,
    description: invocation.description,
    shortDescription: invocation.shortDescription,
    displayType: ["PASSIVE" as const],
    ruleset: RULESET,
  };

  return prisma.feature.upsert({
    where: { engName: suffixed(invocation.engName) },
    update: data,
    create: { ...data, engName: suffixed(invocation.engName) },
  });
}

export const seedInvocations2024 = async (prisma: PrismaClient) => {
  console.log("👁️ Потойбічні виклики 2024...");

  const warlock = await prisma.class.findFirstOrThrow({
    where: { ruleset: RULESET, name: "WARLOCK_2024" },
    select: { classId: true },
  });

  const invocations = readInvocations2024();
  let seeded = 0;

  for (const invocation of invocations) {
    const feature = await upsertInvocationFeature(prisma, invocation);

    const prerequisites: { level?: number; pact?: string } = {};
    if (invocation.minLevel != null) prerequisites.level = invocation.minLevel;
    if (invocation.pactRequirement) prerequisites.pact = suffixed(invocation.pactRequirement);

    const option = await upsertChoiceOption2024(prisma, {
      groupName: CHOICE_GROUPS.WARLOCK_INVOCATIONS,
      /// `option_name` — VarChar(100) і UI-підпис, а не проза: посилання на заклинання, які
      /// проставляч ставить у короткий опис, сюди не лізуть ні за змістом, ні за довжиною.
      optionName: stripToPlainText(invocation.shortDescription),
      optionNameEng: suffixed(invocation.engName),
      prerequisites,
    });

    await linkChoiceOptionFeature(prisma, option.choiceOptionId, feature.featureId);
    await linkClassChoiceOption(prisma, {
      classId: warlock.classId,
      choiceOptionId: option.choiceOptionId,
      levelsGranted: INVOCATION_GRANT_LEVELS,
    });

    seeded++;
  }

  console.log(`✅ Виклики 2024: ${seeded} із ${invocations.length}`);
};

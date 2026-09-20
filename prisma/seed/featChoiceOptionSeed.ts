import { PrismaClient, Feats, Ability, Skills, Prisma, Ruleset } from "@prisma/client";
import { engEnumSkills, attributesUkrFull } from "../../src/lib/refs/translation";
import { CHOICE_GROUPS } from "./helpers/groupNames";
import { buildFeatChoiceOptions2014 } from "./featChoiceOptions2014";

const ACTIVE_RULESET: Ruleset = "RULES_2014";

export const seedFeatChoiceOptions = async (prisma: PrismaClient) => {
  console.log('⚔️ Додаємо опції вибору для рис (Feats)...');

  // Verify Battle Master maneuvers exist (dependency check)
  const maneuverCount = await prisma.choiceOption.count({
    where: { groupName: CHOICE_GROUPS.BATTLE_MASTER_MANEUVERS }
  });
  
  if (maneuverCount === 0) {
    console.warn("⚠️ Маневри майстра бою не знайдені! Запусти subclassChoiceOptionSeed перед цим.");
  }

  /**
   * Helper to find feat by enum value
   */
  const findFeat = async (name: Feats) => {
    const feat = await prisma.feat.findUnique({ where: { name_ruleset: { name, ruleset: ACTIVE_RULESET } } });
    if (!feat) console.warn(`⚠️ Feat ${name} not found!`);
    return feat;
  };

  /**
   * Helper to create or find ChoiceOption
   * @param groupName - Ukrainian group name for UI display
   * @param optionName - Ukrainian option name for UI display
   * @param optionNameEng - UNIQUE English identifier
   * @param features - Array of feature engNames to connect (optional)
   */
  const createChoiceOption = async (
    groupName: string,
    optionName: string,
    optionNameEng: string,
    features: { engName: string }[] = [],
    effect?: {
      kind?: "ASI" | "SKILL_PROFICIENCY" | "SKILL_EXPERTISE";
      ability?: Ability;
      skill?: Skills;
      amount?: number;
    }
  ) => {
    const existing = await prisma.choiceOption.findUnique({
      where: { optionNameEng }
    });

    if (existing) {
      // Keep already-seeded records in sync with canonical display names.
      // This helps rename legacy group titles without changing IDs.
      const ex: any = existing;
      const data: Prisma.ChoiceOptionUpdateInput = {};

      if (existing.groupName !== groupName) data.groupName = groupName;
      if (existing.optionName !== optionName) data.optionName = optionName;

      // Backfill effect metadata onto already-seeded records (prefer not to overwrite).
      if (effect?.kind) {
        if (ex.effectKind == null) data.effectKind = effect.kind as any;
        if (effect.ability && ex.effectAbility == null) data.effectAbility = effect.ability as any;
        if (effect.skill && ex.effectSkill == null) data.effectSkill = effect.skill as any;
        if (effect.amount != null && ex.effectAmount == null) data.effectAmount = effect.amount;
      }

      if (Object.keys(data).length > 0) {
        return await prisma.choiceOption.update({
          where: { choiceOptionId: existing.choiceOptionId },
          data,
        });
      }

      return existing;
    }

    // Find features to connect
    const featureConnects: Prisma.ChoiceOptionFeatureCreateWithoutOptionInput[] = [];
    for (const f of features) {
      const feature = await prisma.feature.findFirst({ where: { engName: f.engName } });
      if (feature) {
        featureConnects.push({ feature: { connect: { featureId: feature.featureId } } });
      } else {
        console.warn(`⚠️ Feature ${f.engName} not found for choice option ${optionNameEng}`);
      }
    }

    return await prisma.choiceOption.create({
      data: {
        groupName,
        optionName,
        optionNameEng,
        effectKind: (effect?.kind ?? null) as any,
        effectAbility: (effect?.ability ?? null) as any,
        effectSkill: (effect?.skill ?? null) as any,
        effectAmount: effect?.amount ?? null,
        features: {
          create: featureConnects
        }
      }
    });
  };

  /**
   * Helper to link Feat and ChoiceOption (prevents duplicates)
   */
  const linkFeatChoice = async (featId: number, choiceOptionId: number) => {
    const existing = await prisma.featChoiceOption.findUnique({
      where: {
        unique_feat_choice: {
          featId,
          choiceOptionId
        }
      }
    });

    if (!existing) {
      await prisma.featChoiceOption.create({
        data: {
          featId,
          choiceOptionId
        }
      });
    }
  };

  // ========================================================================
  // SKILLED (Умілець)
  // Gain proficiency in any combination of 3 skills or tools
  // ========================================================================
  const skilled = await findFeat(Feats.SKILLED);
  if (skilled) {
    for (const skill of Object.values(Skills)) {
      const skillTranslation = engEnumSkills.find(s => s.eng === skill)?.ukr || skill;
      
      const option = await createChoiceOption(
        "Skilled (навички)",
        skillTranslation,
        skill, // Just the enum value like "ATHLETICS"
        []
      );
      await linkFeatChoice(skilled.featId, option.choiceOptionId);
    }
    console.log(`✅ Skilled: ${Object.values(Skills).length} skill choices`);
  }

  // ========================================================================
  // MARTIAL ADEPT (Військовий адепт)
  // Choose two maneuvers from the Battle Master archetype
  // REUSES existing Battle Master maneuvers from subclassChoiceOptionSeed
  // ========================================================================
  const martialAdept = await findFeat(Feats.MARTIAL_ADEPT);
  if (martialAdept) {
    // Cleanup legacy/incorrect links that created duplicate maneuver groups in UI.
    // We only want to reuse canonical Battle Master maneuvers ("...(Maneuver)")
    // from the shared group.
    await prisma.featChoiceOption.deleteMany({
      where: {
        featId: martialAdept.featId,
        choiceOption: {
          OR: [
            { groupName: { not: CHOICE_GROUPS.BATTLE_MASTER_MANEUVERS } },
            { optionNameEng: { not: { contains: "(Maneuver)" } } },
          ],
        },
      },
    });

    const maneuverOptions = await prisma.choiceOption.findMany({
      where: {
        groupName: CHOICE_GROUPS.BATTLE_MASTER_MANEUVERS,
        optionNameEng: {
          contains: "(Maneuver)" // All Battle Master maneuvers have this suffix
        }
      }
    });

    if (maneuverOptions.length === 0) {
      console.warn("⚠️ Martial Adept: No Battle Master maneuvers found! Run subclassChoiceOptionSeed first.");
    } else {
      for (const opt of maneuverOptions) {
        await linkFeatChoice(martialAdept.featId, opt.choiceOptionId);
      }
      console.log(`✅ Martial Adept: Linked ${maneuverOptions.length} maneuvers`);
    }
  }

  // ========================================================================
  // ELDRITCH ADEPT (Потойбічний адепт)
  // Choose one Warlock invocation (from existing choice options)
  // ========================================================================
  const eldritchAdept = await findFeat(Feats.ELDRITCH_ADEPT);
  if (eldritchAdept) {
    const invocationGroupName = "Потойбічні виклики";
    const invocationOptions = await prisma.choiceOption.findMany({
      where: { groupName: { startsWith: invocationGroupName } },
    });

    if (invocationOptions.length === 0) {
      console.warn("⚠️ Eldritch Adept: No invocations found! Run choiceOptionSeed/classChoiceOptionSeed first.");
    } else {
      for (const opt of invocationOptions) {
        await linkFeatChoice(eldritchAdept.featId, opt.choiceOptionId);
      }
      console.log(`✅ Eldritch Adept: Linked ${invocationOptions.length} invocations`);
    }
  }

  // ========================================================================
  // FIGHTING INITIATE (Посвячений у бій)
  // Choose one Fighting Style (reuses existing ChoiceOptions: group "Бойовий стиль")
  // ========================================================================
  const fightingInitiate = await findFeat(Feats.FIGHTING_INITIATE);
  if (fightingInitiate) {
    const fightingStyleGroupName = "Бойовий стиль";
    const fightingStyleOptions = await prisma.choiceOption.findMany({
      where: { groupName: fightingStyleGroupName },
    });

    if (fightingStyleOptions.length === 0) {
      console.warn("⚠️ Fighting Initiate: No fighting styles found! Run choiceOptionSeed first.");
    } else {
      for (const opt of fightingStyleOptions) {
        await linkFeatChoice(fightingInitiate.featId, opt.choiceOptionId);
      }
      console.log(`✅ Fighting Initiate: Linked ${fightingStyleOptions.length} fighting styles`);
    }
  }

  // ========================================================================
  // SKILL EXPERT (Майстер навичок)
  // 1. Increase one ability score by 1
  // 2. Gain proficiency in one skill
  // 3. Gain expertise in one skill
  // ========================================================================
  const skillExpert = await findFeat(Feats.SKILL_EXPERT);
  if (skillExpert) {
    // 1. Ability Score
    for (const ability of Object.values(Ability)) {
      const ukrainianName = attributesUkrFull[ability];
      
      const option = await createChoiceOption(
        "Характеристика для Експерта у навичках",
        ukrainianName,
        `Skill Expert (${ability})`,
        [],
        { kind: "ASI", ability, amount: 1 }
      );
      await linkFeatChoice(skillExpert.featId, option.choiceOptionId);
    }

    // 2. Skill Proficiency
    for (const skill of Object.values(Skills)) {
      const skillTranslation = engEnumSkills.find(s => s.eng === skill)?.ukr || skill;
      
      const option = await createChoiceOption(
        "Навичка Майстра навичок",
        skillTranslation,
        `Skill Expert Proficiency (${skill})`,
        [],
        { kind: "SKILL_PROFICIENCY", skill, amount: 1 }
      );
      await linkFeatChoice(skillExpert.featId, option.choiceOptionId);
    }

    // 3. Expertise
    for (const skill of Object.values(Skills)) {
      const skillTranslation = engEnumSkills.find(s => s.eng === skill)?.ukr || skill;
      
      const option = await createChoiceOption(
        "Експертиза Майстра навичок",
        skillTranslation,
        `Skill Expert Expertise (${skill})`,
        [],
        { kind: "SKILL_EXPERTISE", skill, amount: 1 }
      );
      await linkFeatChoice(skillExpert.featId, option.choiceOptionId);
    }
    
    console.log(`✅ Skill Expert: ${Object.values(Ability).length} abilities, ${Object.values(Skills).length * 2} skill options`);
  }

  for (const option of buildFeatChoiceOptions2014()) {
    const feat = await findFeat(option.feat);
    if (!feat) continue;
    const effect = option.effectKind
      ? { kind: option.effectKind, ability: option.effectAbility ?? undefined, skill: option.effectSkill ?? undefined, amount: option.effectAmount ?? undefined }
      : undefined;
    const created = await createChoiceOption(option.groupName, option.optionName, option.optionNameEng, [], effect);
    await linkFeatChoice(feat.featId, created.choiceOptionId);
  }
  console.log(`✅ Стійкий, Адепт стихій, Вундеркінд і половинні риси: ${buildFeatChoiceOptions2014().length} опцій`);

  console.log('✅ Опції вибору для рис додано!');
};

import { PrismaClient, Feats, Ability, Skills, DamageType, Classes, Prisma } from "@prisma/client";
import { 
  damageTypeTranslations, 
  engEnumSkills, 
  attributesUkrFull,
  featTranslations,
  classTranslations
} from "../../src/lib/refs/translation";
import { translateValue } from "../../src/lib/components/characterCreator/infoUtils";
import { CHOICE_GROUPS } from "./helpers/groupNames";

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
    const feat = await prisma.feat.findUnique({ where: { name } });
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
  // RESILIENT (Стійкий)
  // Choose one ability score to increase by 1, and gain proficiency in saving throws
  // ========================================================================
  const resilient = await findFeat(Feats.RESILIENT);
  if (resilient) {
    for (const ability of Object.values(Ability)) {
      const ukrainianName = attributesUkrFull[ability];
      
      const option = await createChoiceOption(
        "Resilient (здібність)",
        ukrainianName,
        `Resilient (${ability})`,
        [],
        { kind: "ASI", ability, amount: 1 }
      );
      await linkFeatChoice(resilient.featId, option.choiceOptionId);
    }
    console.log(`✅ Resilient: ${Object.values(Ability).length} ability choices`);
  }

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
  // MAGIC INITIATE (Посвячений у магію)
  // Choose a class: Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard
  // ========================================================================
  const magicInitiate = await findFeat(Feats.MAGIC_INITIATE);
  if (magicInitiate) {
    const casterClasses = [
      Classes.BARD_2014,
      Classes.CLERIC_2014,
      Classes.DRUID_2014,
      Classes.SORCERER_2014,
      Classes.WARLOCK_2014,
      Classes.WIZARD_2014,
    ];
    
    for (const cls of casterClasses) {
      const classNameUkr = classTranslations[cls];
      
      const option = await createChoiceOption(
        "Magic Initiate (клас)",
        classNameUkr,
        `Magic Initiate (${cls})`,
        []
      );
      await linkFeatChoice(magicInitiate.featId, option.choiceOptionId);
    }
    console.log(`✅ Magic Initiate: ${casterClasses.length} class choices`);
  }

  // ========================================================================
  // ELEMENTAL ADEPT (Адепт стихій)
  // Choose one damage type: acid, cold, fire, lightning, or thunder
  // ========================================================================
  const elementalAdept = await findFeat(Feats.ELEMENTAL_ADEPT);
  if (elementalAdept) {
    const elementalTypes = [
      DamageType.ACID,
      DamageType.COLD,
      DamageType.FIRE,
      DamageType.LIGHTNING,
      DamageType.THUNDER,
    ];

    for (const dmgType of elementalTypes) {
      const ukrainianName = damageTypeTranslations[dmgType];
      
      const option = await createChoiceOption(
        "Elemental Adept (тип пошкодження)",
        ukrainianName,
        `Elemental Adept (${dmgType})`, // e.g., "Elemental Adept (FIRE)"
        []
      );
      
      await linkFeatChoice(elementalAdept.featId, option.choiceOptionId);
    }
    console.log(`✅ Elemental Adept: ${elementalTypes.length} damage type choices`);
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

  // ========================================================================
  // PRODIGY (Вундеркінд)
  // 1. Gain proficiency in one skill
  // 2. Gain expertise in one skill
  // 3. Gain proficiency in one tool
  // 4. Learn one language
  // ========================================================================
  const prodigy = await findFeat(Feats.PRODIGY);
  if (prodigy) {
    // 1. Skill Proficiency
    for (const skill of Object.values(Skills)) {
      const skillTranslation = translateValue(skill);
      
      const option = await createChoiceOption(
        "Навичка Вундеркінда",
        skillTranslation,
        `Prodigy Proficiency (${skill})`,
        []
      );
      await linkFeatChoice(prodigy.featId, option.choiceOptionId);
    }

    // 2. Expertise
    for (const skill of Object.values(Skills)) {
      const skillTranslation = translateValue(skill);
      
      const option = await createChoiceOption(
        "Експертиза Вундеркінда",
        skillTranslation,
        `Prodigy Expertise (${skill})`,
        []
      );
      await linkFeatChoice(prodigy.featId, option.choiceOptionId);
    }
    
    // Tools and Languages are handled differently in the schema usually, 
    // but here we might need to add them if they are choice-based.
    // For now, focusing on Skill/Expertise which was the reported issue.

    console.log(`✅ Prodigy: ${Object.values(Skills).length * 2} skill/expertise options`);
  }

  // ========================================================================
  // HALF-FEATS (ASI Choices)
  // Many feats allow choosing between 2 or more ability scores to increase
  // ========================================================================
  const halfFeatConfigs: { feat: Feats, abilities: Ability[] }[] = [
    { feat: Feats.ATHLETE, abilities: [Ability.STR, Ability.DEX] },
    { feat: Feats.LIGHTLY_ARMORED, abilities: [Ability.STR, Ability.DEX] },
    { feat: Feats.MODERATELY_ARMORED, abilities: [Ability.STR, Ability.DEX] },
    { feat: Feats.OBSERVANT, abilities: [Ability.INT, Ability.WIS] },
    { feat: Feats.TAVERN_BRAWLER, abilities: [Ability.STR, Ability.CON] },
    { feat: Feats.WEAPON_MASTER, abilities: [Ability.STR, Ability.DEX] },
    { feat: Feats.DRAGON_FEAR, abilities: [Ability.STR, Ability.CON, Ability.CHA] },
    { feat: Feats.DRAGON_HIDE, abilities: [Ability.STR, Ability.CON, Ability.CHA] },
    { feat: Feats.ELVEN_ACCURACY, abilities: [Ability.DEX, Ability.INT, Ability.WIS, Ability.CHA] },
    { feat: Feats.FADE_AWAY, abilities: [Ability.DEX, Ability.INT] },
    { feat: Feats.FLAMES_OF_PHLEGETHOS, abilities: [Ability.INT, Ability.CHA] },
    { feat: Feats.ORCISH_FURY, abilities: [Ability.STR, Ability.CON] },
    { feat: Feats.SECOND_CHANCE, abilities: [Ability.DEX, Ability.CON, Ability.CHA] },
    { feat: Feats.SQUAT_NIMBLENESS, abilities: [Ability.STR, Ability.DEX] },
    { feat: Feats.CHEF, abilities: [Ability.CON, Ability.WIS] },
    { feat: Feats.CRUSHER, abilities: [Ability.STR, Ability.CON] },
    { feat: Feats.PIERCER, abilities: [Ability.STR, Ability.DEX] },
    { feat: Feats.SLASHER, abilities: [Ability.STR, Ability.DEX] },
    { feat: Feats.TELEKINETIC, abilities: [Ability.INT, Ability.WIS, Ability.CHA] },
    { feat: Feats.TELEPATHIC, abilities: [Ability.INT, Ability.WIS, Ability.CHA] },
    { feat: Feats.GIFT_OF_THE_GEM_DRAGON, abilities: [Ability.INT, Ability.WIS, Ability.CHA] },
    { feat: Feats.EMBER_OF_GIANTS, abilities: [Ability.STR, Ability.CON, Ability.WIS] },
    { feat: Feats.FURY_OF_GIANTS, abilities: [Ability.STR, Ability.CON, Ability.WIS] },
    { feat: Feats.GUILE_OF_GIANTS, abilities: [Ability.STR, Ability.CON, Ability.WIS] },
    { feat: Feats.KEENNESS_OF_GIANTS, abilities: [Ability.STR, Ability.CON, Ability.WIS] },
    { feat: Feats.SOUL_OF_GIANTS, abilities: [Ability.STR, Ability.CON, Ability.WIS] },
    { feat: Feats.VIGOR_OF_GIANTS, abilities: [Ability.STR, Ability.CON, Ability.WIS] },
    { feat: Feats.FEY_TOUCHED, abilities: [Ability.INT, Ability.WIS, Ability.CHA] },
    { feat: Feats.SHADOW_TOUCHED, abilities: [Ability.INT, Ability.WIS, Ability.CHA] },
  ];

  let halfFeatCount = 0;
  for (const config of halfFeatConfigs) {
    const feat = await findFeat(config.feat);
    if (!feat) continue;
    
    const featNameUkr = featTranslations[config.feat] || config.feat;
    
    for (const ability of config.abilities) {
      const abilityNameUkr = attributesUkrFull[ability];
      
      const option = await createChoiceOption(
        `${featNameUkr} (здібність)`,
        abilityNameUkr,
        `${config.feat} (${ability})`,
        []
      );
      await linkFeatChoice(feat.featId, option.choiceOptionId);
    }
    halfFeatCount++;
  }
  console.log(`✅ Half-feats: ${halfFeatCount} feats with ability choices`);

  // ========================================================================
  // RITUAL CASTER (Ритуальний заклинатель)
  // Choose a class: Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard
  // ========================================================================
  const ritualCaster = await findFeat(Feats.RITUAL_CASTER);
  if (ritualCaster) {
    const casterClasses = [
      Classes.BARD_2014,
      Classes.CLERIC_2014,
      Classes.DRUID_2014,
      Classes.SORCERER_2014,
      Classes.WARLOCK_2014,
      Classes.WIZARD_2014,
    ];
    
    for (const cls of casterClasses) {
      const classNameUkr = classTranslations[cls];
      
      const option = await createChoiceOption(
        "Ritual Caster (клас)",
        classNameUkr,
        `Ritual Caster (${cls})`,
        []
      );
      await linkFeatChoice(ritualCaster.featId, option.choiceOptionId);
    }
    console.log(`✅ Ritual Caster: ${casterClasses.length} class choices`);
  }

  console.log('✅ Опції вибору для рис додано!');
};

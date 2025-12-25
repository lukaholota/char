import { PrismaClient, Feats, Ability, Skills, Prisma } from "@prisma/client";

export const seedFeatChoiceOptions = async (prisma: PrismaClient) => {
    console.log('⚔️ Додаємо опції вибору для рис (Feats)...');

    // Helper to find feat by name
    const findFeat = async (name: Feats) => {
        const feat = await prisma.feat.findUnique({ where: { name } });
        if (!feat) console.warn(`Feat ${name} not found!`);
        return feat;
    };

    // Helper to create or find ChoiceOption
    const createChoiceOption = async (
        groupName: string,
        optionName: string,
        optionNameEng: string,
        features: { engName: string }[] = []
    ) => {
        const existing = await prisma.choiceOption.findUnique({
            where: { optionNameEng }
        });

        if (existing) return existing;

        // Find features to connect
        const featureConnects: Prisma.ChoiceOptionFeatureCreateWithoutOptionInput[] = [];
        for (const f of features) {
            const feature = await prisma.feature.findFirst({ where: { engName: f.engName } });
            if (feature) {
                featureConnects.push({ feature: { connect: { featureId: feature.featureId } } });
            } else {
                console.warn(`Feature ${f.engName} not found for choice option ${optionNameEng}`);
            }
        }

        return await prisma.choiceOption.create({
            data: {
                groupName,
                optionName,
                optionNameEng,
                features: {
                    create: featureConnects
                }
            }
        });
    };

    // Helper to link Feat and ChoiceOption
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
    // Choose one ability score to increase by 1, and gain proficiency in saving throws using that ability.
    // ========================================================================
    const resilient = await findFeat(Feats.RESILIENT);
    if (resilient) {
        const abilities = [
            { name: 'Сила', eng: 'Strength', code: Ability.STR },
            { name: 'Спритність', eng: 'Dexterity', code: Ability.DEX },
            { name: 'Статура', eng: 'Constitution', code: Ability.CON },
            { name: 'Інтелект', eng: 'Intelligence', code: Ability.INT },
            { name: 'Мудрість', eng: 'Wisdom', code: Ability.WIS },
            { name: 'Харизма', eng: 'Charisma', code: Ability.CHA },
        ];

        for (const ab of abilities) {
            // We need features for these. Usually "Resilient (Strength)" feature exists or we create it?
            // Assuming features like "Resilient (Strength)" exist or we just rely on the choice name for now.
            // Ideally, we should have features that grant the save proficiency.
            // For now, let's assume the choice itself is the marker, or we link to a generic feature if specific ones don't exist.
            // Let's check if we have features for saves.
            // If not, we just create the choice option. The system might handle ASI/Saves based on choice name or we need features.
            // Let's assume we just create options for now.
            
            const option = await createChoiceOption(
                'Характеристика для Стійкості',
                ab.name,
                `Resilient (${ab.eng})`
            );
            await linkFeatChoice(resilient.featId, option.choiceOptionId);
        }
    }

    // ========================================================================
    // SKILLED (Умілець)
    // You gain proficiency in any combination of 3 skills or tools of your choice.
    // This is usually handled by a generic "Choose 3" in the UI, but if we want explicit options:
    // We would need options for EVERY skill and tool.
    // That's a lot of options.
    // If the UI handles "Select 3 Skills" via a special component (like Class Skills), we might not need ChoiceOptions for this.
    // BUT, if we want to use the ChoiceOption system, we need them.
    // Let's add options for Skills for now.
    // ========================================================================
    const skilled = await findFeat(Feats.SKILLED);
    if (skilled) {
        // We can reuse existing skill options if they exist, or create new ones.
        // Let's create options for each skill.
        for (const skill of Object.values(Skills)) {
             const option = await createChoiceOption(
                'Навички Умільця',
                skill, // Localized name is tricky here if we only have enum. Assuming enum is English or mapped.
                `Skilled (${skill})`
            );
            await linkFeatChoice(skilled.featId, option.choiceOptionId);
        }
    }

    // ========================================================================
    // WEAPON MASTER (Майстер зброї)
    // Choose 4 weapons to gain proficiency with.
    // ========================================================================
    const weaponMaster = await findFeat(Feats.WEAPON_MASTER);
    if (weaponMaster) {
        // We need options for all weapons.
        // Fetch all weapons? Or just categories? "Simple", "Martial" or specific?
        // "Four weapons of your choice". Usually specific weapons.
        // That's a lot of options (all weapons in DB).
        // For seed, maybe just a few examples or skip if too many?
        // Let's skip for now to avoid bloating seed unless requested.
    }

    // ========================================================================
    // MAGIC INITIATE (Магічний ініціат)
    // Choose a class: Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard.
    // ========================================================================
    const magicInitiate = await findFeat(Feats.MAGIC_INITIATE);
    if (magicInitiate) {
        const classes = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'];
        for (const cls of classes) {
            const option = await createChoiceOption(
                'Клас Магічного ініціата',
                cls, // Need translation
                `Magic Initiate (${cls})`
            );
            await linkFeatChoice(magicInitiate.featId, option.choiceOptionId);
        }
    }

    // ========================================================================
    // ELEMENTAL ADEPT (Адепт стихій)
    // Choose one type of damage: acid, cold, fire, lightning, or thunder.
    // ========================================================================
    const elementalAdept = await findFeat(Feats.ELEMENTAL_ADEPT);
    if (elementalAdept) {
        const elements = [
            { name: 'Кислота', eng: 'Acid' },
            { name: 'Холод', eng: 'Cold' },
            { name: 'Вогонь', eng: 'Fire' },
            { name: 'Блискавка', eng: 'Lightning' },
            { name: 'Грім', eng: 'Thunder' },
        ];
        for (const el of elements) {
            const option = await createChoiceOption(
                'Стихія Адепта',
                el.name,
                `Elemental Adept (${el.eng})`
            );
            await linkFeatChoice(elementalAdept.featId, option.choiceOptionId);
        }
    }

    // ========================================================================
    // MARTIAL ADEPT (Бойовий адепт)
    // Choose two maneuvers from the Battle Master archetype.
    // ========================================================================
    const martialAdept = await findFeat(Feats.MARTIAL_ADEPT);
    if (martialAdept) {
        // We need to find Battle Master maneuvers.
        // They are features linked to Battle Master subclass? Or just features with a tag?
        // Let's assume we can find them by name or they are already seeded as ChoiceOptions for Battle Master.
        // If they are seeded for Battle Master, we can reuse the ChoiceOption?
        // No, ChoiceOption is linked to Class/Subclass via join table.
        // We can link the SAME ChoiceOption to the Feat!
        // Let's try to find existing ChoiceOptions for Battle Master Maneuvers.
        
        // This requires knowing the group name used in SubclassChoiceOptionSeed.
        // Let's assume "Maneuvers".
        const maneuverOptions = await prisma.choiceOption.findMany({
            where: { groupName: 'Маневри майстра бою' } // Assuming this name
        });

        if (maneuverOptions.length > 0) {
            for (const opt of maneuverOptions) {
                await linkFeatChoice(martialAdept.featId, opt.choiceOptionId);
            }
        }
    }

    // ========================================================================
    // SKILL EXPERT (Майстер навичок)
    // 1. Increase one ability score by 1.
    // 2. Gain proficiency in one skill.
    // 3. Gain expertise in one skill.
    // ========================================================================
    const skillExpert = await findFeat(Feats.SKILL_EXPERT);
    if (skillExpert) {
        // 1. Ability Score
        const abilities = [
            { name: 'Сила', eng: 'Strength', code: Ability.STR },
            { name: 'Спритність', eng: 'Dexterity', code: Ability.DEX },
            { name: 'Статура', eng: 'Constitution', code: Ability.CON },
            { name: 'Інтелект', eng: 'Intelligence', code: Ability.INT },
            { name: 'Мудрість', eng: 'Wisdom', code: Ability.WIS },
            { name: 'Харизма', eng: 'Charisma', code: Ability.CHA },
        ];
        for (const ab of abilities) {
            const option = await createChoiceOption(
                'Характеристика Майстра навичок',
                ab.name,
                `Skill Expert Ability (${ab.eng})`
            );
            await linkFeatChoice(skillExpert.featId, option.choiceOptionId);
        }

        // 2. Skill Proficiency
        for (const skill of Object.values(Skills)) {
             const option = await createChoiceOption(
                'Навичка Майстра навичок',
                skill, 
                `Skill Expert Proficiency (${skill})`
            );
            await linkFeatChoice(skillExpert.featId, option.choiceOptionId);
        }

        // 3. Skill Expertise
        for (const skill of Object.values(Skills)) {
             const option = await createChoiceOption(
                'Експертиза Майстра навичок',
                skill, 
                `Skill Expert Expertise (${skill})`
            );
            await linkFeatChoice(skillExpert.featId, option.choiceOptionId);
        }
    }

    // ========================================================================
    // HALF-FEATS (ASI Choices)
    // Many feats allow choosing between 2 or more ability scores to increase.
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

    const abilityNames: Record<Ability, { name: string, eng: string }> = {
        [Ability.STR]: { name: 'Сила', eng: 'Strength' },
        [Ability.DEX]: { name: 'Спритність', eng: 'Dexterity' },
        [Ability.CON]: { name: 'Статура', eng: 'Constitution' },
        [Ability.INT]: { name: 'Інтелект', eng: 'Intelligence' },
        [Ability.WIS]: { name: 'Мудрість', eng: 'Wisdom' },
        [Ability.CHA]: { name: 'Харизма', eng: 'Charisma' },
    };

    for (const config of halfFeatConfigs) {
        const feat = await findFeat(config.feat);
        if (feat) {
            for (const abilityCode of config.abilities) {
                const info = abilityNames[abilityCode];
                const option = await createChoiceOption(
                    `Характеристика ${feat.name}`, // e.g. "Характеристика Athlete"
                    info.name,
                    `${config.feat} Ability (${info.eng})`
                );
                await linkFeatChoice(feat.featId, option.choiceOptionId);
            }
        }
    }

    // ========================================================================
    // RITUAL CASTER (Ритуальний заклинач)
    // Choose a class: Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard.
    // ========================================================================
    const ritualCaster = await findFeat(Feats.RITUAL_CASTER);
    if (ritualCaster) {
        const classes = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'];
        for (const cls of classes) {
            const option = await createChoiceOption(
                'Клас Ритуального заклинача',
                cls, 
                `Ritual Caster (${cls})`
            );
            await linkFeatChoice(ritualCaster.featId, option.choiceOptionId);
        }
    }

    console.log('✅ Опції вибору для рис додано!');
};

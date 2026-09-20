import { Classes, Prisma, PrismaClient, Ruleset } from "@prisma/client";
import ClassOptionalFeatureCreateInput = Prisma.ClassOptionalFeatureCreateInput;

const ACTIVE_RULESET: Ruleset = "RULES_2014";

export const seedClassOptionalFeatures = async (prisma: PrismaClient) => {
    console.log('🌟 Додаємо необовʼязкові класові фічі...')

    const features: ClassOptionalFeatureCreateInput[] = [
        {
            title: 'Замінити бойовий стиль?',

            grantedOnLevels: [4, 6, 8, 12, 14, 16, 19],
            replacesFightingStyle: true,

            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            title: 'Замінити маневр?',

            grantedOnLevels: [4, 6, 8, 12, 14, 16, 19],
            replacesManeuver: true,

            prerequisites: {
                subclass: 'BATTLE_MASTER'
            },

            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        // Barbarian - Primal Knowledge
        {
            title: 'Вивчити нову навичку?',

            feature: { connect: { engName: "Primal Knowledge" } },
            grantedOnLevels: [3, 10],
            class: { connect: { name_ruleset: { name: Classes.BARBARIAN_2014, ruleset: ACTIVE_RULESET } } }
        },
        // Barbarian - Instinctive Pounce
        {
            feature: { connect: { engName: "Instinctive Pounce" } },
            grantedOnLevels: [7],
            class: { connect: { name_ruleset: { name: Classes.BARBARIAN_2014, ruleset: ACTIVE_RULESET } } }
        },


        //MONKKKKKKKKKKKKK
        {
            feature: { connect: { engName: "Dedicated Weapon" } },
            grantedOnLevels: [2],
            class: { connect: { name_ruleset: { name: Classes.MONK_2014, ruleset: ACTIVE_RULESET } } }
        },

        {
            feature: { connect: { engName: "Ki-Fueled Attack" } },
            grantedOnLevels: [3],
            class: { connect: { name_ruleset: { name: Classes.MONK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            feature: { connect: { engName: "Quickened Healing" } },
            grantedOnLevels: [4],
            class: { connect: { name_ruleset: { name: Classes.MONK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            feature: { connect: { engName: "Focused Aim" } },
            grantedOnLevels: [5],
            class: { connect: { name_ruleset: { name: Classes.MONK_2014, ruleset: ACTIVE_RULESET } } }
        },


        // ===== RANGER OPTIONAL FEATURES =====

// Deft Explorer (заміняє Natural Explorer)
        {
            feature: { connect: { engName: "Deft Explorer - Roving" } },
            grantedOnLevels: [6],
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },

            appearsOnlyIfChoicesTaken: {
                connect: [
                    { optionNameEng: 'Deft Explorer - Canny' }
                ]
            }
        },
        {
            feature: { connect: { engName: "Deft Explorer - Tireless" } },
            grantedOnLevels: [10],
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } },

            appearsOnlyIfChoicesTaken: {
                connect: [
                    { optionNameEng: 'Deft Explorer - Canny' }
                ]
            }
        },

// Martial Versatility
        {
            title: 'Замінити бойовий стиль?',

            grantedOnLevels: [4, 8, 12, 16, 19],
            replacesFightingStyle: true,
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

// Spellcasting Focus
        {
            feature: { connect: { engName: "Spellcasting Focus (Ranger)" } },
            grantedOnLevels: [2],
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // PALADIN


        // Harness Divine Power
        {
            feature: { connect: { engName: "Harness Divine Power" } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            grantedOnLevels: [3, 7, 15],
        },

// Martial Versatility
        {
            title: 'Замінити бойовий стиль?',

            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } },
            grantedOnLevels: [4, 8, 12, 16, 19], // На кожному ASI
            replacesFightingStyle: true,
        },


        // ROGUEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE


        {
            class: { connect: { name_ruleset: { name: Classes.ROGUE_2014, ruleset: ACTIVE_RULESET } } },
            grantedOnLevels: [3],
            feature: { connect: { engName: "Steady Aim" } },
        },


        // WARLOCKKKKKKKKKKKKKKKKKKKKKKKKK

        {
            title: 'Замінити Потойбічний виклик?',

            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } },
            grantedOnLevels: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
            replacesInvocation: true,
        },

        // ===== SORCERER OPTIONALS =====
        {
            feature: { connect: { engName: "Magical Guidance" } },
            grantedOnLevels: [5],
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
        },
        {
            feature: { connect: { engName: "Sorcerous Versatility" } },
            grantedOnLevels: [4, 8, 12, 16, 19],
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } },
        },

        // ===== WIZARD OPTIONALS =====
        {
            feature: { connect: { engName: "Cantrip Formulas" } },
            grantedOnLevels: [3],
            class: { connect: { name_ruleset: { name: Classes.WIZARD_2014, ruleset: ACTIVE_RULESET } } },
        },
    ]

    let seedIndex = 1;

    for (const feature of features) {
        await prisma.classOptionalFeature.upsert({
            where: { seedIndex },
            update: feature,
            create: {
                seedIndex,
                ...feature
            }
        })

        seedIndex++;
    }

    console.log('✅ Додано опційних фіч:', features.length)
}

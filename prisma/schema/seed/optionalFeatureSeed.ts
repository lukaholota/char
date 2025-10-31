import { Classes, Prisma, PrismaClient } from "../../src/generated/prisma";
import ClassOptionalFeatureCreateInput = Prisma.ClassOptionalFeatureCreateInput;

export const seedClassOptionalFeatures = async (prisma: PrismaClient) => {
    console.log('🌟 Додаємо необов\'язкові класові фічі...')

    const features: ClassOptionalFeatureCreateInput[] = [
        {
            title: 'Замінити бойовий стиль?',

            grantedOnLevels: [4, 6, 8, 12, 14, 16, 19],
            replacesFightingStyle: true,

            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            title: 'Замінити маневр?',

            grantedOnLevels: [4, 6, 8, 12, 14, 16, 19],
            replacesManeuver: true,

            prerequisites: {
                subclass: 'BATTLE_MASTER'
            },

            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        // Barbarian - Primal Knowledge
        {
            title: 'Вивчити нову навичку?',

            feature: { connect: { engName: "Primal Knowledge" } },
            grantedOnLevels: [3, 10],
            class: { connect: { name: Classes.BARBARIAN_2014 } }
        },
        // Barbarian - Instinctive Pounce
        {
            feature: { connect: { engName: "Instinctive Pounce" } },
            grantedOnLevels: [7],
            class: { connect: { name: Classes.BARBARIAN_2014 } }
        },


        //MONKKKKKKKKKKKKK
        {
            feature: { connect: { engName: "Dedicated Weapon" } },
            grantedOnLevels: [2],
            class: { connect: { name: Classes.MONK_2014 } }
        },

        {
            feature: { connect: { engName: "Ki-Fueled Attack" } },
            grantedOnLevels: [3],
            class: { connect: { name: Classes.MONK_2014 } }
        },
        {
            feature: { connect: { engName: "Quickened Healing" } },
            grantedOnLevels: [4],
            class: { connect: { name: Classes.MONK_2014 } }
        },
        {
            feature: { connect: { engName: "Focused Aim" } },
            grantedOnLevels: [5],
            class: { connect: { name: Classes.MONK_2014 } }
        },


        // ===== RANGER OPTIONAL FEATURES =====

// Deft Explorer (заміняє Natural Explorer)
        {
            feature: { connect: { engName: "Deft Explorer - Roving" } },
            grantedOnLevels: [6],
            class: { connect: { name: Classes.RANGER_2014 } },

            appearsOnlyIfChoicesTaken: {
                connect: [
                    { optionNameEng: 'Deft Explorer - Canny' }
                ]
            }
        },
        {
            feature: { connect: { engName: "Deft Explorer - Tireless" } },
            grantedOnLevels: [10],
            class: { connect: { name: Classes.RANGER_2014 } },

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
            class: { connect: { name: Classes.RANGER_2014 } }
        },

// Spellcasting Focus
        {
            feature: { connect: { engName: "Spellcasting Focus (Ranger)" } },
            grantedOnLevels: [2],
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        // PALADIN


        // Harness Divine Power
        {
            feature: { connect: { engName: "Harness Divine Power" } },
            class: { connect: { name: Classes.PALADIN_2014 } },
            grantedOnLevels: [3, 7, 15],
        },

// Martial Versatility
        {
            title: 'Замінити бойовий стиль?',

            class: { connect: { name: Classes.PALADIN_2014 } },
            grantedOnLevels: [4, 8, 12, 16, 19], // На кожному ASI
            replacesFightingStyle: true,
        },


        // ROGUEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE


        {
            class: { connect: { name: Classes.ROGUE_2014 } },
            grantedOnLevels: [3],
            feature: { connect: { engName: "Steady Aim" } },
        },


        // WARLOCKKKKKKKKKKKKKKKKKKKKKKKKK

        {
            title: 'Замінити Потойбічний виклик?',

            class: { connect: { name: Classes.WARLOCK_2014 } },
            grantedOnLevels: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
            replacesInvocation: true,
        },
    ]
}
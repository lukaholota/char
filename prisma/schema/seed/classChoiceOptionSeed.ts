import { Classes, Prisma, PrismaClient } from '../../src/generated/prisma'

export const seedClassChoiceOptions = async (prisma: PrismaClient) => {
    console.log('🎯 Додаємо зв\'язки класів з опціями вибору...')

    const options: Prisma.ClassChoiceOptionCreateInput[] = [
        // === СТРІЛЬБА З ЛУКА ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Archery' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Archery' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        // === БІЙ НАОСЛІП ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Blind Fighting' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Blind Fighting' } },
            class: { connect: { name: Classes.PALADIN_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Blind Fighting' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        // === ОБОРОНА ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Defense' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Defense' } },
            class: { connect: { name: Classes.PALADIN_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Defense' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        // === ДУЕЛЬ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Dueling' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Dueling' } },
            class: { connect: { name: Classes.PALADIN_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Dueling' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        // === БІЙ ВЕЛИКОЮ ЗБРОЄЮ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Great Weapon Fighting' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Great Weapon Fighting' } },
            class: { connect: { name: Classes.PALADIN_2014 } }
        },

        // === ПЕРЕХОПЛЕННЯ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Interception' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Interception' } },
            class: { connect: { name: Classes.PALADIN_2014 } }
        },

        // === ЗАХИСТ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Protection' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Protection' } },
            class: { connect: { name: Classes.PALADIN_2014 } }
        },

        // === ВИЩА ТЕХНІКА (тільки Fighter) ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Superior Technique' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },

        // === БІЙ МЕТАЛЬНОЮ ЗБРОЄЮ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Thrown Weapon Fighting' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Thrown Weapon Fighting' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        // === БІЙ ДВОМА ЗБРОЯМИ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Two-Weapon Fighting' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Two-Weapon Fighting' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        // === РУКОПАШНИЙ БІЙ (тільки Fighter) ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Unarmed Fighting' } },
            class: { connect: { name: Classes.FIGHTER_2014 } }
        },

        // === ДРУЇДИЧНИЙ ВОЇН (тільки Ranger) ===
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Druidic Warrior' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        // === БЛАГОСЛОВЕННИЙ ВОЇН (тільки Paladin) ===
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Blessed Warrior' } },
            class: { connect: { name: Classes.PALADIN_2014 } }
        },

        // === МІЧЕНИЙ ВОРОГ (Ranger альтернатива) ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Favored Foe' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        // === УЛЮБЛЕНИЙ ВОРОГ (Ranger базова) ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Favored Enemy' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },


        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Deft Explorer - Canny' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Natural Explorer' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },

        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Primal Awareness' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },
        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Primeval Awareness' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },


        {
            levelsGranted: [10],
            choiceOption: { connect: { optionNameEng: 'Nature\'s Veil' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },
        {
            levelsGranted: [10],
            choiceOption: { connect: { optionNameEng: 'Hide in Plain Sight' } },
            class: { connect: { name: Classes.RANGER_2014 } }
        },



        // ===== WARLOCK PACT BOONS (3 РІВЕНЬ) =====

        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Pact of the Blade' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Pact of the Chain' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Pact of the Tome' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Pact of the Talisman' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },




        // ===== WARLOCK ELDRITCH INVOCATIONS - XGE & TCE =====

// РІВЕНЬ 2 (для Пакту Книги, без рівневих вимог)
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Aspect of the Moon' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 2 (для Пакту Ланцюга, без рівневих вимог)
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Investment of the Chain Master' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 2 (для Пакту Талісмана, без рівневих вимог)
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Rebuke of the Talisman' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 5
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Cloak of Flies' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Maddening Hex' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Far Scribe' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Undying Servitude' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 7
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Ghostly Gaze' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Relentless Hex' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Protection of the Talisman' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 9
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Gift of the Protectors' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 12
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Bond of the Talisman' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

        // ===== WARLOCK ELDRITCH INVOCATIONS =====

// РІВЕНЬ 2 - всі базові виклики без prereq
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Agonizing Blast' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Armor of Shadows' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Beguiling Influence' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Beast Speech' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Devil\'s Sight' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eldritch Sight' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eldritch Mind' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eldritch Spear' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eyes of the Rune Keeper' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Fiendish Vigor' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Gaze of Two Minds' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Mask of Many Faces' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Misty Visions' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Repelling Blast' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Grasp of Hadar' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Lance of Lethargy' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 3 - додається Voice of the Chain Master (якщо взято Pact of the Chain)
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Voice of the Chain Master' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Book of Ancient Secrets' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 5
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Thirsting Blade' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Sign of Ill Omen' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Otherworldly Step' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Improved Pact Weapon' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Gift of the Depths' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Gift of the Ever-Living Ones' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eldritch Smite' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Tomb of Levistus' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 7
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Sculptor of Flesh' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'One with Shadows' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Trickster\'s Escape' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 9
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Ascendant Step' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Whispers of the Grave' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Otherworldly Leap' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Minions of Chaos' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 12
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Lifedrinker' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

// РІВЕНЬ 15
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Visions of Distant Realms' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Master of Myriad Forms' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Shrouded in Shadow' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Witch Sight' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Chains of Carceri' } },
            class: { connect: { name: Classes.WARLOCK_2014 } }
        },

    ]

    // Створюємо всі зв'язки
    for (const option of options) {
        await prisma.classChoiceOption.create({ data: option })
    }

    console.log('✅ Додано зв\'язків класів з опціями:', options.length)
}

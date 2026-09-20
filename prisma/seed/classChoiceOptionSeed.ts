import { Classes, Prisma, PrismaClient, Ruleset } from "@prisma/client";

const ACTIVE_RULESET: Ruleset = "RULES_2014";

export const seedClassChoiceOptions = async (prisma: PrismaClient) => {
    console.log('🎯 Додаємо звʼязки класів з опціями вибору...')

    const options: Prisma.ClassChoiceOptionCreateInput[] = [
        // === СТРІЛЬБА З ЛУКА ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Archery' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Archery' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === БІЙ НАОСЛІП ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Blind Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Blind Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Blind Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === ОБОРОНА ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Defense' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Defense' } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Defense' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === ДУЕЛЬ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Dueling' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Dueling' } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Dueling' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === БІЙ ВЕЛИКОЮ ЗБРОЄЮ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Great Weapon Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Great Weapon Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === ПЕРЕХОПЛЕННЯ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Interception' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Interception' } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === ЗАХИСТ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Protection' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Protection' } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === ВИЩА ТЕХНІКА (тільки Fighter) ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Superior Technique' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === БІЙ МЕТАЛЬНОЮ ЗБРОЄЮ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Thrown Weapon Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Thrown Weapon Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === БІЙ ДВОМА ЗБРОЯМИ ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Two-Weapon Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Two-Weapon Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === РУКОПАШНИЙ БІЙ (тільки Fighter) ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Unarmed Fighting' } },
            class: { connect: { name_ruleset: { name: Classes.FIGHTER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === ДРУЇДИЧНИЙ ВОЇН (тільки Ranger) ===
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Druidic Warrior' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === БЛАГОСЛОВЕННИЙ ВОЇН (тільки Paladin) ===
        {
            levelsGranted: [2],
            choiceOption: { connect: { optionNameEng: 'Blessed Warrior' } },
            class: { connect: { name_ruleset: { name: Classes.PALADIN_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === МІЧЕНИЙ ВОРОГ (Ranger альтернатива) ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Favored Foe' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        // === УЛЮБЛЕНИЙ ВОРОГ (Ranger базова) ===
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Favored Enemy' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },


        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Deft Explorer - Canny' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [1],
            choiceOption: { connect: { optionNameEng: 'Natural Explorer' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },

        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Primal Awareness' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Primeval Awareness' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },


        {
            levelsGranted: [10],
            choiceOption: { connect: { optionNameEng: 'Nature\'s Veil' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [10],
            choiceOption: { connect: { optionNameEng: 'Hide in Plain Sight' } },
            class: { connect: { name_ruleset: { name: Classes.RANGER_2014, ruleset: ACTIVE_RULESET } } }
        },



        // ===== WARLOCK PACT BOONS (3 РІВЕНЬ) =====

        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Pact of the Blade' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Pact of the Chain' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Pact of the Tome' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3],
            choiceOption: { connect: { optionNameEng: 'Pact of the Talisman' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },




        // ===== WARLOCK ELDRITCH INVOCATIONS - XGE & TCE =====

// РІВЕНЬ 2 (для Пакту Книги, без рівневих вимог)
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Aspect of the Moon' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 2 (для Пакту Ланцюга, без рівневих вимог)
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Investment of the Chain Master' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 2 (для Пакту Талісмана, без рівневих вимог)
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Rebuke of the Talisman' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 5
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Cloak of Flies' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Maddening Hex' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Far Scribe' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Undying Servitude' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 7
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Ghostly Gaze' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Relentless Hex' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Protection of the Talisman' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 9
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Gift of the Protectors' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 12
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Bond of the Talisman' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

        // ===== WARLOCK ELDRITCH INVOCATIONS =====

// РІВЕНЬ 2 - всі базові виклики без prereq
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Agonizing Blast' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Armor of Shadows' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Beguiling Influence' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Beast Speech' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Devil\'s Sight' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eldritch Sight' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eldritch Mind' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eldritch Spear' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eyes of the Rune Keeper' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Fiendish Vigor' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Gaze of Two Minds' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Mask of Many Faces' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Misty Visions' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Repelling Blast' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Grasp of Hadar' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Lance of Lethargy' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 3 - додається Voice of the Chain Master (якщо взято Pact of the Chain)
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Voice of the Chain Master' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Book of Ancient Secrets' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 5
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Thirsting Blade' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Sign of Ill Omen' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Improved Pact Weapon' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Gift of the Depths' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Gift of the Ever-Living Ones' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Eldritch Smite' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Tomb of Levistus' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 7
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Sculptor of Flesh' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'One with Shadows' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Trickster\'s Escape' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 9
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Ascendant Step' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Whispers of the Grave' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Otherworldly Leap' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Minions of Chaos' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 12
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Lifedrinker' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

// РІВЕНЬ 15
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Visions of Distant Realms' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Master of Myriad Forms' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Shrouded in Shadow' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Witch Sight' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [2, 5, 7, 9, 12, 15, 18],
            choiceOption: { connect: { optionNameEng: 'Chains of Carceri' } },
            class: { connect: { name_ruleset: { name: Classes.WARLOCK_2014, ruleset: ACTIVE_RULESET } } }
        },

        // ===== SORCERER METAMAGIC =====
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Careful Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Distant Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Empowered Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Extended Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Heightened Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Quickened Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Subtle Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Twinned Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Seeking Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },
        {
            levelsGranted: [3, 10, 17],
            choiceOption: { connect: { optionNameEng: 'Transmuted Spell' } },
            class: { connect: { name_ruleset: { name: Classes.SORCERER_2014, ruleset: ACTIVE_RULESET } } }
        },

    ];

    const classes = await prisma.class.findMany({ where: { ruleset: ACTIVE_RULESET } });
    const choiceOptions = await prisma.choiceOption.findMany();

    const classMap = Object.fromEntries(classes.map(c => [c.name, c.classId]));
    const optionMap = Object.fromEntries(choiceOptions.map(o => [o.optionNameEng, o.choiceOptionId]));

    for (const opt of options) {
        const className = opt.class?.connect?.name_ruleset?.name;
        const optionNameEng = opt.choiceOption?.connect?.optionNameEng;

        if (!className) {
            throw new Error("Seed option is missing class.connect.name");
        }
        if (!optionNameEng) {
            throw new Error("Seed option is missing choiceOption.connect.optionNameEng");
        }

        const classId = classMap[className];
        const choiceOptionId = optionMap[optionNameEng];

        if (!classId) {
            throw new Error(`Class not found for name=${className}`);
        }
        if (!choiceOptionId) {
            throw new Error(`ChoiceOption not found for optionNameEng=${optionNameEng}`);
        }

        await prisma.classChoiceOption.upsert({
            where: {
                unique_class_choice: { classId, choiceOptionId },
            },
            update: {
                levelsGranted: opt.levelsGranted,
            },
            create: {
                classId,
                choiceOptionId,
                levelsGranted: opt.levelsGranted,
            },
        });
    }

    console.log('✅ Додано звʼязків класів з опціями:', options.length)
}

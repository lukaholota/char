import { Prisma, PrismaClient } from "@prisma/client";

export const seedChoiceOptions = async (prisma: PrismaClient) => {
    console.log('⚔️ Додаємо опції вибору (Бойові стилі)...')

    const options: Prisma.ChoiceOptionCreateInput[] = [
        // === СТРІЛЬБА З ЛУКА ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Стрільба з лука',
            optionNameEng: 'Archery',

            features: {
                create: [
                    { feature: { connect: { engName: 'Archery' } } }
                ]
            },
        },

        // === БІЙ НАОСЛІП ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Бій наосліп',
            optionNameEng: 'Blind Fighting',

            features: {
                create: [
                    { feature: { connect: { engName: 'Blind Fighting' } } }
                ]
            },
        },

        // === ОБОРОНА ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Оборона',
            optionNameEng: 'Defense',

            features: {
                create: [
                    { feature: { connect: { engName: 'Defense' } } }
                ]
            },
        },

        // === ДУЕЛЬ ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Дуель',
            optionNameEng: 'Dueling',

            features: {
                create: [
                    { feature: { connect: { engName: 'Dueling' } } }
                ]
            },
        },

        // === БІЙ ВЕЛИКОЮ ЗБРОЄЮ ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Бій великою зброєю',
            optionNameEng: 'Great Weapon Fighting',

            features: {
                create: [
                    { feature: { connect: { engName: 'Great Weapon Fighting' } } }
                ]
            },
        },

        // === ПЕРЕХОПЛЕННЯ ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Перехоплення',
            optionNameEng: 'Interception',

            features: {
                create: [
                    { feature: { connect: { engName: 'Interception' } } }
                ]
            },
        },

        // === ЗАХИСТ ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Захист',
            optionNameEng: 'Protection',

            features: {
                create: [
                    { feature: { connect: { engName: 'Protection' } } }
                ]
            },
        },

        // === ВИЩА ТЕХНІКА ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Вища техніка',
            optionNameEng: 'Superior Technique',

            features: {
                create: [
                    { feature: { connect: { engName: 'Superior Technique' } } }
                ]
            },
        },

        // === БІЙ МЕТАЛЬНОЮ ЗБРОЄЮ ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Бій метальною зброєю',
            optionNameEng: 'Thrown Weapon Fighting',

            features: {
                create: [
                    { feature: { connect: { engName: 'Thrown Weapon Fighting' } } }
                ]
            },
        },

        // === БІЙ ДВОМА ЗБРОЯМИ ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Бій двома зброями',
            optionNameEng: 'Two-Weapon Fighting',

            features: {
                create: [
                    { feature: { connect: { engName: 'Two-Weapon Fighting' } } }
                ]
            },
        },

        // === РУКОПАШНИЙ БІЙ ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Рукопашний бій',
            optionNameEng: 'Unarmed Fighting',

            features: {
                create: [
                    { feature: { connect: { engName: 'Unarmed Fighting' } } }
                ]
            },
        },

        // === ДРУЇДИЧНИЙ ВОЇН ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Друїдичний воїн',
            optionNameEng: 'Druidic Warrior',

            features: {
                create: [
                    { feature: { connect: { engName: 'Druidic Warrior' } } }
                ]
            },
        },

        // === БЛАГОСЛОВЕННИЙ ВОЇН ===
        {
            groupName: 'Бойовий стиль',
            optionName: 'Благословенний воїн',
            optionNameEng: 'Blessed Warrior',

            features: {
                create: [
                    { feature: { connect: { engName: 'Blessed Warrior' } } }
                ]
            },
        },

        // === МІЧЕНИЙ ВОРОГ ===
        {
            groupName: 'Налаштування Слідопита: ворог',
            optionName: 'Регульовані улюблені вороги',
            optionNameEng: 'Favored Foe',

            features: {
                create: [
                    { feature: { connect: { engName: 'Favored Foe' } } }
                ]
            },
        },

        // === УЛЮБЛЕНИЙ ВОРОГ ===
        {
            groupName: 'Налаштування Слідопита: ворог',
            optionName: 'Статичні улюблені вороги',
            optionNameEng: 'Favored Enemy',

            features: {
                create: [
                    { feature: { connect: { engName: 'Favored Enemy' } } }
                ]
            },
        },

        // ===== METAMAGIC OPTIONS (SORCERER) =====
        {
            groupName: 'Метамагія',
            optionName: 'Обережне заклинання',
            optionNameEng: 'Careful Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Careful Spell' } } }
                ]
            },
        },
        {
            groupName: 'Метамагія',
            optionName: 'Віддалене заклинання',
            optionNameEng: 'Distant Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Distant Spell' } } }
                ]
            },
        },
        {
            groupName: 'Метамагія',
            optionName: 'Підсилене заклинання',
            optionNameEng: 'Empowered Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Empowered Spell' } } }
                ]
            },
        },
        {
            groupName: 'Метамагія',
            optionName: 'Подовжене заклинання',
            optionNameEng: 'Extended Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Extended Spell' } } }
                ]
            },
        },
        {
            groupName: 'Метамагія',
            optionName: 'Підвищене заклинання',
            optionNameEng: 'Heightened Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Heightened Spell' } } }
                ]
            },
        },
        {
            groupName: 'Метамагія',
            optionName: 'Пришвидшене заклинання',
            optionNameEng: 'Quickened Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Quickened Spell' } } }
                ]
            },
        },
        {
            groupName: 'Метамагія',
            optionName: 'Приховане заклинання',
            optionNameEng: 'Subtle Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Subtle Spell' } } }
                ]
            },
        },
        {
            groupName: 'Метамагія',
            optionName: 'Спарене заклинання',
            optionNameEng: 'Twinned Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Twinned Spell' } } }
                ]
            },
        },
        {
            groupName: 'Метамагія',
            optionName: 'Спрямоване заклинання',
            optionNameEng: 'Seeking Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Seeking Spell' } } }
                ]
            },
        },
        {
            groupName: 'Метамагія',
            optionName: 'Перетворене заклинання',
            optionNameEng: 'Transmuted Spell',
            features: {
                create: [
                    { feature: { connect: { engName: 'Transmuted Spell' } } }
                ]
            },
        },

        {
            groupName: 'Налаштування Слідопита: місцевість',
            optionName: '2 мови + експертиза',
            optionNameEng: 'Deft Explorer - Canny',

            features: {
                create: [
                    { feature: { connect: { engName: 'Deft Explorer - Canny' } } }
                ]
            },
        },
        {
            groupName: 'Налаштування Слідопита: місцевість',
            optionName: 'улюблена місцевість (не раджу)',
            optionNameEng: 'Natural Explorer',

            features: {
                create: [
                    { feature: { connect: { engName: 'Natural Explorer' } } }
                ]
            },
        },


        {
            groupName: 'Налаштування Слідопита: усвідомлення',
            optionName: 'Додаткові заклинання раз на день',
            optionNameEng: 'Primal Awareness',

            features: {
                create: [
                    { feature: { connect: { engName: 'Primal Awareness' } } }
                ]
            },
        },
        {
            groupName: 'Налаштування Слідопита: усвідомлення',
            optionName: 'Аналіз місцевості навколо',
            optionNameEng: 'Primeval Awareness',

            features: {
                create: [
                    { feature: { connect: { engName: 'Primeval Awareness' } } }
                ]
            },
        },


        {
            groupName: 'Налаштування Слідопита: ховання',
            optionName: 'Невидимість бонусною дією',
            optionNameEng: 'Nature\'s Veil',

            features: {
                create: [
                    { feature: { connect: { engName: 'Nature\'s Veil' } } }
                ]
            },
        },
        {
            groupName: 'Налаштування Слідопита: ховання',
            optionName: '+10 на непомітність у статиці після хвилини підготовки',
            optionNameEng: 'Hide in Plain Sight',

            features: {
                create: [
                    { feature: { connect: { engName: 'Hide in Plain Sight' } } }
                ]
            },
        },


        // ===== ДАРИ ПАКТУ (PACT BOONS) =====

        {
            groupName: 'Дар пакту',
            optionName: 'Клинок - для ближнього бою',
            optionNameEng: 'Pact of the Blade',

            features: {
                create: [
                    { feature: { connect: { engName: 'Pact of the Blade' } } }
                ]
            },
        },

        {
            groupName: 'Дар пакту',
            optionName: 'Ланцюг - особливий фамільяр',
            optionNameEng: 'Pact of the Chain',

            features: {
                create: [
                    { feature: { connect: { engName: 'Pact of the Chain' } } }
                ]
            },
        },

        {
            groupName: 'Дар пакту',
            optionName: 'Гримуар - 3 додаткові замовляння',
            optionNameEng: 'Pact of the Tome',

            features: {
                create: [
                    { feature: { connect: { engName: 'Pact of the Tome' } } }
                ]
            },
        },

        {
            groupName: 'Дар пакту',
            optionName: 'Талісман - +к4 до перевірок',
            optionNameEng: 'Pact of the Talisman',

            features: {
                create: [
                    { feature: { connect: { engName: 'Pact of the Talisman' } } }
                ]
            },
        },


        // ===== ELDRITCH INVOCATIONS =====

// БЕЗ ПЕРЕДУМОВ
        {
            groupName: 'Потойбічні виклики',
            optionName: '+ХАР до шкоди кожного променя',
            optionNameEng: 'Agonizing Blast',
            features: {
                create: [{ feature: { connect: { engName: 'Agonizing Blast' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Mage Armor необмежено',
            optionNameEng: 'Armor of Shadows',
            features: {
                create: [{ feature: { connect: { engName: 'Armor of Shadows' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Deception + Persuasion',
            optionNameEng: 'Beguiling Influence',
            features: {
                create: [{ feature: { connect: { engName: 'Beguiling Influence' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Speak with Animals необмежено',
            optionNameEng: 'Beast Speech',
            features: {
                create: [{ feature: { connect: { engName: 'Beast Speech' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Бачення в темряві 120 фт',
            optionNameEng: 'Devil\'s Sight',
            features: {
                create: [{ feature: { connect: { engName: 'Devil\'s Sight' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Detect Magic необмежено',
            optionNameEng: 'Eldritch Sight',
            features: {
                create: [{ feature: { connect: { engName: 'Eldritch Sight' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Перевага на концентрацію',
            optionNameEng: 'Eldritch Mind',
            features: {
                create: [{ feature: { connect: { engName: 'Eldritch Mind' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Eldritch Blast 300 футів',
            optionNameEng: 'Eldritch Spear',
            features: {
                create: [{ feature: { connect: { engName: 'Eldritch Spear' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Читання всіх мов',
            optionNameEng: 'Eyes of the Rune Keeper',
            features: {
                create: [{ feature: { connect: { engName: 'Eyes of the Rune Keeper' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'False Life необмежено',
            optionNameEng: 'Fiendish Vigor',
            features: {
                create: [{ feature: { connect: { engName: 'Fiendish Vigor' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Бачення очима союзника',
            optionNameEng: 'Gaze of Two Minds',
            features: {
                create: [{ feature: { connect: { engName: 'Gaze of Two Minds' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Disguise Self необмежено',
            optionNameEng: 'Mask of Many Faces',
            features: {
                create: [{ feature: { connect: { engName: 'Mask of Many Faces' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Silent Image необмежено',
            optionNameEng: 'Misty Visions',
            features: {
                create: [{ feature: { connect: { engName: 'Misty Visions' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Eldritch Blast відштовхує 10 фт',
            optionNameEng: 'Repelling Blast',
            features: {
                create: [{ feature: { connect: { engName: 'Repelling Blast' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Eldritch Blast підтягує 10 фт',
            optionNameEng: 'Grasp of Hadar',
            features: {
                create: [{ feature: { connect: { engName: 'Grasp of Hadar' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Eldritch Blast сповільнює -10 фт',
            optionNameEng: 'Lance of Lethargy',
            features: {
                create: [{ feature: { connect: { engName: 'Lance of Lethargy' } } }]
            },
        },

// ПЕРЕДУМОВИ: 5+ РІВЕНЬ
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Extra Attack пактовою зброєю',
            optionNameEng: 'Thirsting Blade',
            prerequisites: { level: 5, pact: 'Pact of the Blade' },
            features: {
                create: [{ feature: { connect: { engName: 'Thirsting Blade' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Bestow Curse 1/день',
            optionNameEng: 'Sign of Ill Omen',
            prerequisites: { level: 5 },
            features: {
                create: [{ feature: { connect: { engName: 'Sign of Ill Omen' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: '+1 до пактової зброї, можна лук',
            optionNameEng: 'Improved Pact Weapon',
            prerequisites: { level: 5, pact: 'Pact of the Blade' },
            features: {
                create: [{ feature: { connect: { engName: 'Improved Pact Weapon' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Дихання під водою + плавання',
            optionNameEng: 'Gift of the Depths',
            prerequisites: { level: 5 },
            features: {
                create: [{ feature: { connect: { engName: 'Gift of the Depths' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Максимум хілу з фамільяром',
            optionNameEng: 'Gift of the Ever-Living Ones',
            prerequisites: { level: 5, pact: 'Pact of the Chain' },
            features: {
                create: [{ feature: { connect: { engName: 'Gift of the Ever-Living Ones' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Телепатія з фамільяром',
            optionNameEng: 'Voice of the Chain Master',
            prerequisites: { pact: 'Pact of the Chain' },
            features: {
                create: [{ feature: { connect: { engName: 'Voice of the Chain Master' } } }]
            },
        },

// 7+ РІВЕНЬ
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Polymorph 1/день',
            optionNameEng: 'Sculptor of Flesh',
            prerequisites: { level: 7 },
            features: {
                create: [{ feature: { connect: { engName: 'Sculptor of Flesh' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Невидимість на себе в тіні',
            optionNameEng: 'One with Shadows',
            prerequisites: { level: 7 },
            features: {
                create: [{ feature: { connect: { engName: 'One with Shadows' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Свобода Рухів 1/день',
            optionNameEng: 'Trickster\'s Escape',
            prerequisites: { level: 7 },
            features: {
                create: [{ feature: { connect: { engName: 'Trickster\'s Escape' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'шкода слотами заклинання пактовою зброєю',
            optionNameEng: 'Eldritch Smite',
            prerequisites: { level: 5, pact: 'Pact of the Blade' },
            features: {
                create: [{ feature: { connect: { engName: 'Eldritch Smite' } } }]
            },
        },

// 9+ РІВЕНЬ
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Левітація необмежено на себе',
            optionNameEng: 'Ascendant Step',
            prerequisites: { level: 9 },
            features: {
                create: [{ feature: { connect: { engName: 'Ascendant Step' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Розмова з Мертвими необмежено',
            optionNameEng: 'Whispers of the Grave',
            prerequisites: { level: 9 },
            features: {
                create: [{ feature: { connect: { engName: 'Whispers of the Grave' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Стрибок [Jump] необмежено на себе',
            optionNameEng: 'Otherworldly Leap',
            prerequisites: { level: 9 },
            features: {
                create: [{ feature: { connect: { engName: 'Otherworldly Leap' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'З\'ява стихійника [Conjure Elemental] 1/день',
            optionNameEng: 'Minions of Chaos',
            prerequisites: { level: 9 },
            features: {
                create: [{ feature: { connect: { engName: 'Minions of Chaos' } } }]
            },
        },

// 12+ РІВЕНЬ
        {
            groupName: 'Потойбічні виклики',
            optionName: '+ХАР некротичної пактовою зброєю',
            optionNameEng: 'Lifedrinker',
            prerequisites: { level: 12, pact: 'Pact of the Blade' },
            features: {
                create: [{ feature: { connect: { engName: 'Lifedrinker' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Ritual заклинання в Книзі Тіней',
            optionNameEng: 'Book of Ancient Secrets',
            prerequisites: { pact: 'Pact of the Tome' },
            features: {
                create: [{ feature: { connect: { engName: 'Book of Ancient Secrets' } } }]
            },
        },

// 15+ РІВЕНЬ
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Arcane Eye необмежено',
            optionNameEng: 'Visions of Distant Realms',
            prerequisites: { level: 15 },
            features: {
                create: [{ feature: { connect: { engName: 'Visions of Distant Realms' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Alter Self необмежено',
            optionNameEng: 'Master of Myriad Forms',
            prerequisites: { level: 15 },
            features: {
                create: [{ feature: { connect: { engName: 'Master of Myriad Forms' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Invisibility необмежено на себе',
            optionNameEng: 'Shrouded in Shadow',
            prerequisites: { level: 15 },
            features: {
                create: [{ feature: { connect: { engName: 'Shrouded in Shadow' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Бачення справжньої форми 30 фт',
            optionNameEng: 'Witch Sight',
            prerequisites: { level: 15 },
            features: {
                create: [{ feature: { connect: { engName: 'Witch Sight' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Hold Monster на планарних істот',
            optionNameEng: 'Chains of Carceri',
            prerequisites: { level: 15, pact: 'Pact of the Chain' },
            features: {
                create: [{ feature: { connect: { engName: 'Chains of Carceri' } } }]
            },
        },
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Реакція → 10×рівень ТХП',
            optionNameEng: 'Tomb of Levistus',
            prerequisites: { level: 5 },
            features: {
                create: [{ feature: { connect: { engName: 'Tomb of Levistus' } } }]
            },
        },

        // ===== XGE INVOCATIONS =====

// 44. Aspect of the Moon
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Не потрібен сон (Пакт Книги)',
            optionNameEng: 'Aspect of the Moon',
            prerequisites: { pact: 'Pact of the Tome' },
            features: {
                create: [{ feature: { connect: { engName: 'Aspect of the Moon' } } }]
            },
        },

// 45. Cloak of Flies
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Аура мух: +ХАР отруйної шкоди',
            optionNameEng: 'Cloak of Flies',
            prerequisites: { level: 5 },
            features: {
                create: [{ feature: { connect: { engName: 'Cloak of Flies' } } }]
            },
        },

// 46. Ghostly Gaze
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Бачити крізь стіни 30 фт',
            optionNameEng: 'Ghostly Gaze',
            prerequisites: { level: 7 },
            features: {
                create: [{ feature: { connect: { engName: 'Ghostly Gaze' } } }]
            },
        },

// 47. Maddening Hex
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Психічна шкода проклятій цілі',
            optionNameEng: 'Maddening Hex',
            prerequisites: { level: 5 },
            features: {
                create: [{ feature: { connect: { engName: 'Maddening Hex' } } }]
            },
        },

// 48. Relentless Hex
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Телепорт до проклятої цілі',
            optionNameEng: 'Relentless Hex',
            prerequisites: { level: 7 },
            features: {
                create: [{ feature: { connect: { engName: 'Relentless Hex' } } }]
            },
        },

// ===== TCE INVOCATIONS =====

// 49. Far Scribe
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Писати повідомлення в Книзі (Пакт Книги)',
            optionNameEng: 'Far Scribe',
            prerequisites: { level: 5, pact: 'Pact of the Tome' },
            features: {
                create: [{ feature: { connect: { engName: 'Far Scribe' } } }]
            },
        },

// 50. Gift of the Protectors
        {
            groupName: 'Потойбічні виклики',
            optionName: '6 союзників: 0 ХП → 1 ХП (Пакт Книги)',
            optionNameEng: 'Gift of the Protectors',
            prerequisites: { level: 9, pact: 'Pact of the Tome' },
            features: {
                create: [{ feature: { connect: { engName: 'Gift of the Protectors' } } }]
            },
        },

// 51. Investment of the Chain Master
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Посилений фамільяр (Пакт Ланцюга)',
            optionNameEng: 'Investment of the Chain Master',
            prerequisites: { pact: 'Pact of the Chain' },
            features: {
                create: [{ feature: { connect: { engName: 'Investment of the Chain Master' } } }]
            },
        },

// 52. Undying Servitude
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Animate Dead 1/день',
            optionNameEng: 'Undying Servitude',
            prerequisites: { level: 5 },
            features: {
                create: [{ feature: { connect: { engName: 'Undying Servitude' } } }]
            },
        },

// 53. Rebuke of the Talisman
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Реакція: шкода атакуючому (Пакт Талісмана)',
            optionNameEng: 'Rebuke of the Talisman',
            prerequisites: { pact: 'Pact of the Talisman' },
            features: {
                create: [{ feature: { connect: { engName: 'Rebuke of the Talisman' } } }]
            },
        },

// 54. Protection of the Talisman
        {
            groupName: 'Потойбічні виклики',
            optionName: '+к4 до ряткидку (Пакт Талісмана)',
            optionNameEng: 'Protection of the Talisman',
            prerequisites: { level: 7, pact: 'Pact of the Talisman' },
            features: {
                create: [{ feature: { connect: { engName: 'Protection of the Talisman' } } }]
            },
        },

// 55. Bond of the Talisman
        {
            groupName: 'Потойбічні виклики',
            optionName: 'Телепорт до носія талісмана',
            optionNameEng: 'Bond of the Talisman',
            prerequisites: { level: 12, pact: 'Pact of the Talisman' },
            features: {
                create: [{ feature: { connect: { engName: 'Bond of the Talisman' } } }]
            },
        },
    ]

    // Створюємо/оновлюємо саму опцію, а звʼязки з фічами додаємо тільки якщо їх ще немає
    for (const option of options) {
        const createEntries = option.features?.create;
        const featureCreates = Array.isArray(createEntries)
            ? createEntries
            : createEntries
                ? [createEntries]
                : [];

        const featureNames = featureCreates
            .map((entry) => (entry as any)?.feature?.connect?.engName as string | undefined)
            .filter(Boolean) as string[];

        const { features, ...optionData } = option;

        const savedOption = await prisma.choiceOption.upsert({
            where: { optionNameEng: option.optionNameEng },
            update: optionData,
            create: optionData,
        });

        for (const engName of featureNames) {
            const feature = await prisma.feature.findUnique({ where: { engName } });
            if (!feature) {
                console.warn(`⚠️ Feature with engName=${engName} not found, skip linking to ${option.optionNameEng}`);
                continue;
            }

            const existingLink = await prisma.choiceOptionFeature.findFirst({
                where: {
                    choiceOptionId: savedOption.choiceOptionId,
                    featureId: feature.featureId,
                },
            });

            if (!existingLink) {
                await prisma.choiceOptionFeature.create({
                    data: {
                        choiceOptionId: savedOption.choiceOptionId,
                        featureId: feature.featureId,
                    },
                });
            }
        }
    }


    console.log('✅ Додано опцій вибору:', options.length)
}

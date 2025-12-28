import {
    Ability,
    Language,
    Prisma,
    PrismaClient,
    Races,
    Size,
    Skills,
    Source,
    WeaponCategory, WeaponType
} from "@prisma/client";

export const seedRaces = async (prisma: PrismaClient) => {
    console.log('🐉 Додаємо раси...')

    const MPMMBaseASI = {
        tasha: {
            flexible: {
                groups: [
                    {
                        groupName: '+1 до Двох',
                        value: 1,
                        choiceCount: 2,
                        unique: false
                    },
                    {
                        groupName: '+1 до Однієї',
                        value: 1,
                        choiceCount: 1,
                        unique: false
                    },
                ]
            },
        },
    }

    const races: Prisma.RaceCreateInput[] = [
        // ============ ДВОРФ ============
        {
            name: Races.DWARF_2014,
            sortOrder: 2,
            size: [Size.MEDIUM],
            speed: 25,
            source: Source.PHB,
            languages: [Language.COMMON, Language.DWARVISH],
            weaponProficiencies: {
                category: [
                    WeaponCategory.BATTLEAXE,
                    WeaponCategory.HANDAXE,
                    WeaponCategory.LIGHT_HAMMER,
                    WeaponCategory.WARHAMMER
                ],
            },
            languagesToChooseCount: 0,
            toolProficiencies: [
                'ковальські інструменти',
                'пивоварні приладдя',
                'каменярські інструменти'
            ],
            ASI: {
                basic: {
                    simple: {
                        CON: 2
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Dwarven Combat Training' } } },
                    { feature: { connect: { engName: 'Stonecunning' } } },
                    { feature: { connect: { engName: 'Dwarven Tool Proficiency' } } },
                    { feature: { connect: { engName: 'Dwarven Resilience' } } }
                ]
            }
        },

        // ============ ЕЛЬФ ============
        {
            name: Races.ELF_2014,
            sortOrder: 3,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.PHB,
            languages: [Language.COMMON, Language.ELVISH],
            languagesToChooseCount: 0,
            ASI: {
                basic: {
                    simple: {
                        DEX: 2
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            skillProficiencies: [Skills.PERCEPTION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Keen Senses' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } },
                    { feature: { connect: { engName: 'Trance' } } }
                ]
            }
        },

        // ============ НАПІВРОСЛИК ============
        {
            name: Races.HALFLING_2014,
            sortOrder: 4,
            size: [Size.SMALL],
            speed: 25,
            source: Source.PHB,
            languages: [Language.COMMON, Language.HALFLING],
            languagesToChooseCount: 0,
            ASI: {
                basic: {
                    simple: {
                        DEX: 2
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Lucky' } } },
                    { feature: { connect: { engName: 'Brave' } } },
                    { feature: { connect: { engName: 'Nimbleness' } } }
                ]
            }
        },

        // ============ ЛЮДИНА ============
        {
            name: Races.HUMAN_2014,
            sortOrder: 1,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.PHB,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: {
                basic: {
                    simple: {
                        STR: 1,
                        DEX: 1,
                        CON: 1,
                        INT: 1,
                        WIS: 1,
                        CHA: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+1 до Шести',
                                value: 1,
                                choiceCount: 6,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: []
            }
        },

        // ============ ДРАКОНОНАРОДЖЕНИЙ ============
        {
            name: Races.DRAGONBORN_2014,
            sortOrder: 5,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.PHB,
            languages: [Language.COMMON, Language.DRACONIC],
            languagesToChooseCount: 0,
            ASI: {
                basic: {
                    simple: {
                        STR: 2,
                        CHA: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Draconic Resistance' } } },
                ]
            }
        },

        // ============ ДРАКОНОНАРОДЖЕНИЙ (FIZBAN'S) ============
        {
            name: Races.DRAGONBORN_CHROMATIC,
            sortOrder: 5,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.FTOD,
            languages: [Language.COMMON, Language.DRACONIC],
            languagesToChooseCount: 0,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Chromatic Warding' } } },
                ]
            }
        },
        {
            name: Races.DRAGONBORN_METALLIC,
            sortOrder: 5,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.FTOD,
            languages: [Language.COMMON, Language.DRACONIC],
            languagesToChooseCount: 0,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Metallic Breath Weapon' } } },
                ]
            }
        },
        {
            name: Races.DRAGONBORN_GEM,
            sortOrder: 5,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.FTOD,
            languages: [Language.COMMON, Language.DRACONIC],
            languagesToChooseCount: 0,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Psionic Mind' } } },
                    { feature: { connect: { engName: 'Gem Flight' } } },
                ]
            }
        },

        // ============ ГНОМ ============
        {
            name: Races.GNOME_2014,
            sortOrder: 6,
            size: [Size.SMALL],
            speed: 25,
            source: Source.PHB,
            languages: [Language.COMMON, Language.GNOMISH],
            languagesToChooseCount: 0,
            ASI: {
                basic: {
                    simple: {
                        INT: 2
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Gnome Cunning' } } }
                ]
            }
        },

        // ============ НАПІВЕЛЬФ ============
        {
            name: Races.HALF_ELF_2014,
            sortOrder: 7,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.PHB,
            languages: [Language.COMMON, Language.ELVISH],
            languagesToChooseCount: 1,
            ASI: {
                basic: {
                    simple: {
                        CHA: 2,
                    },
                    flexible: {
                        groups: [
                            {
                                groupName: '+1 до Двох',
                                value: 1,
                                choiceCount: 2,
                                unique: true
                            },
                        ]
                    },
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+1 до Двох',
                                value: 1,
                                choiceCount: 2,
                                unique: true
                            },
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                        ]
                    },
                },
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } }
                ]
            }
        },

        // ============ НАПІВОРК ============
        {
            name: Races.HALF_ORC_2014,
            sortOrder: 8,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.PHB,
            languages: [Language.COMMON, Language.ORC],
            languagesToChooseCount: 0,
            ASI: {
                basic: {
                    simple: {
                        STR: 2,
                        CON: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            skillProficiencies: [Skills.INTIMIDATION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Relentless Endurance' } } },
                    { feature: { connect: { engName: 'Menacing' } } },
                    { feature: { connect: { engName: 'Savage Attacks' } } }
                ]
            }
        },

        // ============ ТИФЛІНГ ============
        {
            name: Races.TIEFLING_2014,
            sortOrder: 9,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.PHB,
            languages: [Language.COMMON, Language.INFERNAL],
            languagesToChooseCount: 0,
            ASI: {
                basic: {
                    simple: {
                        CHA: 2,
                        INT: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Hellish Resistance' } } },
                    { feature: { connect: { engName: 'Infernal Legacy' } } }
                ]
            }
        },

        // ============ AARAKOCRA ============
        {
            name: Races.AARAKOCRA_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            flightSpeed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Flight' } } },
                    { feature: { connect: { engName: 'Talons' } } },
                    { feature: { connect: { engName: 'Wind Caller' } } },
                ]
            }
        },

        // ============ AASIMAR ============
        {
            name: Races.AASIMAR_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Celestial Resistance' } } },
                    { feature: { connect: { engName: 'Healing Hands' } } },
                    { feature: { connect: { engName: 'Celestial Revelation' } } }
                ]
            }
        },

        // ============ BUGBEAR ============
        {
            name: Races.BUGBEAR_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            skillProficiencies: [Skills.STEALTH],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Long-Limbed' } } },
                    { feature: { connect: { engName: 'Powerful Build' } } },
                    { feature: { connect: { engName: 'Sneaky' } } },
                    { feature: { connect: { engName: 'Surprise Attack' } } }
                ]
            }
        },

        // ============ CENTAUR ============
        {
            name: Races.CENTAUR_MPMM,
            size: [Size.MEDIUM],
            speed: 40,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            skillProficiencies: {
                options: [Skills.ANIMAL_HANDLING, Skills.MEDICINE, Skills.NATURE, Skills.SURVIVAL],
                choiceCount: 1
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Charge' } } },
                    { feature: { connect: { engName: 'Hooves' } } },
                    { feature: { connect: { engName: 'Equine Build' } } }
                ]
            }
        },

        // ============ CHANGELING ============
        {
            name: Races.CHANGELING_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            skillProficiencies: {
                options: [Skills.DECEPTION, Skills.INTIMIDATION, Skills.PERSUASION, Skills.PERFORMANCE, Skills.INSIGHT],
                choiceCount: 2
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Shapechanger' } } }
                ]
            }
        },

        // ============ DEEP GNOME ============
        {
            name: Races.DEEP_GNOME_MPMM,
            size: [Size.SMALL],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Superior Darkvision' } } },
                    { feature: { connect: { engName: 'Gift of the Svirfneblin' } } },
                    { feature: { connect: { engName: 'Gnomish Magic Resistance' } } },
                    { feature: { connect: { engName: 'Svirfneblin Camouflage' } } },
                ]
            }
        },

        // ============ DUERGAR ============
        {
            name: Races.DUERGAR_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Superior Darkvision' } } },
                    { feature: { connect: { engName: 'Dwarven Resilience' } } },
                    { feature: { connect: { engName: 'Duergar Resilience' } } },
                    { feature: { connect: { engName: 'Psionic Fortitude' } } },
                    { feature: { connect: { engName: 'Duergar Magic' } } }
                ]
            }
        },

        // ============ ELADRIN ============
        {
            name: Races.ELADRIN_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            skillProficiencies: [Skills.PERCEPTION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } },
                    { feature: { connect: { engName: 'Fey Step' } } },
                    { feature: { connect: { engName: 'Keen Senses' } } },
                    { feature: { connect: { engName: 'Trance' } } }
                ]
            }
        },

        // ============ FAIRY ============
        {
            name: Races.FAIRY_MPMM,
            size: [Size.SMALL],
            speed: 30,
            flightSpeed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Fairy Magic' } } },
                    { feature: { connect: { engName: 'Flight' } } }
                ]
            }
        },

        // ============ FIRBOLG ============
        {
            name: Races.FIRBOLG_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Powerful Build' } } },
                    { feature: { connect: { engName: 'Hidden Step' } } },
                    { feature: { connect: { engName: 'Speech of Beast and Leaf' } } },
                    { feature: { connect: { engName: 'Firbolg Magic' } } }
                ]
            }
        },

        // ============ GENASI AIR ============
        {
            name: Races.GENASI_AIR_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Unending Breath' } } },
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Mingle with the Wind' } } },
                    { feature: { connect: { engName: 'Lightning Resistance' } } }
                ]
            }
        },

        // ============ GENASI EARTH ============
        {
            name: Races.GENASI_EARTH_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Earth Walk' } } },
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Merge with Stone' } } }
                ]
            }
        },

        // ============ GENASI FIRE ============
        {
            name: Races.GENASI_FIRE_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Hellish Resistance' } } },
                    { feature: { connect: { engName: 'Reach to the Blaze' } } }
                ]
            }
        },

        // ============ GENASI WATER ============
        {
            name: Races.GENASI_WATER_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            swimSpeed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Acid Resistance' } } },
                    { feature: { connect: { engName: 'Amphibious' } } },
                    { feature: { connect: { engName: 'Call to the Wave' } } }
                ]
            }
        },

        // ============ GITHYANKI ============
        {
            name: Races.GITHYANKI_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Astral Knowledge' } } },
                    { feature: { connect: { engName: 'Psychic Resilience' } } },
                    { feature: { connect: { engName: 'Githyanki Psionics' } } }
                ]
            }
        },

        // ============ GITHZERAI ============
        {
            name: Races.GITHZERAI_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Mental Discipline' } } },
                    { feature: { connect: { engName: 'Psychic Resilience' } } },
                    { feature: { connect: { engName: 'Githzerai Psionics' } } }
                ]
            }
        },

        // ============ GOBLIN ============
        {
            name: Races.GOBLIN_MPMM,
            size: [Size.SMALL],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Fury of the Small' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } },
                    { feature: { connect: { engName: 'Nimble Escape' } } }
                ]
            }
        },

        // ============ GOLIATH ============
        {
            name: Races.GOLIATH_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI:
            MPMMBaseASI
            ,
            skillProficiencies: [Skills.ATHLETICS],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Stone\'s Endurance' } } },
                    { feature: { connect: { engName: 'Little Giant' } } },
                    { feature: { connect: { engName: 'Mountain Born' } } },
                ]
            }
        },

        // ============ HARENGON ============
        {
            name: Races.HARENGON_MPMM,
            size: [Size.MEDIUM, Size.SMALL],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: [Skills.PERCEPTION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Hare-Trigger' } } },
                    { feature: { connect: { engName: 'Leporine Senses' } } },
                    { feature: { connect: { engName: 'Lucky Footwork' } } },
                    { feature: { connect: { engName: 'Rabbit Hop' } } },
                ]
            }
        },

        // ============ HOBGOBLIN ============
        {
            name: Races.HOBGOBLIN_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } },
                    { feature: { connect: { engName: 'Fey Gift' } } },
                    { feature: { connect: { engName: 'Fortune from the Many' } } }
                ]
            }
        },

        // ============ KENKU ============
        {
            name: Races.KENKU_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: {
                options: [], // ALL!!!
                choiceCount: 2,
                chooseAny: true
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Kenku Recall' } } },
                    { feature: { connect: { engName: 'Mimicry' } } },
                    { feature: { connect: { engName: 'Expert Duplication' } } },
                ]
            }
        },

        // ============ KOBOLD ============
        {
            name: Races.KOBOLD_MPMM,
            size: [Size.SMALL],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Draconic Cry' } } } // TODO: race options for ancestry
                ]
            }
        },

        // ============ LIZARDFOLK ============
        {
            name: Races.LIZARDFOLK_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            swimSpeed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: {
                options: [Skills.ANIMAL_HANDLING, Skills.MEDICINE, Skills.NATURE, Skills.PERCEPTION, Skills.STEALTH, Skills.SURVIVAL],
                choiceCount: 2,
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Natural Armor' } } },
                    { feature: { connect: { engName: 'Hold Breath' } } },
                    { feature: { connect: { engName: 'Hungry Jaws' } } },
                    { feature: { connect: { engName: 'Bite' } } },
                ]
            }
        },

        // ============ MINOTAUR ============
        {
            name: Races.MINOTAUR_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: [Skills.SURVIVAL],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Horns' } } },
                    { feature: { connect: { engName: 'Goring Rush' } } },
                    { feature: { connect: { engName: 'Labyrinthine Recall' } } },
                    { feature: { connect: { engName: 'Hammering Horns' } } }
                ]
            }
        },

        // ============ ORC ============
        {
            name: Races.ORC_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Adrenaline Rush' } } },
                    { feature: { connect: { engName: 'Powerful Build' } } },
                    { feature: { connect: { engName: 'Relentless Endurance' } } }
                ]
            }
        },

        // ============ SATYR ============
        {
            name: Races.SATYR_MPMM,
            size: [Size.MEDIUM],
            speed: 35,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: [Skills.PERFORMANCE, Skills.PERSUASION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Magic Resistance' } } },
                    { feature: { connect: { engName: 'Mirthful Leaps' } } },
                    { feature: { connect: { engName: 'Ram' } } },
                    { feature: { connect: { engName: 'Reveler' } } }
                ]
            }
        },

        // ============ SEA ELF ============
        {
            name: Races.SEA_ELF_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            swimSpeed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON, Language.ELVISH],
            languagesToChooseCount: 0,
            ASI: MPMMBaseASI,
            skillProficiencies: [Skills.PERCEPTION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } },
                    { feature: { connect: { engName: 'Trance' } } },
                    { feature: { connect: { engName: 'Child of the Sea' } } },
                    { feature: { connect: { engName: 'Keen Senses' } } },
                    { feature: { connect: { engName: 'Friend of the Sea' } } },
                ]
            }
        },

        // ============ SHADAR-KAI ============
        {
            name: Races.SHADAR_KAI_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON, Language.ELVISH],
            languagesToChooseCount: 0,
            ASI: MPMMBaseASI,
            skillProficiencies: [Skills.PERCEPTION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } },
                    { feature: { connect: { engName: 'Trance' } } },
                    { feature: { connect: { engName: 'Keen Senses' } } },
                    { feature: { connect: { engName: 'Blessing of the Raven Queen' } } },
                    { feature: { connect: { engName: 'Necrotic Resistance' } } }
                ]
            }
        },

        // ============ SHIFTER ============
        {
            name: Races.SHIFTER_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: {
                options: [Skills.ACROBATICS, Skills.ATHLETICS, Skills.INTIMIDATION, Skills.SURVIVAL],
                choiceCount: 1,
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Bestial Instincts' } } },
                    // { feature: { connect: { engName: 'Shifting' } } }  TODO: Races Options - shift
                ]
            }
        },

        // ============ TABAXI ============
        {
            name: Races.TABAXI_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            climbSpeed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: [Skills.PERCEPTION, Skills.STEALTH],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Cat\'s Claws' } } },
                    { feature: { connect: { engName: 'Cat\'s Talent' } } },
                    { feature: { connect: { engName: 'Feline Agility' } } }
                ]
            }
        },

        // ============ TORTLE ============
        {
            name: Races.TORTLE_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ac: {base: 17, bonus: null},
            ASI: MPMMBaseASI,
            skillProficiencies: {
                options: [Skills.ANIMAL_HANDLING, Skills.MEDICINE, Skills.NATURE, Skills.SURVIVAL, Skills.STEALTH, Skills.PERCEPTION],
                choiceCount: 1,
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Shell Armor' } } },
                    { feature: { connect: { engName: 'Hold Breath' } } },
                    { feature: { connect: { engName: 'Claws' } } },
                    { feature: { connect: { engName: 'Shell Defense' } } }
                ]
            }
        },

        // ============ TRITON ============
        {
            name: Races.TRITON_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            swimSpeed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Amphibious' } } },
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Control Air and Water' } } },
                    { feature: { connect: { engName: 'Emissary of the Sea' } } },
                    { feature: { connect: { engName: 'Guardian of the Depths' } } }
                ]
            }
        },

        // ============ YUAN-TI ============
        {
            name: Races.YUAN_TI_MPMM,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.MPMM,
            languages: [Language.COMMON],
            languagesToChooseCount: 2,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Magic Resistance' } } },
                    { feature: { connect: { engName: 'Serpentine Spellcasting' } } },
                    { feature: { connect: { engName: 'Poison Resilience' } } }
                ]
            }
        },
        // ============ SPELLJAMMER RACES ============

// ============ ASTRAL ELF ============
        {
            name: Races.ASTRAL_ELF_SPELLJAMMER,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.SPELLJAMMER,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: [Skills.PERCEPTION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Astral Fire' } } }, // cantrip: Dancing Lights/Light/Sacred Flame
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } },
                    { feature: { connect: { engName: 'Keen Senses' } } },
                    { feature: { connect: { engName: 'Starlight Step' } } }, // teleport 30ft, prof bonus times
                    { feature: { connect: { engName: 'Astral Trance' } } } // 4hr rest + temp proficiency
                ]
            }
        },

// ============ AUTOGNOME ============
        {
            name: Races.AUTOGNOME_SPELLJAMMER,
            size: [Size.SMALL],
            speed: 30,
            ac: {base: 13, bonus: Ability.DEX},
            source: Source.SPELLJAMMER,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            toolToChooseCount: 2,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Armored Casing' } } }, // AC 13 + DEX
                    { feature: { connect: { engName: 'Built for Success' } } }, // +d4 до rolls
                    { feature: { connect: { engName: 'Healing Machine' } } }, // Mending + healing spells work
                    { feature: { connect: { engName: 'Mechanical Nature' } } }, // poison resistance, no eat/drink/breathe
                    { feature: { connect: { engName: 'Sentry\'s Rest' } } }, // 6hr inactive rest
                    { feature: { connect: { engName: 'Specialized Design' } } } // 2 tool proficiencies
                ]
            }
        },

// ============ GIFF ============
        {
            name: Races.GIFF_SPELLJAMMER,
            size: [Size.MEDIUM],
            speed: 30,
            swimSpeed: 30,
            source: Source.SPELLJAMMER,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            weaponProficiencies: {
                type: [WeaponType.FIREARMS]
            },
            skillProficiencies: [Skills.ATHLETICS],
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Astral Spark' } } }, // adv on INT/WIS/CHA saves vs magic
                    { feature: { connect: { engName: 'Firearms Mastery' } } }, // firearms proficiency + damage bonus
                    { feature: { connect: { engName: 'Hippo Build' } } } // carrying capacity x2
                ]
            }
        },

// ============ HADOZEE ============
        {
            name: Races.HADOZEE_SPELLJAMMER,
            size: [Size.MEDIUM, Size.SMALL],
            speed: 30,
            climbSpeed: 25,
            source: Source.SPELLJAMMER,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: [Skills.ACROBATICS],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Dexterous Feet' } } }, // bonus action manipulate object
                    { feature: { connect: { engName: 'Glide' } } }, // fall speed 60ft, move 5ft per 1ft descended
                    { feature: { connect: { engName: 'Hadozee Resilience' } } } // reaction: reduce damage by d6+prof
                ]
            }
        },

// ============ PLASMOID ============
        {
            name: Races.PLASMOID_SPELLJAMMER,
            size: [Size.MEDIUM, Size.SMALL],
            speed: 30,
            source: Source.SPELLJAMMER,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Amorphous' } } }, // squeeze through 1 inch + grapple advantage
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Hold Breath' } } }, // 1 hour
                    { feature: { connect: { engName: 'Natural Resilience' } } }, // acid + poison resistance
                    { feature: { connect: { engName: 'Shape Self' } } } // reshape body + pseudopod
                ]
            }
        },

// ============ THRI-KREEN ============
        {
            name: Races.THRI_KREEN_SPELLJAMMER,
            size: [Size.MEDIUM, Size.SMALL],
            speed: 30,
            source: Source.SPELLJAMMER,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ac: {base: 17, bonus: Ability.DEX}, // base AC 13 + DEX from Chameleon Carapace
            ASI: MPMMBaseASI,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Chameleon Carapace' } } }, // AC 13+DEX + stealth advantage
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Secondary Arms' } } }, // 2 extra arms for light weapons
                    { feature: { connect: { engName: 'Sleepless' } } }, // no sleep needed
                    { feature: { connect: { engName: 'Thri-kreen Telepathy' } } } // 120ft telepathy
                ]
            }
        },

// ============ DRAGONLANCE ============

// ============ KENDER ============
        {
            name: Races.KENDER_DRAGONLANCE,
            size: [Size.SMALL],
            speed: 30,
            source: Source.DRAGONLANCE,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: {
                options: [Skills.INSIGHT, Skills.INVESTIGATION, Skills.SLEIGHT_OF_HAND, Skills.STEALTH, Skills.SURVIVAL],
                choiceCount: 1
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Fearless' } } }, // adv vs frightened + 1/LR auto-succeed
                    { feature: { connect: { engName: 'Kender Aptitude' } } }, // 1 skill proficiency
                    { feature: { connect: { engName: 'Taunt' } } } // bonus action taunt, WIS save
                ]
            }
        },

// ============ ONE GRUNG ABOVE ============

// ============ GRUNG ============
        {
            name: Races.GRUNG_OGA,
            size: [Size.SMALL],
            speed: 25,
            climbSpeed: 25,
            source: Source.OGA,
            languages: [Language.GRUNG],
            languagesToChooseCount: 0,
            ASI: {
                basic: {
                    simple: {
                        DEX: 2,
                        CON: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            skillProficiencies: [Skills.PERCEPTION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Arboreal Alertness' } } }, // adv on Perception/Stealth checks
                    { feature: { connect: { engName: 'Amphibious' } } },
                    { feature: { connect: { engName: 'Poisonous Skin' } } }, // poison damage on touch/grapple
                    { feature: { connect: { engName: 'Poison Immunity' } } },
                    { feature: { connect: { engName: 'Standing Leap' } } }, // long jump 25ft, high 15ft
                    { feature: { connect: { engName: 'Water Dependency' } } } // need water immersion 1/day
                ]
            }
        },

// ============ LOCATHAH RISING ============

// ============ LOCATHAH ============
        {
            name: Races.LOCATHAH_LR,
            size: [Size.MEDIUM],
            speed: 30,
            swimSpeed: 30,
            source: Source.LR,
            languages: [Language.COMMON, Language.AQUAN],
            languagesToChooseCount: 0,
            ac: {base: 12, bonus: Ability.DEX}, // Natural Armor: 12 + DEX
            ASI: {
                basic: {
                    simple: {
                        STR: 2,
                        DEX: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            skillProficiencies: [Skills.ATHLETICS, Skills.PERCEPTION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Locathah Natural Armor' } } }, // 12 + DEX
                    { feature: { connect: { engName: 'Observant and Athletic' } } }, // Athletics + Perception prof
                    { feature: { connect: { engName: 'Leviathan Will' } } }, // adv vs charmed/frightened/paralyzed/poisoned/stunned/sleep
                    { feature: { connect: { engName: 'Limited Amphibiousness' } } } // need water every 4 hours
                ]
            }
        },

// ============ GUILDMASTERS' GUIDE TO RAVNICA ============

// ============ LOXODON ============
        {
            name: Races.LOXODON_GGTR,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.GGTR,
            languages: [Language.COMMON, Language.LOXODON],
            languagesToChooseCount: 0,
            ac: {base: 12, bonus: Ability.CON}, // Natural Armor: 12 + CON
            ASI: {
                basic: {
                    simple: {
                        CON: 2,
                        WIS: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Loxodon Natural Armor' } } }, // 12 + CON modifier
                    { feature: { connect: { engName: 'Loxodon Serenity' } } }, // adv vs charmed/frightened
                    { feature: { connect: { engName: 'Powerful Build' } } },
                    { feature: { connect: { engName: 'Keen Smell' } } }, // adv on Perception/Survival using smell
                    { feature: { connect: { engName: 'Trunk' } } } // can use as extra hand
                ]
            }
        },

// ============ SIMIC HYBRID ============
        {
            name: Races.SIMIC_HYBRID_GGTR,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.GGTR,
            languages: [Language.COMMON, Language.ELVISH, Language.VEDALKEN],
            languagesToChooseCount: 1,
            ASI: {
                basic: {
                    simple: {
                        CON: 2
                    },
                    flexible: {
                        groups: [
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Animal Enhancements' } } } // TODO: Races Choice Options - вибір 1 на 1lvl, +1 на 5lvl
                ]
            }
        },

// ============ VEDALKEN ============
        {
            name: Races.VEDALKEN_GGTR,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.GGTR,
            languages: [Language.COMMON, Language.VEDALKEN],
            languagesToChooseCount: 1,
            ASI: {
                basic: {
                    simple: {
                        INT: 2,
                        WIS: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            skillProficiencies: {
                options: [Skills.ARCANA, Skills.HISTORY, Skills.INVESTIGATION, Skills.MEDICINE, Skills.PERFORMANCE, Skills.SLEIGHT_OF_HAND],
                choiceCount: 1
            },
            toolToChooseCount: 1,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Vedalken Dispassion' } } }, // adv on INT/WIS/CHA saves
                    { feature: { connect: { engName: 'Tireless Precision' } } }, // 1 skill prof + 1 tool prof
                    { feature: { connect: { engName: 'Partially Amphibious' } } } // breathe underwater 1 hour
                ]
            }
        },

// ============ ACQUISITIONS INCORPORATED ============

// ============ VERDAN ============
        {
            name: Races.VERDAN_AI,
            size: [Size.MEDIUM, Size.SMALL],
            speed: 30,
            source: Source.AI,
            languages: [Language.COMMON, Language.GOBLIN],
            languagesToChooseCount: 1,
            ASI: {
                basic: {
                    simple: {
                        CHA: 2,
                        CON: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            skillProficiencies: [Skills.PERSUASION],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Black Blood Healing' } } }, // 12+1d4 HP from magical healing
                    { feature: { connect: { engName: 'Limited Telepathy' } } }, // 30ft telepathy
                    { feature: { connect: { engName: 'Persuasive' } } }, // Persuasion proficiency
                    { feature: { connect: { engName: 'Telepathic Insight' } } } // adv on WIS/CHA saves
                ]
            }
        },

// ============ EBERRON: RISING FROM THE LAST WAR ============

// ============ KALASHTAR ============
        {
            name: Races.KALASHTAR_EBERRON,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.EBERRON,
            languages: [Language.COMMON, Language.QUORI],
            languagesToChooseCount: 1,
            ASI: {
                basic: {
                    simple: {
                        WIS: 2,
                        CHA: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Dual Mind' } } }, // adv on WIS saves
                    { feature: { connect: { engName: 'Kalashtar Mental Discipline' } } }, // psychic resistance
                    { feature: { connect: { engName: 'Mind Link' } } }, // telepathy prof bonus creatures
                    { feature: { connect: { engName: 'Severed from Dreams' } } } // no sleep, can't be affected by dream spells
                ]
            }
        },

// ============ WARFORGED ============
        {
            name: Races.WARFORGED_EBERRON,
            size: [Size.MEDIUM],
            speed: 30,
            source: Source.EBERRON,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ac: {
                consistentBonus: 1
            },
            ASI: {
                basic: {
                    simple: {
                        CON: 2
                    },
                    flexible: {
                        groups: [
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            skillProficiencies: {
                options: [], // ALL!!!
                choiceCount: 1,
                chooseAny: true
            },
            toolToChooseCount: 1,
            traits: {
                create: [
                    { feature: { connect: { engName: 'Constructed Resilience' } } }, // poison adv, no eat/drink/breathe/sleep
                    { feature: { connect: { engName: 'Sentry\'s Rest' } } },
                    { feature: { connect: { engName: 'Integrated Protection' } } }, // AC bonus + can integrate armor
                    { feature: { connect: { engName: 'Warforged Specialized Design' } } } // 1 skill + 1 tool proficiency
                ]
            }
        },

// ============ MYTHIC ODYSSEYS OF THEROS ============

// ============ LEONIN ============
        {
            name: Races.LEONIN_MOOT,
            size: [Size.MEDIUM],
            speed: 35,
            source: Source.MOOT,
            languages: [Language.COMMON, Language.LEONIN],
            languagesToChooseCount: 0,
            ASI: {
                basic: {
                    simple: {
                        CON: 2,
                        STR: 1
                    }
                },
                tasha: {
                    flexible: {
                        groups: [
                            {
                                groupName: '+2 до Однієї',
                                value: 2,
                                choiceCount: 1,
                                unique: true
                            },
                            {
                                groupName: '+1 до Однієї',
                                value: 1,
                                choiceCount: 1,
                                unique: true
                            }
                        ]
                    }
                }
            },
            skillProficiencies: {
                options: [Skills.ATHLETICS, Skills.INTIMIDATION, Skills.PERCEPTION, Skills.SURVIVAL],
                choiceCount: 1
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Leonin Claws' } } }, // 1d4 slashing
                    { feature: { connect: { engName: 'Hunter\'s Instincts' } } }, // 1 skill from 4 options
                    { feature: { connect: { engName: 'Daunting Roar' } } } // frightened on failed WIS save
                ]
            }
        },
// TODO: custom race
// ============ VAN RICHTEN'S GUIDE TO RAVENLOFT ============

// ============ DHAMPIR ============
        {
            name: Races.DHAMPIR_VRGTR,
            size: [Size.MEDIUM, Size.SMALL],
            speed: 35,
            climbSpeed: 35, // can climb difficult surfaces
            source: Source.VRGTR,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: {
                options: [], // ALL!!!
                choiceCount: 2,
                chooseAny: true
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Dhampir Deathless Nature' } } }, // no breathe, adv vs disease/poison
                    { feature: { connect: { engName: 'Spider Climb' } } }, // climb speed equal to walking
                    { feature: { connect: { engName: 'Vampiric Bite' } } } // piercing damage + heal, prof bonus times
                ]
            }
        },

// ============ HEXBLOOD ============
        {
            name: Races.HEXBLOOD_VRGTR,
            size: [Size.MEDIUM, Size.SMALL],
            speed: 30,
            source: Source.VRGTR,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: {
                options: [], // ALL!!!
                choiceCount: 2,
                chooseAny: true
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Eerie Token' } } }, // create token to spy/communicate
                    { feature: { connect: { engName: 'Hex Magic' } } } // Disguise Self + Hex spells
                ]
            }
        },

// ============ REBORN ============
        {
            name: Races.REBORN_VRGTR,
            size: [Size.MEDIUM, Size.SMALL],
            speed: 30,
            source: Source.VRGTR,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: {
                options: [], // ALL!!!
                choiceCount: 2,
                chooseAny: true
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Deathless Nature' } } },
                    { feature: { connect: { engName: 'Knowledge from a Past Life' } } } // add d6 to skill check, prof bonus times
                ]
            }
        },

// ============ STRIXHAVEN: A CURRICULUM OF CHAOS ============

// ============ OWLIN ============
        {
            name: Races.OWLIN_SACOC,
            size: [Size.MEDIUM, Size.SMALL],
            speed: 30,
            flightSpeed: 30,
            source: Source.SACOC,
            languages: [Language.COMMON],
            languagesToChooseCount: 1,
            ASI: MPMMBaseASI,
            skillProficiencies: [Skills.STEALTH],
            traits: {
                create: [
                    { feature: { connect: { engName: 'Superior Darkvision' } } },
                    { feature: { connect: { engName: 'Flight' } } },
                    { feature: { connect: { engName: 'Silent Feathers' } } } // Stealth proficiency
                ]
            }
        }
    ]

    
    for (const race of races) {
        const traitCreates = Array.isArray(race.traits?.create)
            ? race.traits?.create ?? []
            : race.traits?.create
                ? [race.traits.create]
                : [];

        const { traits, ...raceData } = race;

        try {
            const savedRace = await prisma.race.upsert({
                where: { name: race.name },
                update: raceData,
                create: raceData
            })

            for (const entry of traitCreates) {
                const engName = (entry as any)?.feature?.connect?.engName as string | undefined;
                if (!engName) continue;

                const feature = await prisma.feature.findUnique({ where: { engName } });
                if (!feature) {
                    console.warn(`Feature with engName=${engName} not found, skip linking to race ${race.name}`);
                    continue;
                }

                const existing = await prisma.raceTrait.findFirst({
                    where: { raceId: savedRace.raceId, featureId: feature.featureId },
                });

                if (!existing) {
                    await prisma.raceTrait.create({
                        data: {
                            raceId: savedRace.raceId,
                            featureId: feature.featureId,
                        },
                    });
                }
            }
        } catch (error) {
            console.error('Failed to upsert race:', race.name);
            console.error('Race payload:', JSON.stringify(race, null, 2));
            console.error('Error:', error);

            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                console.error('Prisma Error Code:', error.code);
                console.error('Meta:', error.meta);

                if (error.code === 'P2025') {
                    console.error('Record to connect not found:', error.meta?.cause);
                }
                if (error.code === 'P2002') {
                    console.error('Unique constraint violation:', error.meta?.target);
                }
            }
        }
    }


    console.log(`✅ Додано ${races.length} рас!`)
}

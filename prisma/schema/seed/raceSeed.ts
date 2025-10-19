import { PrismaClient, Races, Size, Language, Source, Prisma, Skills } from '../../src/generated/prisma'

export const seedPHB2014Races = async (prisma: PrismaClient) => {
    console.log('🐉 Додаємо базові раси PHB 2014...')

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
            size: [Size.MEDIUM],
            speed: 25,
            source: Source.PHB,
            languages: [Language.COMMON, Language.DWARVISH],
            languagesToChooseCount: 0,
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
                    { feature: { connect: { engName: 'Dwarven Resilience' } } }
                ]
            }
        },

        // ============ ЕЛЬФ ============
        {
            name: Races.ELF_2014,
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
                    { feature: { connect: { engName: 'Halfling Nimbleness' } } }
                ]
            }
        },

        // ============ ЛЮДИНА ============
        {
            name: Races.HUMAN_2014,
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
                create: []
            }
        },

        // ============ ДРАКОНОНАРОДЖЕНИЙ ============
        {
            name: Races.DRAGONBORN_2014,
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

        // ============ ГНОМ ============
        {
            name: Races.GNOME_2014,
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
            skillProficiencies: [], // 2 навички на вибір - через RaceChoiceOption
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Powerful Build' } } },
                    { feature: { connect: { engName: 'Stone\'s Endurance' } } }
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Hare-Trigger' } } },
                    { feature: { connect: { engName: 'Leporine Senses' } } },
                    { feature: { connect: { engName: 'Lucky Footwork' } } }
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
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
            languagesToChooseCount: 2,
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Kenku Recall' } } }
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Draconic Cry' } } }
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Natural Armor' } } },
                    { feature: { connect: { engName: 'Hold Breath' } } },
                    { feature: { connect: { engName: 'Hungry Jaws' } } }
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Horns' } } },
                    { feature: { connect: { engName: 'Goring Rush' } } },
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
            ASI: {
                MPMMBaseASI
            },
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
            languages: [Language.COMMON, Language.SYLVAN],
            languagesToChooseCount: 0,
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Magic Resistance' } } },
                    { feature: { connect: { engName: 'Mirthful Leaps' } } },
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } },
                    { feature: { connect: { engName: 'Trance' } } },
                    { feature: { connect: { engName: 'Child of the Sea' } } },
                    { feature: { connect: { engName: 'Sea Elf Training' } } }
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Fey Ancestry' } } },
                    { feature: { connect: { engName: 'Trance' } } },
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Shifting' } } }
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
            ASI: {
                MPMMBaseASI
            },
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
            ac: 17,
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Natural Armor' } } },
                    { feature: { connect: { engName: 'Hold Breath' } } },
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Amphibious' } } },
                    { feature: { connect: { engName: 'Control Air and Water' } } },
                    { feature: { connect: { engName: 'Emissary of the Sea' } } },
                    { feature: { connect: { engName: 'Guardians of the Depths' } } }
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
            ASI: {
                MPMMBaseASI
            },
            traits: {
                create: [
                    { feature: { connect: { engName: 'Darkvision' } } },
                    { feature: { connect: { engName: 'Magic Resistance' } } },
                    { feature: { connect: { engName: 'Poison Immunity' } } }
                ]
            }
        }
    ]

    for (const race of races) {
        await prisma.race.upsert({
            where: { name: race.name },
            update: {},
            create: race
        })
    }

    console.log(`✅ Додано ${ races.length } рас PHB 2014!`)
}

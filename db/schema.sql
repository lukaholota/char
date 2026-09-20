--
-- PostgreSQL database dump
--

\restrict spellsSchemaBaseline

-- Dumped from database version 17.11 (Debian 17.11-0+deb13u1)
-- Dumped by pg_dump version 17.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AOEShapes; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AOEShapes" AS ENUM (
    'CONE',
    'CUBE',
    'CYLINDER',
    'EMANATION',
    'LINE',
    'SPHERE'
);


--
-- Name: Ability; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Ability" AS ENUM (
    'STR',
    'DEX',
    'CON',
    'INT',
    'WIS',
    'CHA'
);


--
-- Name: AbilityBonusType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AbilityBonusType" AS ENUM (
    'FULL',
    'MAX2',
    'NONE'
);


--
-- Name: ArmorCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArmorCategory" AS ENUM (
    'PADDED',
    'LEATHER',
    'STUDDED_LEATHER',
    'HIDE',
    'CHAIN_SHIRT',
    'SCALE_MAIL',
    'BREASTPLATE',
    'HALF_PLATE',
    'RING_MAIL',
    'CHAIN_MAIL',
    'SPLINT',
    'PLATE',
    'SHIELD',
    'HOMEBREW',
    'UNARMORED_DEFENSE_MONK',
    'UNARMORED_DEFENSE_BARBARIAN',
    'NATURAL_ARMOR_TORTLE',
    'NATURAL_ARMOR_13_DEX',
    'NATURAL_ARMOR_12_DEX',
    'NATURAL_ARMOR_12_CON',
    'DRACONIC_RESILIENCE'
);


--
-- Name: ArmorType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArmorType" AS ENUM (
    'LIGHT',
    'MEDIUM',
    'HEAVY',
    'SHIELD'
);


--
-- Name: BackgroundCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BackgroundCategory" AS ENUM (
    'ACOLYTE',
    'CHARLATAN',
    'CRIMINAL',
    'ENTERTAINER',
    'FOLK_HERO',
    'GUILD_ARTISAN',
    'GUILD_MERCHANT',
    'HERMIT',
    'NOBLE',
    'OUTLANDER',
    'SAGE',
    'SAILOR',
    'SOLDIER',
    'URCHIN',
    'GLADIATOR',
    'KNIGHT',
    'PIRATE',
    'SPY',
    'ANTHROPOLOGIST',
    'ARCHAEOLOGIST',
    'CITY_WATCH',
    'CLAN_CRAFTER',
    'CLOISTERED_SCHOLAR',
    'COURTIER',
    'FACTION_AGENT',
    'FAR_TRAVELER',
    'INHERITOR',
    'INVESTIGATOR',
    'KNIGHT_OF_THE_ORDER',
    'MERCENARY_VETERAN',
    'URBAN_BOUNTY_HUNTER',
    'UTHGARDT_TRIBE_MEMBER',
    'WATERDHAVIAN_NOBLE',
    'FISHER',
    'SHIPWRIGHT',
    'SMUGGLER',
    'MARINE',
    'AZORIUS_FUNCTIONARY',
    'BOROS_LEGIONNAIRE',
    'DIMIR_OPERATIVE',
    'GOLGARI_AGENT',
    'GRUUL_ANARCH',
    'IZZET_ENGINEER',
    'ORZHOV_REPRESENTATIVE',
    'RAKDOS_CULTIST',
    'SELESNYA_INITIATE',
    'SIMIC_SCIENTIST',
    'GRINNER',
    'VOLSTRUCKER_AGENT',
    'ATHLETE',
    'LOREHOLD_STUDENT',
    'PRISMARI_STUDENT',
    'QUANDRIX_STUDENT',
    'SILVERQUILL_STUDENT',
    'WITHERBLOOM_STUDENT',
    'ASTRAL_DRIFTER',
    'FACELESS',
    'FAILED_MERCHANT',
    'FEYLOST',
    'GAMBLER',
    'HAUNTED_ONE',
    'PLAINTIFF',
    'RIVAL_INTERN',
    'WILDSPACER',
    'WITCHLIGHT_HAND',
    'KNIGHT_OF_SOLAMNIA',
    'MAGE_OF_HIGH_SORCERY',
    'HOUSE_AGENT',
    'ARTISAN_2024',
    'CHARLATAN_2024',
    'CRIMINAL_2024',
    'ENTERTAINER_2024',
    'FARMER_2024',
    'GUARD_2024',
    'GUIDE_2024',
    'HERMIT_2024',
    'MERCHANT_2024',
    'NOBLE_2024',
    'SAGE_2024',
    'SAILOR_2024',
    'SCRIBE_2024',
    'SOLDIER_2024',
    'WAYFARER_2024',
    'CUSTOM',
    'REWARDED',
    'RUINED',
    'GIANT_FOUNDLING',
    'RUNE_CARVER',
    'GATE_WARDEN',
    'PLANAR_PHILOSOPHER'
);


--
-- Name: BastionOrder; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BastionOrder" AS ENUM (
    'CRAFT',
    'EMPOWER',
    'HARVEST',
    'MAINTAIN',
    'RECRUIT',
    'RESEARCH',
    'TRADE'
);


--
-- Name: BastionSpace; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BastionSpace" AS ENUM (
    'CRAMPED',
    'ROOMY',
    'VAST'
);


--
-- Name: ChoiceOptionEffectKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChoiceOptionEffectKind" AS ENUM (
    'ASI',
    'SKILL_PROFICIENCY',
    'SKILL_EXPERTISE'
);


--
-- Name: Classes; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Classes" AS ENUM (
    'ARTIFICER_2014',
    'BARBARIAN_2014',
    'BARD_2014',
    'CLERIC_2014',
    'DRUID_2014',
    'FIGHTER_2014',
    'MONK_2014',
    'PALADIN_2014',
    'RANGER_2014',
    'ROGUE_2014',
    'SORCERER_2014',
    'WARLOCK_2014',
    'WIZARD_2014',
    'BARBARIAN_2024',
    'BARD_2024',
    'CLERIC_2024',
    'DRUID_2024',
    'FIGHTER_2024',
    'MONK_2024',
    'PALADIN_2024',
    'RANGER_2024',
    'ROGUE_2024',
    'SORCERER_2024',
    'WARLOCK_2024',
    'WIZARD_2024',
    'ARTIFICER_2024'
);


--
-- Name: DamageType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DamageType" AS ENUM (
    'BLUDGEONING',
    'PIERCING',
    'SLASHING',
    'ACID',
    'COLD',
    'FIRE',
    'LIGHTNING',
    'THUNDER',
    'FORCE',
    'NECROTIC',
    'POISON',
    'PSYCHIC',
    'RADIANT'
);


--
-- Name: DragonbornTypes; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DragonbornTypes" AS ENUM (
    'BLACK',
    'BLUE',
    'BRASS',
    'BRONZE',
    'COPPER',
    'GOLD',
    'GREEN',
    'RED',
    'SILVER',
    'WHITE',
    'AMETHYST',
    'CRYSTAL',
    'EMETALD',
    'SAPPHIRE',
    'TOPAZ'
);


--
-- Name: EquipmentPackCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EquipmentPackCategory" AS ENUM (
    'BURGLARS_PACK',
    'DIPLOMATS_PACK',
    'DUNGEONEERS_PACK',
    'ENTERTAINERS_PACK',
    'EXPLORERS_PACK',
    'PRIESTS_PACK',
    'SCHOLARS_PACK',
    'COMPONENT_POUCH',
    'SPELLBOOK',
    'HOMEBREW'
);


--
-- Name: FeatCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeatCategory" AS ENUM (
    'ORIGIN',
    'GENERAL',
    'FIGHTING_STYLE',
    'EPIC_BOON'
);


--
-- Name: Feats; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Feats" AS ENUM (
    'ALERT',
    'ATHLETE',
    'ACTOR',
    'CHARGER',
    'CROSSBOW_EXPERT',
    'DEFENSIVE_DUELIST',
    'DUAL_WIELDER',
    'DUNGEON_DELVER',
    'DURABLE',
    'ELEMENTAL_ADEPT',
    'GRAPPLER',
    'GREAT_WEAPON_MASTER',
    'HEALER',
    'HEAVILY_ARMORED',
    'HEAVY_ARMOR_MASTER',
    'INSPIRING_LEADER',
    'KEEN_MIND',
    'LIGHTLY_ARMORED',
    'LINGUIST',
    'LUCKY',
    'MAGE_SLAYER',
    'MAGIC_INITIATE',
    'MARTIAL_ADEPT',
    'MEDIUM_ARMOR_MASTER',
    'MOBILE',
    'MODERATELY_ARMORED',
    'MOUNTED_COMBATANT',
    'OBSERVANT',
    'POLEARM_MASTER',
    'RESILIENT',
    'RITUAL_CASTER',
    'SAVAGE_ATTACKER',
    'SENTINEL',
    'SHARPSHOOTER',
    'SHIELD_MASTER',
    'SKILLED',
    'SKULKER',
    'SPELL_SNIPER',
    'TAVERN_BRAWLER',
    'TOUGH',
    'WAR_CASTER',
    'WEAPON_MASTER',
    'BOUNTIFUL_LUCK',
    'DRAGON_FEAR',
    'DRAGON_HIDE',
    'DROW_HIGH_MAGIC',
    'DWARVEN_FORTITUDE',
    'ELVEN_ACCURACY',
    'FADE_AWAY',
    'FEY_TELEPORTATION',
    'FLAMES_OF_PHLEGETHOS',
    'INFERNAL_CONSTITUTION',
    'ORCISH_FURY',
    'PRODIGY',
    'SECOND_CHANCE',
    'SQUAT_NIMBLENESS',
    'WOOD_ELF_MAGIC',
    'ARTIFICER_INITIATE',
    'CHEF',
    'CRUSHER',
    'ELDRITCH_ADEPT',
    'FEY_TOUCHED',
    'FIGHTING_INITIATE',
    'GUNNER',
    'METAMAGIC_ADEPT',
    'PIERCER',
    'POISONER',
    'SHADOW_TOUCHED',
    'SKILL_EXPERT',
    'SLASHER',
    'TELEKINETIC',
    'TELEPATHIC',
    'ABERRANT_DRAGONMARK',
    'GIFT_OF_THE_CHROMATIC_DRAGON',
    'GIFT_OF_THE_GEM_DRAGON',
    'GIFT_OF_THE_METALLIC_DRAGON',
    'STRIKE_OF_THE_GIANTS',
    'EMBER_OF_GIANTS',
    'FURY_OF_GIANTS',
    'GUILE_OF_GIANTS',
    'KEENNESS_OF_GIANTS',
    'SOUL_OF_GIANTS',
    'VIGOR_OF_GIANTS',
    'SQUIRE_OF_SOLAMNIA',
    'INITIATE_OF_HIGH_SORCERY',
    'RUNE_SHAPER',
    'STRIXHAVEN_INITIATE_SILVERQUILL',
    'STRIXHAVEN_INITIATE_WITHERBLOOM',
    'STRIXHAVEN_INITIATE_QUANDRIX',
    'STRIXHAVEN_INITIATE_PRISMARI',
    'STRIXHAVEN_INITIATE_LOREHOLD',
    'SCION_OF_THE_OUTER_PLANES',
    'ABILITY_SCORE_IMPROVEMENT',
    'ARCHERY',
    'BLIND_FIGHTING',
    'DEFENSE',
    'DUELING',
    'GREAT_WEAPON_FIGHTING',
    'INTERCEPTION',
    'PROTECTION',
    'THROWN_WEAPON_FIGHTING',
    'TWO_WEAPON_FIGHTING',
    'UNARMED_FIGHTING',
    'BOON_OF_COMBAT_PROWESS',
    'BOON_OF_DIMENSIONAL_TRAVEL',
    'BOON_OF_ENERGY_RESISTANCE',
    'BOON_OF_FATE',
    'BOON_OF_FORTITUDE',
    'BOON_OF_IRRESISTIBLE_OFFENSE',
    'BOON_OF_RECOVERY',
    'BOON_OF_SKILL',
    'BOON_OF_SPEED',
    'BOON_OF_SPELL_RECALL',
    'BOON_OF_THE_NIGHT_SPIRIT',
    'BOON_OF_TRUESIGHT',
    'CRAFTER',
    'MARTIAL_WEAPON_TRAINING',
    'MUSICIAN',
    'SPEEDY'
);


--
-- Name: FeatureDisplayType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeatureDisplayType" AS ENUM (
    'STANDARD',
    'RESOURCE',
    'ACTION',
    'PASSIVE',
    'TOGGLE',
    'BONUSACTION',
    'FREE',
    'REACTION',
    'CLASS_RESOURCE',
    'HIDDEN',
    'MAGIC_ITEM'
);


--
-- Name: FeatureMechanic; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeatureMechanic" AS ENUM (
    'PASSIVE',
    'CHOICE_SUBCLASS',
    'CHOICE_ASI',
    'CHOICE_SPELLS',
    'CHOICE_EXPERTISE',
    'CHOICE_SPECIFIC',
    'CHOICE_COMPLEX'
);


--
-- Name: InfusionTargetType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InfusionTargetType" AS ENUM (
    'ARMOR',
    'SHIELD',
    'WEAPON',
    'WAND_ROD_STAFF',
    'BOOTS',
    'HELMET',
    'RING',
    'AMMO',
    'GEM_CRYSTAL',
    'ANY'
);


--
-- Name: ItemRarity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ItemRarity" AS ENUM (
    'COMMON',
    'UNCOMMON',
    'RARE',
    'VERY_RARE',
    'LEGENDARY',
    'ARTIFACT'
);


--
-- Name: Language; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Language" AS ENUM (
    'COMMON',
    'DWARVISH',
    'ELVISH',
    'GIANT',
    'GNOMISH',
    'GOBLIN',
    'HALFLING',
    'ORC',
    'ABYSSAL',
    'CELESTIAL',
    'DRACONIC',
    'DEEP_SPEECH',
    'INFERNAL',
    'PRIMORDIAL',
    'SYLVAN',
    'UNDERCOMMON',
    'DRUIDIC',
    'THIEVES_CANT',
    'COMMON_SIGN_LANGUAGE',
    'GRUNG',
    'AQUAN',
    'LOXODON',
    'VEDALKEN',
    'QUORI',
    'LEONIN'
);


--
-- Name: MagicItemType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MagicItemType" AS ENUM (
    'WEAPON',
    'ARMOR',
    'WONDROUS_ITEM',
    'POTION',
    'SCROLL',
    'RING',
    'WAND',
    'ROD',
    'STAFF'
);


--
-- Name: Races; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Races" AS ENUM (
    'AASIMAR_2024',
    'DRAGONBORN_2024',
    'DWARF_2024',
    'ELF_2024',
    'GNOME_2024',
    'GOLIATH_2024',
    'HALFLING_2024',
    'HUMAN_2024',
    'ORC_2024',
    'TIEFLING_2024',
    'DRAGONBORN_2014',
    'DWARF_2014',
    'ELF_2014',
    'GNOME_2014',
    'HALF_ELF_2014',
    'HALF_ORC_2014',
    'HALFLING_2014',
    'HUMAN_2014',
    'TIEFLING_2014',
    'CENTAUR_GGTR',
    'LOXODON_GGTR',
    'MINOTAUR_GGTR',
    'SIMIC_HYBRID_GGTR',
    'VEDALKEN_GGTR',
    'VERDAN_AI',
    'KALASHTAR_EBERRON',
    'WARFORGED_EBERRON',
    'LEONIN_MOOT',
    'SATYR_MOOT',
    'DHAMPIR_VRGTR',
    'HEXBLOOD_VRGTR',
    'REBORN_VRGTR',
    'OWLIN_SACOC',
    'AARAKOCRA_MPMM',
    'AASIMAR_MPMM',
    'BUGBEAR_MPMM',
    'CENTAUR_MPMM',
    'CHANGELING_MPMM',
    'DEEP_GNOME_MPMM',
    'DUERGAR_MPMM',
    'ELADRIN_MPMM',
    'FAIRY_MPMM',
    'FIRBOLG_MPMM',
    'GENASI_AIR_MPMM',
    'GENASI_EARTH_MPMM',
    'GENASI_FIRE_MPMM',
    'GENASI_WATER_MPMM',
    'GITHYANKI_MPMM',
    'GITHZERAI_MPMM',
    'GOBLIN_MPMM',
    'GOLIATH_MPMM',
    'HARENGON_MPMM',
    'HOBGOBLIN_MPMM',
    'KENKU_MPMM',
    'KOBOLD_MPMM',
    'LIZARDFOLK_MPMM',
    'MINOTAUR_MPMM',
    'ORC_MPMM',
    'SATYR_MPMM',
    'SEA_ELF_MPMM',
    'SHADAR_KAI_MPMM',
    'SHIFTER_MPMM',
    'TABAXI_MPMM',
    'TORTLE_MPMM',
    'TRITON_MPMM',
    'YUAN_TI_MPMM',
    'ASTRAL_ELF_SPELLJAMMER',
    'AUTOGNOME_SPELLJAMMER',
    'GIFF_SPELLJAMMER',
    'HADOZEE_SPELLJAMMER',
    'PLASMOID_SPELLJAMMER',
    'THRI_KREEN_SPELLJAMMER',
    'KENDER_DRAGONLANCE',
    'GRUNG_OGA',
    'LOCATHAH_LR',
    'DRAGONBORN_CHROMATIC',
    'DRAGONBORN_METALLIC',
    'DRAGONBORN_GEM',
    'CUSTOM_LINEAGE_TCE'
);


--
-- Name: RestType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RestType" AS ENUM (
    'SHORT_REST',
    'LONG_REST',
    'DAY'
);


--
-- Name: Ruleset; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Ruleset" AS ENUM (
    'RULES_2014',
    'RULES_2024'
);


--
-- Name: Size; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Size" AS ENUM (
    'TINY',
    'SMALL',
    'MEDIUM',
    'LARGE',
    'HUGE',
    'GARGANTUAN'
);


--
-- Name: SkillProficiencyType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SkillProficiencyType" AS ENUM (
    'NONE',
    'HALF',
    'PROFICIENT',
    'EXPERTISE'
);


--
-- Name: Skills; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Skills" AS ENUM (
    'ATHLETICS',
    'ACROBATICS',
    'SLEIGHT_OF_HAND',
    'STEALTH',
    'ARCANA',
    'HISTORY',
    'INVESTIGATION',
    'NATURE',
    'RELIGION',
    'ANIMAL_HANDLING',
    'INSIGHT',
    'MEDICINE',
    'PERCEPTION',
    'SURVIVAL',
    'DECEPTION',
    'INTIMIDATION',
    'PERFORMANCE',
    'PERSUASION'
);


--
-- Name: Source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Source" AS ENUM (
    'PHB',
    'DMG',
    'MM',
    'XGTE',
    'TCOE',
    'FTOD',
    'EGTW',
    'SCAG',
    'GGTR',
    'AI',
    'IDROTF',
    'SPELLJAMMER',
    'COS',
    'BGDIA',
    'VGTM',
    'MTOF',
    'MPMM',
    'BPGOTG',
    'VRGTR',
    'MOOT',
    'SACOC',
    'WBTW',
    'EBERRON',
    'DRAGONLANCE',
    'PHB_2024',
    'DMG_2024',
    'MM_2024',
    'OGA',
    'LR',
    'BOMT',
    'PAITM',
    'ESSENTIALS_KIT',
    'WDH',
    'TOD',
    'VEOR',
    'DDB',
    'AL',
    'DRAGON_MAG',
    'TOA',
    'SKT',
    'CM',
    'WDMM',
    'QFTIS',
    'POTA',
    'CHAINS_OF_ASMODEUS',
    'HOMEBREW',
    'SCC',
    'LLK',
    'AAG',
    'SatO',
    'AitFR-AVT',
    'FRAiF',
    'RHW'
);


--
-- Name: SpellOrigin; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SpellOrigin" AS ENUM (
    'CLASS',
    'RACE',
    'FEAT',
    'MANUAL',
    'ITEM'
);


--
-- Name: SpellSchool; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SpellSchool" AS ENUM (
    'ABJURATION',
    'CONJURATION',
    'DIVINATION',
    'ENCHANTMENT',
    'EVOCATION',
    'ILLUSION',
    'NECROMANCY',
    'TRANSMUTATION'
);


--
-- Name: SpellcastingType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SpellcastingType" AS ENUM (
    'NONE',
    'FULL',
    'HALF',
    'THIRD',
    'PACT'
);


--
-- Name: Subclasses; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Subclasses" AS ENUM (
    'ALCHEMIST',
    'ARMORER',
    'ARTILLERIST',
    'BATTLE_SMITH',
    'PATH_OF_THE_ANCESTRAL_GUARDIAN',
    'PATH_OF_THE_BATTLERAGER',
    'PATH_OF_THE_BEAST',
    'PATH_OF_THE_BERSERKER',
    'PATH_OF_THE_GIANT',
    'PATH_OF_THE_STORM_HERALD',
    'PATH_OF_THE_TOTEM_WARRIOR',
    'PATH_OF_WILD_MAGIC',
    'PATH_OF_THE_ZEALOT',
    'COLLEGE_OF_CREATION',
    'COLLEGE_OF_ELOQUENCE',
    'COLLEGE_OF_GLAMOUR',
    'COLLEGE_OF_LORE',
    'COLLEGE_OF_SPIRITS',
    'COLLEGE_OF_SWORDS',
    'COLLEGE_OF_VALOR',
    'COLLEGE_OF_WHISPERS',
    'ARCANA_DOMAIN',
    'DEATH_DOMAIN',
    'FORGE_DOMAIN',
    'GRAVE_DOMAIN',
    'KNOWLEDGE_DOMAIN',
    'LIFE_DOMAIN',
    'LIGHT_DOMAIN',
    'NATURE_DOMAIN',
    'ORDER_DOMAIN',
    'PEACE_DOMAIN',
    'TEMPEST_DOMAIN',
    'TRICKERY_DOMAIN',
    'TWILIGHT_DOMAIN',
    'WAR_DOMAIN',
    'CIRCLE_OF_DREAMS',
    'CIRCLE_OF_THE_LAND',
    'CIRCLE_OF_THE_MOON',
    'CIRCLE_OF_THE_SHEPHERD',
    'CIRCLE_OF_SPORES',
    'CIRCLE_OF_STARS',
    'CIRCLE_OF_WILDFIRE',
    'ARCANE_ARCHER',
    'BANNERET',
    'BATTLE_MASTER',
    'CAVALIER',
    'CHAMPION',
    'ECHO_KNIGHT',
    'ELDRITCH_KNIGHT',
    'PSI_WARRIOR',
    'RUNE_KNIGHT',
    'SAMURAI',
    'WAY_OF_MERCY',
    'WAY_OF_THE_ASCENDANT_DRAGON',
    'WAY_OF_THE_ASTRAL_SELF',
    'WAY_OF_THE_DRUNKEN_MASTER',
    'WAY_OF_THE_FOUR_ELEMENTS',
    'WAY_OF_THE_KENSEI',
    'WAY_OF_THE_LONG_DEATH',
    'WAY_OF_THE_OPEN_HAND',
    'WAY_OF_SHADOW',
    'WAY_OF_THE_SUN_SOUL',
    'OATH_OF_THE_ANCIENTS',
    'OATH_OF_CONQUEST',
    'OATH_OF_THE_CROWN',
    'OATH_OF_DEVOTION',
    'OATH_OF_GLORY',
    'OATH_OF_REDEMPTION',
    'OATH_OF_VENGEANCE',
    'OATH_OF_THE_WATCHERS',
    'OATHBREAKER',
    'BEAST_MASTER_CONCLAVE',
    'DRAKEWARDEN',
    'FEY_WANDERER',
    'GLOOM_STALKER_CONCLAVE',
    'HORIZON_WALKER_CONCLAVE',
    'HUNTER_CONCLAVE',
    'MONSTER_SLAYER_CONCLAVE',
    'SWARMKEEPER',
    'ARCANE_TRICKSTER',
    'ASSASSIN',
    'INQUISITIVE',
    'MASTERMIND',
    'PHANTOM',
    'SCOUT',
    'SOULKNIFE',
    'SWASHBUCKLER',
    'THIEF',
    'ABERRANT_MIND',
    'CLOCKWORK_SOUL',
    'DRACONIC_BLOODLINE',
    'DIVINE_SOUL',
    'LUNAR_SORCERY',
    'SHADOW_MAGIC',
    'STORM_SORCERY',
    'WILD_MAGIC',
    'ARCHFEY',
    'CELESTIAL',
    'FATHOMLESS',
    'FIEND',
    'THE_GENIE',
    'GREAT_OLD_ONE',
    'HEXBLADE',
    'UNDEAD',
    'UNDYING',
    'SCHOOL_OF_ABJURATION',
    'SCHOOL_OF_BLADESINGING',
    'SCHOOL_OF_CHRONURGY',
    'SCHOOL_OF_CONJURATION',
    'SCHOOL_OF_DIVINATION',
    'SCHOOL_OF_ENCHANTMENT',
    'SCHOOL_OF_EVOCATION',
    'SCHOOL_OF_GRAVITURGY',
    'SCHOOL_OF_ILLUSION',
    'SCHOOL_OF_NECROMANCY',
    'ORDER_OF_SCRIBES',
    'SCHOOL_OF_TRANSMUTATION',
    'SCHOOL_OF_WAR_MAGIC',
    'PATH_OF_THE_WILD_HEART',
    'PATH_OF_THE_WORLD_TREE',
    'COLLEGE_OF_DANCE',
    'CIRCLE_OF_THE_SEA',
    'CIRCLE_OF_THE_STARS',
    'WARRIOR_OF_MERCY',
    'WARRIOR_OF_SHADOW',
    'WARRIOR_OF_THE_ELEMENTS',
    'WARRIOR_OF_THE_OPEN_HAND',
    'BEAST_MASTER',
    'GLOOM_STALKER',
    'HUNTER',
    'ABERRANT_SORCERY',
    'CLOCKWORK_SORCERY',
    'DRACONIC_SORCERY',
    'WILD_MAGIC_SORCERY',
    'ARCHFEY_PATRON',
    'CELESTIAL_PATRON',
    'FIEND_PATRON',
    'GREAT_OLD_ONE_PATRON',
    'ABJURER',
    'DIVINER',
    'EVOKER',
    'ILLUSIONIST',
    'BLADESINGER',
    'CARTOGRAPHER',
    'COLLEGE_OF_THE_MOON',
    'CONJURER',
    'ENCHANTER',
    'HOLLOW_WARDEN',
    'NECROMANCER',
    'OATH_OF_THE_NOBLE_GENIES',
    'REANIMATOR',
    'SCION_OF_THE_THREE',
    'SHADOW_SORCERY',
    'SPELLFIRE_SORCERY',
    'TRANSMUTER',
    'UNDEAD_PATRON',
    'VESTIGE_PATRON',
    'WARRIOR_OF_THE_MYSTIC_ARTS',
    'WINTER_WALKER'
);


--
-- Name: Subraces; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Subraces" AS ENUM (
    'DWARF_HILL_2014',
    'DWARF_MOUNTAIN_2014',
    'DWARF_DUERGAR_GRAY_SCAG',
    'ELF_HIGH_2014',
    'ELF_WOOD_2014',
    'ELF_DARK_DROW_2014',
    'ELF_ELADRIN_DMG',
    'ELF_ELADRIN_MPMM',
    'ELF_SHADAR_KAI_MPMM',
    'ELF_SEA_MTOF',
    'ELF_PALLID_EGTW',
    'GNOME_FOREST_2014',
    'GNOME_ROCK_2014',
    'GNOME_DEEP_SCAG',
    'HALFLING_LIGHTFOOT_2014',
    'HALFLING_STOUT_2014',
    'HALFLING_GHOSTWISE_SCAG',
    'DRAGONBORN_BLACK',
    'DRAGONBORN_BLUE',
    'DRAGONBORN_BRASS',
    'DRAGONBORN_BRONZE',
    'DRAGONBORN_COPPER',
    'DRAGONBORN_GOLD',
    'DRAGONBORN_GREEN',
    'DRAGONBORN_RED',
    'DRAGONBORN_SILVER',
    'DRAGONBORN_WHITE',
    'DRAGONBORN_DRACONBLOOD',
    'DRAGONBORN_RAVENITE',
    'AASIMAR_PROTECTOR',
    'AASIMAR_SCOURGE',
    'AASIMAR_FALLEN',
    'SHIFTER_BEASTHIDE',
    'SHIFTER_LONGTOOTH',
    'SHIFTER_SWIFTSTRIDE',
    'SHIFTER_WILDHUNT'
);


--
-- Name: ToolCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ToolCategory" AS ENUM (
    'ARTISAN_TOOLS',
    'DICE_SET',
    'DRAGONCHESS_SET',
    'PLAYING_CARD_SET',
    'THREE_DRAGON_ANTE_SET',
    'GAMING_SET',
    'MUSICAL_INSTRUMENT',
    'DISGUISE_KIT',
    'FORGERY_KIT',
    'HERBALISM_KIT',
    'NAVIGATORS_TOOLS',
    'POISONERS_KIT',
    'THIEVES_TOOLS',
    'JEWELERS_TOOLS',
    'FISHING_TACKLE',
    'CARTOGRAPHERS_TOOLS',
    'VEHICLES_LAND',
    'VEHICLES_WATER',
    'SMITHS_TOOLS',
    'BREWERS_SUPPLIES',
    'CALLIGRAPHERS_SUPPLIES',
    'ALCHEMISTS_SUPPLIES',
    'CARPENTERS_TOOLS',
    'COBBLERS_TOOLS',
    'COOKS_UTENSILS',
    'GLASSBLOWERS_TOOLS',
    'LEATHERWORKERS_TOOLS',
    'MASONS_TOOLS',
    'PAINTERS_SUPPLIES',
    'POTTERS_TOOLS',
    'TINKERS_TOOLS',
    'WEAVERS_TOOLS',
    'WOODCARVERS_TOOLS',
    'BAGPIPES',
    'DRUM',
    'DULCIMER',
    'FLUTE',
    'HORN',
    'LUTE',
    'LYRE',
    'PAN_FLUTE',
    'SHAWM',
    'VIOL'
);


--
-- Name: Variants; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Variants" AS ENUM (
    'HALF_ELF_VARIANT_HIGH_DESCENT_SCAG',
    'HALF_ELF_VARIANT_WOOD_DESCENT_SCAG',
    'HALF_ELF_VARIANT_DROW_DESCENT_SCAG',
    'HALF_ELF_VARIANT_AQUATIC_DESCENT_SCAG',
    'HALF_ELF_VARIANT',
    'TIEFLING_VARIANT_FERAL_SCAG',
    'TIEFLING_VARIANT_DEVILS_TONGUE_SCAG',
    'TIEFLING_VARIANT_HELLFIRE_SCAG',
    'TIEFLING_VARIANT_WINGED_SCAG',
    'TIEFLING_ASMODEUS',
    'TIEFLING_BAALZEBUL',
    'TIEFLING_DISPATER',
    'TIEFLING_FIERNA',
    'TIEFLING_GLASYA',
    'TIEFLING_LEVISTUS',
    'TIEFLING_MAMMON',
    'TIEFLING_MEPHISTOPHELES',
    'TIEFLING_ZARIEL',
    'HUMAN_VARIANT',
    'HALF_ELF_MARK_OF_DETECTION_EBERRON',
    'HALF_ELF_MARK_OF_STORM_EBERRON',
    'DWARF_MARK_OF_WARDING_EBERRON',
    'HALFLING_MARK_OF_HEALING_EBERRON',
    'HALFLING_MARK_OF_HOSPITALITY_EBERRON',
    'GNOME_MARK_OF_SCRIBING_EBERRON',
    'HUMAN_MARK_OF_FINDING_EBERRON',
    'HUMAN_MARK_OF_HANDLING_EBERRON',
    'HUMAN_MARK_OF_MAKING_EBERRON',
    'HUMAN_MARK_OF_PASSAGE_EBERRON',
    'HUMAN_MARK_OF_SENTINEL_EBERRON',
    'ELF_MARK_OF_SHADOW_EBERRON',
    'HALF_ORC_MARK_OF_FINDING_EBERRON'
);


--
-- Name: WeaponCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WeaponCategory" AS ENUM (
    'CLUB',
    'DAGGER',
    'GREATCLUB',
    'HANDAXE',
    'JAVELIN',
    'LIGHT_HAMMER',
    'MACE',
    'QUARTERSTAFF',
    'SICKLE',
    'SPEAR',
    'UNARMED_STRIKE',
    'LIGHT_CROSSBOW',
    'DART',
    'SHORTBOW',
    'SLING',
    'BATTLEAXE',
    'FLAIL',
    'GLAIVE',
    'GREATAXE',
    'GREATSWORD',
    'HALBERD',
    'LANCE',
    'LONGSWORD',
    'MAUL',
    'MORNINGSTAR',
    'PIKE',
    'RAPIER',
    'SCIMITAR',
    'SHORTSWORD',
    'TRIDENT',
    'WAR_PICK',
    'WARHAMMER',
    'WHIP',
    'BLOWGUN',
    'HAND_CROSSBOW',
    'HEAVY_CROSSBOW',
    'LONGBOW',
    'NET',
    'HOMEBREW',
    'PISTOL_RENAISSANCE',
    'MUSKET',
    'PISTOL_AUTOMATIC',
    'REVOLVER',
    'RIFLE_HUNTING',
    'RIFLE_AUTOMATIC',
    'SHOTGUN',
    'LASER_PISTOL',
    'ANTIMATTER_RIFLE',
    'LASER_RIFLE',
    'PISTOL'
);


--
-- Name: WeaponMastery; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WeaponMastery" AS ENUM (
    'CLEAVE',
    'GRAZE',
    'NICK',
    'PUSH',
    'SAP',
    'SLOW',
    'TOPPLE',
    'VEX'
);


--
-- Name: WeaponProperty; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WeaponProperty" AS ENUM (
    'FINESSE',
    'VERSATILE',
    'LIGHT',
    'HEAVY',
    'REACH',
    'TWO_HANDED',
    'THROWN',
    'AMMUNITION',
    'LOADING',
    'SPECIAL',
    'MAGIC_WEAPON',
    'RELOAD',
    'BURST_FIRE'
);


--
-- Name: WeaponType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WeaponType" AS ENUM (
    'SIMPLE_WEAPON',
    'MARTIAL_WEAPON',
    'FIREARMS'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: choice_option_feature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.choice_option_feature (
    option_feature_id integer NOT NULL,
    option_id integer NOT NULL,
    feature_id integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: ChoiceOptionFeature_option_feature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ChoiceOptionFeature_option_feature_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ChoiceOptionFeature_option_feature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ChoiceOptionFeature_option_feature_id_seq" OWNED BY public.choice_option_feature.option_feature_id;


--
-- Name: _BackgroundToFeat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_BackgroundToFeat" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _ChoiceOptionToClassOptionalFeature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_ChoiceOptionToClassOptionalFeature" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _ChoiceOptionToPers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_ChoiceOptionToPers" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _ClassOptionalFeatureToPers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_ClassOptionalFeatureToPers" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _FeatGrantsFeature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_FeatGrantsFeature" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _FeatureToSpell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_FeatureToSpell" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _MagicItemToSpell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_MagicItemToSpell" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _PersToRaceChoiceOption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_PersToRaceChoiceOption" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _PersToRaceVariant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_PersToRaceVariant" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _PersToSpell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_PersToSpell" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _RaceVariantReplacingFeature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_RaceVariantReplacingFeature" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _SubclassExpandedSpells; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_SubclassExpandedSpells" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: _SubraceReplacingFeature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_SubraceReplacingFeature" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    account_id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


--
-- Name: account_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_account_id_seq OWNED BY public.account.account_id;


--
-- Name: armor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.armor (
    armor_id integer NOT NULL,
    name public."ArmorCategory" NOT NULL,
    armor_type public."ArmorType" NOT NULL,
    base_ac integer NOT NULL,
    strength_req integer,
    stealth_disadvantage boolean DEFAULT false NOT NULL,
    ability_bonuses public."Ability"[] DEFAULT ARRAY['DEX'::public."Ability"],
    ability_bonus_type public."AbilityBonusType" DEFAULT 'FULL'::public."AbilityBonusType" NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: armor_armor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.armor_armor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: armor_armor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.armor_armor_id_seq OWNED BY public.armor.armor_id;


--
-- Name: background; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.background (
    background_id integer NOT NULL,
    name public."BackgroundCategory" NOT NULL,
    source public."Source" DEFAULT 'PHB'::public."Source" NOT NULL,
    tool_proficiencies public."ToolCategory"[] DEFAULT ARRAY[]::public."ToolCategory"[],
    languages_to_choose_count integer DEFAULT 0 NOT NULL,
    items jsonb,
    description text,
    "specialAbilityName" text,
    skill_proficiencies jsonb,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    ability_options public."Ability"[] DEFAULT '{}'::public."Ability"[] NOT NULL,
    origin_feat_id integer,
    grants_gold_instead integer
);


--
-- Name: background_background_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.background_background_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: background_background_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.background_background_id_seq OWNED BY public.background.background_id;


--
-- Name: choice_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.choice_option (
    option_id integer NOT NULL,
    group_name character varying(100) NOT NULL,
    option_name character varying(100) NOT NULL,
    option_name_eng character varying(100) NOT NULL,
    prerequisites jsonb,
    effect_ability public."Ability",
    effect_amount integer,
    effect_kind public."ChoiceOptionEffectKind",
    effect_skill public."Skills",
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: choice_option_option_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.choice_option_option_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: choice_option_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.choice_option_option_id_seq OWNED BY public.choice_option.option_id;


--
-- Name: class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class (
    class_id integer NOT NULL,
    hit_die integer NOT NULL,
    primary_casting_stat public."Ability",
    spellcasting_type public."SpellcastingType" DEFAULT 'NONE'::public."SpellcastingType" NOT NULL,
    ability_score_up_levels integer[] DEFAULT ARRAY[4, 8, 12, 16, 19],
    subclass_level integer DEFAULT 3 NOT NULL,
    armor_proficiencies public."ArmorType"[] DEFAULT ARRAY[]::public."ArmorType"[],
    saving_throws public."Ability"[],
    tool_proficiencies public."ToolCategory"[] DEFAULT ARRAY[]::public."ToolCategory"[],
    languages_to_choose_count integer DEFAULT 0 NOT NULL,
    languages public."Language"[] DEFAULT ARRAY[]::public."Language"[],
    special_spell_slot_progression jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    skill_proficiencies jsonb,
    tool_to_choose_count integer,
    weapon_proficiencies jsonb,
    eng_name public."Classes" NOT NULL,
    "multiclassReqs" jsonb NOT NULL,
    weapon_proficiencies_special jsonb,
    sort_order integer DEFAULT 999 NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    epic_boon_level integer,
    weapon_mastery_progression integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
    description text
);


--
-- Name: COLUMN class.weapon_mastery_progression; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.class.weapon_mastery_progression IS 'Weapon Mastery capacity за рівнем КЛАСУ: індекс 1 відповідає рівню 1, індекс 20 — рівню 20. Порожній масив означає, що клас не дає майстерності.';


--
-- Name: COLUMN class.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.class.description IS 'Коротка вступна проза класу для каталогу (≈145 слів). NULL — опису немає.';


--
-- Name: class_choice_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_choice_option (
    option_id integer NOT NULL,
    choice_option_id integer NOT NULL,
    class_id integer NOT NULL,
    levels_granted integer[],
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: class_choice_option_option_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.class_choice_option_option_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: class_choice_option_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.class_choice_option_option_id_seq OWNED BY public.class_choice_option.option_id;


--
-- Name: class_class_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.class_class_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: class_class_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.class_class_id_seq OWNED BY public.class.class_id;


--
-- Name: class_feature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_feature (
    class_feature_id integer NOT NULL,
    class_id integer NOT NULL,
    feature_id integer NOT NULL,
    level_granted integer NOT NULL,
    grants_spell_slots boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    mechanic_description text,
    mechanic_metadata jsonb,
    mechanic_type public."FeatureMechanic" DEFAULT 'PASSIVE'::public."FeatureMechanic" NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: class_feature_class_feature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.class_feature_class_feature_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: class_feature_class_feature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.class_feature_class_feature_id_seq OWNED BY public.class_feature.class_feature_id;


--
-- Name: class_optional_feature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_optional_feature (
    option_feature_id integer NOT NULL,
    feature_id integer,
    class_id integer NOT NULL,
    "grantedOnLevels" integer[],
    "replacesFightingStyle" boolean,
    "replacesManeuver" boolean,
    replaces_invocation boolean,
    title character varying(100),
    prerequisites jsonb,
    seed_index integer DEFAULT 0 NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: class_optional_feature_option_feature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.class_optional_feature_option_feature_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: class_optional_feature_option_feature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.class_optional_feature_option_feature_id_seq OWNED BY public.class_optional_feature.option_feature_id;


--
-- Name: class_optional_feature_replaces_feature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_optional_feature_replaces_feature (
    class_optional_feature_id integer NOT NULL,
    replaced_feature_id integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: class_starting_equipment_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_starting_equipment_option (
    option_id integer NOT NULL,
    class_id integer NOT NULL,
    choice_group integer NOT NULL,
    option character(1) NOT NULL,
    weapon_id integer,
    armor_id integer,
    equipment_pack_id integer,
    quantity integer DEFAULT 1 NOT NULL,
    choose_any_armor boolean DEFAULT false NOT NULL,
    armor_type public."ArmorType",
    choose_any_weapon boolean DEFAULT false NOT NULL,
    weapon_type public."WeaponType",
    weapon_count integer DEFAULT 1 NOT NULL,
    description text,
    item text,
    seed_index integer DEFAULT 0 NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: class_starting_equipment_option_option_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.class_starting_equipment_option_option_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: class_starting_equipment_option_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.class_starting_equipment_option_option_id_seq OWNED BY public.class_starting_equipment_option.option_id;


--
-- Name: content_comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_comment (
    content_comment_id integer NOT NULL,
    target character varying(300) NOT NULL,
    user_id integer NOT NULL,
    parent_comment_id integer,
    body text NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(3) without time zone,
    CONSTRAINT content_comment_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 5000)))
);


--
-- Name: content_comment_content_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.content_comment_content_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: content_comment_content_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.content_comment_content_comment_id_seq OWNED BY public.content_comment.content_comment_id;


--
-- Name: content_comment_vote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_comment_vote (
    content_comment_id integer NOT NULL,
    user_id integer NOT NULL,
    value smallint NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT content_comment_vote_value_check CHECK ((value = ANY (ARRAY['-1'::integer, 1])))
);


--
-- Name: content_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_report (
    content_report_id integer NOT NULL,
    target character varying(300) NOT NULL,
    content_comment_id integer,
    reporter_user_id integer NOT NULL,
    reason character varying(16) NOT NULL,
    details text,
    status character varying(16) DEFAULT 'OPEN'::character varying NOT NULL,
    resolved_by_user_id integer,
    resolved_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT content_report_details_check CHECK ((char_length(details) <= 1000)),
    CONSTRAINT content_report_reason_check CHECK (((reason)::text = ANY ((ARRAY['SPAM'::character varying, 'OFFENSIVE'::character varying, 'COPYRIGHT'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT content_report_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'RESOLVED'::character varying, 'DISMISSED'::character varying])::text[])))
);


--
-- Name: content_report_content_report_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.content_report_content_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: content_report_content_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.content_report_content_report_id_seq OWNED BY public.content_report.content_report_id;


--
-- Name: content_vote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_vote (
    target character varying(300) NOT NULL,
    user_id integer NOT NULL,
    value smallint NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT content_vote_value_check CHECK ((value = ANY (ARRAY['-1'::integer, 1])))
);


--
-- Name: creature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creature (
    creature_id integer NOT NULL,
    name character varying,
    name_eng character varying,
    size character varying,
    type character varying,
    alignment character varying,
    source public."Source" DEFAULT 'MM'::public."Source" NOT NULL,
    ac character varying,
    hp character varying,
    speed character varying,
    strength character varying,
    dexterity character varying,
    constitution character varying,
    intelligence character varying,
    wisdom character varying,
    charisma character varying,
    skills character varying,
    senses character varying,
    languages character varying,
    challenge character varying,
    damage_immunity character varying,
    damage_resistance character varying,
    condition_immunity character varying,
    saving_throws character varying,
    special_abilities character varying,
    actions character varying,
    reactions character varying,
    legendary_actions character varying,
    proficiency_bonus character varying,
    description character varying,
    lair_actions character varying,
    lair_info character varying,
    region_effects character varying,
    xp character varying,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    initiative character varying,
    gear character varying,
    bonus_actions character varying,
    damage_vulnerability character varying,
    xp_in_lair character varying,
    image_url character varying
);


--
-- Name: COLUMN creature.initiative; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creature.initiative IS 'Статблок 2024: «+7 (17)». У 2014 порожнє.';


--
-- Name: COLUMN creature.gear; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creature.gear IS 'Статблок 2024: спорядження істоти. У 2014 порожнє.';


--
-- Name: COLUMN creature.bonus_actions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creature.bonus_actions IS 'Статблок 2024: секція «Бонусні дії», HTML як і решта секцій.';


--
-- Name: COLUMN creature.damage_vulnerability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creature.damage_vulnerability IS 'Вразливість до ушкоджень. Є в обох редакціях, колонки бракувало з самого початку.';


--
-- Name: COLUMN creature.xp_in_lair; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creature.xp_in_lair IS 'Друге число CR 2024: «or 7,200 in lair».';


--
-- Name: COLUMN creature.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creature.image_url IS 'Картинка істоти. Заповнюється в KR12.4.';


--
-- Name: creature_creature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.creature_creature_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: creature_creature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.creature_creature_id_seq OWNED BY public.creature.creature_id;


--
-- Name: equipment_pack; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment_pack (
    equipment_pack_id integer NOT NULL,
    name public."EquipmentPackCategory" NOT NULL,
    description text NOT NULL,
    items jsonb NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: equipment_pack_equipment_pack_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipment_pack_equipment_pack_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipment_pack_equipment_pack_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipment_pack_equipment_pack_id_seq OWNED BY public.equipment_pack.equipment_pack_id;


--
-- Name: feat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feat (
    feat_id integer NOT NULL,
    short_description text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text NOT NULL,
    eng_name text NOT NULL,
    granted_armor_proficiencies public."ArmorType"[] DEFAULT ARRAY[]::public."ArmorType"[],
    granted_asi jsonb,
    granted_language_count integer DEFAULT 0 NOT NULL,
    granted_languages public."Language"[] DEFAULT ARRAY[]::public."Language"[],
    granted_skill_count integer DEFAULT 0 NOT NULL,
    granted_skills jsonb,
    granted_tool_proficiencies jsonb,
    granted_weapon_proficiencies jsonb,
    prerequisite_ability_score jsonb,
    prerequisite_feat text,
    prerequisite_level integer,
    prerequisite_proficiency jsonb,
    prerequisite_spellcasting boolean DEFAULT false NOT NULL,
    race_restriction public."Races"[] DEFAULT ARRAY[]::public."Races"[],
    source public."Source" DEFAULT 'PHB'::public."Source" NOT NULL,
    subrace_restriction public."Subraces"[] DEFAULT ARRAY[]::public."Subraces"[],
    updated_at timestamp(3) without time zone NOT NULL,
    name public."Feats" NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    category public."FeatCategory",
    is_repeatable boolean DEFAULT false NOT NULL
);


--
-- Name: feat_choice_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feat_choice_option (
    option_id integer NOT NULL,
    feat_id integer NOT NULL,
    choice_option_id integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: feat_choice_option_option_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feat_choice_option_option_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feat_choice_option_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feat_choice_option_option_id_seq OWNED BY public.feat_choice_option.option_id;


--
-- Name: feat_feat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feat_feat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feat_feat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feat_feat_id_seq OWNED BY public.feat.feat_id;


--
-- Name: feature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature (
    feature_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    short_description text,
    limited_uses_per public."RestType",
    uses_count integer,
    display_type public."FeatureDisplayType"[] NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    eng_name character varying(100) NOT NULL,
    uses_count_special jsonb,
    uses_count_depends_on_proficiency_bonus boolean DEFAULT false NOT NULL,
    modifies_ac jsonb,
    skill_proficiencies jsonb,
    saving_throws public."Ability"[],
    languages_to_choose_count integer DEFAULT 0 NOT NULL,
    skill_expertises jsonb,
    invocations_count integer,
    bonus_to_attack_roll integer,
    bonus_to_melee_damage integer,
    bonus_to_ranged_attack_roll integer,
    bonus_to_ranged_damage integer,
    bonus_to_saving_throws jsonb,
    gives_ac integer,
    gives_maneuvres boolean DEFAULT false,
    modified_unarmed boolean,
    no_armor_or_shield_for_ac_bonus boolean,
    superiority_dice_count integer,
    thrown_damage_boost integer,
    unarmed_damage text,
    gives_con integer,
    gives_str integer,
    requires_armor_for_ac_bonus boolean,
    bonus_to_melee_one_handed_weapon_damage integer,
    gives_languages public."Language"[] DEFAULT ARRAY[]::public."Language"[],
    uses_pool_key character varying(50),
    use_price integer DEFAULT 1 NOT NULL,
    armor_proficiencies public."ArmorType"[] DEFAULT ARRAY[]::public."ArmorType"[],
    weapon_proficiencies jsonb,
    weapon_proficiencies_special jsonb,
    tool_proficiencies public."ToolCategory"[] DEFAULT ARRAY[]::public."ToolCategory"[],
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    bonus_hit_points_per_level integer,
    speed_bonus integer,
    initiative_proficiency boolean,
    bonus_hit_points integer,
    damage_resistances public."DamageType"[] DEFAULT ARRAY[]::public."DamageType"[] NOT NULL,
    darkvision_range integer
);


--
-- Name: COLUMN feature.bonus_hit_points_per_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.feature.bonus_hit_points_per_level IS 'Скільки максимальних хітів фіча додає за кожен рівень персонажа. NULL — не додає.';


--
-- Name: COLUMN feature.damage_resistances; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.feature.damage_resistances IS 'Типи шкоди, до яких активна риса дає опір. Порожній масив — опору немає.';


--
-- Name: COLUMN feature.darkvision_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.feature.darkvision_range IS 'Дальність Темнозору, яку дає активна риса, у футах. NULL — Темнозір не надається.';


--
-- Name: feature_feature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_feature_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_feature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_feature_id_seq OWNED BY public.feature.feature_id;


--
-- Name: fighting_style; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fighting_style (
    id integer NOT NULL,
    name text NOT NULL,
    eng_name text NOT NULL,
    description text NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: fighting_style_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fighting_style_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fighting_style_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fighting_style_id_seq OWNED BY public.fighting_style.id;


--
-- Name: homebrew_creature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homebrew_creature (
    homebrew_entry_id integer NOT NULL,
    eng_name character varying(255),
    size character varying(64) NOT NULL,
    type character varying(128) NOT NULL,
    challenge character varying(32) NOT NULL,
    stat_block jsonb NOT NULL
);


--
-- Name: homebrew_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homebrew_entry (
    homebrew_entry_id integer NOT NULL,
    kind character varying(16) NOT NULL,
    author_user_id integer NOT NULL,
    ruleset public."Ruleset",
    name character varying(255) NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(3) without time zone,
    CONSTRAINT homebrew_entry_kind_check CHECK (((kind)::text = ANY ((ARRAY['SPELL'::character varying, 'CREATURE'::character varying])::text[])))
);


--
-- Name: homebrew_entry_homebrew_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.homebrew_entry_homebrew_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: homebrew_entry_homebrew_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.homebrew_entry_homebrew_entry_id_seq OWNED BY public.homebrew_entry.homebrew_entry_id;


--
-- Name: homebrew_spell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homebrew_spell (
    homebrew_entry_id integer NOT NULL,
    eng_name character varying(255),
    level integer NOT NULL,
    school character varying(255) NOT NULL,
    casting_time character varying(255) NOT NULL,
    range character varying(255) NOT NULL,
    components character varying(500) NOT NULL,
    duration character varying(255) NOT NULL,
    is_ritual boolean DEFAULT false NOT NULL,
    is_concentration boolean DEFAULT false NOT NULL,
    classes public."Classes"[] DEFAULT '{}'::public."Classes"[] NOT NULL,
    description text NOT NULL,
    CONSTRAINT homebrew_spell_level_check CHECK (((level >= 0) AND (level <= 9)))
);


--
-- Name: infusion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.infusion (
    infusion_id integer NOT NULL,
    name character varying(120) NOT NULL,
    eng_name character varying(120) NOT NULL,
    min_artificer_level integer DEFAULT 1 NOT NULL,
    target_type public."InfusionTargetType" NOT NULL,
    requires_attunement boolean DEFAULT false NOT NULL,
    bonus_to_attack_roll integer,
    bonus_to_damage integer,
    spell_attack_bonus integer,
    speed_bonus integer,
    charges integer,
    recharge_dice text,
    restores_spell_slot_upto_level integer,
    increases_at_level10_by integer,
    replicated_magic_item_id integer,
    creates_homunculus boolean,
    feature_id integer,
    bonus_to_ac integer,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: infusion_infusion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.infusion_infusion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: infusion_infusion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.infusion_infusion_id_seq OWNED BY public.infusion.infusion_id;


--
-- Name: magic_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_item (
    magic_item_id integer NOT NULL,
    name character varying(100) NOT NULL,
    item_type public."MagicItemType" NOT NULL,
    rarity public."ItemRarity" NOT NULL,
    requires_attunement boolean DEFAULT false NOT NULL,
    eng_name character varying(100) NOT NULL,
    description text NOT NULL,
    short_description text,
    weapon_proficiencies jsonb,
    weapon_proficiencies_special jsonb,
    bonus_to_ac integer,
    bonus_to_ranged_damage integer,
    bonus_to_saving_throws jsonb,
    no_armor_or_shield_for_ac_bonus boolean,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: magic_item_magic_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.magic_item_magic_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: magic_item_magic_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.magic_item_magic_item_id_seq OWNED BY public.magic_item.magic_item_id;


--
-- Name: pers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers (
    pers_id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    current_spell_slots integer[] DEFAULT ARRAY[]::integer[],
    class_id integer NOT NULL,
    subclass_id integer,
    background_id integer NOT NULL,
    race_id integer NOT NULL,
    subrace_id integer,
    current_hp integer NOT NULL,
    max_hp integer NOT NULL,
    temp_hp integer DEFAULT 0 NOT NULL,
    race_custom character varying(100) DEFAULT ''::character varying NOT NULL,
    class_custom character varying(100) DEFAULT ''::character varying NOT NULL,
    alignment character varying(100) DEFAULT ''::character varying NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    custom_background character varying(100) DEFAULT ''::character varying NOT NULL,
    custom_features text DEFAULT ''::text NOT NULL,
    custom_languages_known text DEFAULT ''::text NOT NULL,
    custom_equipment text DEFAULT ''::text NOT NULL,
    personality_traits text DEFAULT ''::text NOT NULL,
    ideals text DEFAULT ''::text NOT NULL,
    bonds text DEFAULT ''::text NOT NULL,
    flaws text DEFAULT ''::text NOT NULL,
    backstory text DEFAULT ''::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    str integer NOT NULL,
    dex integer NOT NULL,
    con integer NOT NULL,
    "int" integer NOT NULL,
    wis integer NOT NULL,
    cha integer NOT NULL,
    cp text DEFAULT '0'::text NOT NULL,
    sp text DEFAULT '0'::text NOT NULL,
    ep text DEFAULT '0'::text NOT NULL,
    gp text DEFAULT '0'::text NOT NULL,
    pp text DEFAULT '0'::text NOT NULL,
    additional_save_proficiencies public."Ability"[] DEFAULT ARRAY[]::public."Ability"[],
    misc_save_bonuses jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    additional_shield_bonus integer DEFAULT 0 NOT NULL,
    armor_bonus integer DEFAULT 0 NOT NULL,
    wears_natural_armor boolean DEFAULT false NOT NULL,
    wears_shield boolean DEFAULT false NOT NULL,
    current_pact_slots integer DEFAULT 0 NOT NULL,
    custom_proficiencies text DEFAULT ''::text NOT NULL,
    death_save_failures integer DEFAULT 0 NOT NULL,
    death_save_successes integer DEFAULT 0 NOT NULL,
    is_dead boolean DEFAULT false NOT NULL,
    acbonuses jsonb,
    currenthitdice jsonb,
    hpbonuses jsonb,
    initiativebonuses jsonb,
    isactive boolean DEFAULT true NOT NULL,
    issnapshot boolean DEFAULT false NOT NULL,
    parentpersid integer,
    proficiencybonuses jsonb,
    savebonuses jsonb,
    sharetoken text,
    skillbonuses jsonb,
    snapshotlevel integer,
    speedbonuses jsonb,
    spellattackbonuses jsonb,
    spelldcbonuses jsonb,
    statbonuses jsonb,
    statmodifierbonuses jsonb,
    usedhitdice jsonb,
    override_base_ac integer,
    race_static_ac_bonus integer DEFAULT 0 NOT NULL,
    folder_id integer,
    is_pinned boolean DEFAULT false NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    heroic_inspiration_count integer DEFAULT 0 NOT NULL,
    can_stack_heroic_inspiration boolean DEFAULT false NOT NULL,
    portrait_key character varying(255),
    exhaustion_level smallint DEFAULT 0 NOT NULL,
    CONSTRAINT pers_exhaustion_level_range CHECK (((exhaustion_level >= 0) AND (exhaustion_level <= 6))),
    CONSTRAINT pers_heroic_inspiration_count_non_negative CHECK ((heroic_inspiration_count >= 0))
);


--
-- Name: pers_additional_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_additional_users (
    pers_additional_user_id integer NOT NULL,
    pers_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pers_additional_users_pers_additional_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_additional_users_pers_additional_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_additional_users_pers_additional_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_additional_users_pers_additional_user_id_seq OWNED BY public.pers_additional_users.pers_additional_user_id;


--
-- Name: pers_armor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_armor (
    pers_armor_id integer NOT NULL,
    armor_id integer NOT NULL,
    pers_id integer NOT NULL,
    override_base_ac integer,
    misc_ac_bonus integer,
    is_proficient boolean DEFAULT true NOT NULL,
    equipped boolean DEFAULT false NOT NULL,
    override_name text,
    ability_bonuses public."Ability"[] DEFAULT ARRAY[]::public."Ability"[],
    ability_bonus_type public."AbilityBonusType" DEFAULT 'FULL'::public."AbilityBonusType" NOT NULL
);


--
-- Name: pers_armor_pers_armor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_armor_pers_armor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_armor_pers_armor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_armor_pers_armor_id_seq OWNED BY public.pers_armor.pers_armor_id;


--
-- Name: pers_bastion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_bastion (
    pers_bastion_id integer NOT NULL,
    pers_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_maintaining boolean DEFAULT false NOT NULL
);


--
-- Name: pers_bastion_facility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_bastion_facility (
    pers_bastion_facility_id integer NOT NULL,
    pers_bastion_id integer NOT NULL,
    facility_slug text NOT NULL,
    space public."BastionSpace" NOT NULL,
    current_order public."BastionOrder",
    defenders integer DEFAULT 0 NOT NULL,
    hirelings text DEFAULT ''::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pers_bastion_facility_defenders_check CHECK ((defenders >= 0))
);


--
-- Name: pers_bastion_facility_pers_bastion_facility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_bastion_facility_pers_bastion_facility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_bastion_facility_pers_bastion_facility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_bastion_facility_pers_bastion_facility_id_seq OWNED BY public.pers_bastion_facility.pers_bastion_facility_id;


--
-- Name: pers_bastion_pers_bastion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_bastion_pers_bastion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_bastion_pers_bastion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_bastion_pers_bastion_id_seq OWNED BY public.pers_bastion.pers_bastion_id;


--
-- Name: pers_bastion_turn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_bastion_turn (
    pers_bastion_turn_id integer NOT NULL,
    pers_bastion_id integer NOT NULL,
    turn_number integer NOT NULL,
    entry text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pers_bastion_turn_turn_number_check CHECK ((turn_number >= 1))
);


--
-- Name: pers_bastion_turn_pers_bastion_turn_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_bastion_turn_pers_bastion_turn_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_bastion_turn_pers_bastion_turn_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_bastion_turn_pers_bastion_turn_id_seq OWNED BY public.pers_bastion_turn.pers_bastion_turn_id;


--
-- Name: pers_effect; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_effect (
    pers_effect_id integer NOT NULL,
    pers_id integer NOT NULL,
    effect_key character varying(40) NOT NULL,
    spell_id integer,
    homebrew_entry_id integer,
    ends_with_concentration boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pers_effect_pers_effect_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_effect_pers_effect_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_effect_pers_effect_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_effect_pers_effect_id_seq OWNED BY public.pers_effect.pers_effect_id;


--
-- Name: pers_feat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_feat (
    pers_feat_id integer NOT NULL,
    feat_id integer NOT NULL,
    pers_id integer NOT NULL,
    grants jsonb
);


--
-- Name: pers_feat_choice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_feat_choice (
    pers_feat_choice_id integer NOT NULL,
    pers_feat_id integer NOT NULL,
    choice_option_id integer NOT NULL
);


--
-- Name: pers_feat_choice_pers_feat_choice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_feat_choice_pers_feat_choice_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_feat_choice_pers_feat_choice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_feat_choice_pers_feat_choice_id_seq OWNED BY public.pers_feat_choice.pers_feat_choice_id;


--
-- Name: pers_feat_pers_feat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_feat_pers_feat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_feat_pers_feat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_feat_pers_feat_id_seq OWNED BY public.pers_feat.pers_feat_id;


--
-- Name: pers_feature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_feature (
    pers_feature_id integer NOT NULL,
    pers_id integer NOT NULL,
    feature_id integer NOT NULL,
    uses_remaining integer,
    is_active boolean DEFAULT false NOT NULL
);


--
-- Name: pers_feature_description; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_feature_description (
    pers_feature_description_id integer NOT NULL,
    pers_id integer NOT NULL,
    kind character varying(16) NOT NULL,
    ref_id integer NOT NULL,
    description text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pers_feature_description_kind_check CHECK (((kind)::text = ANY ((ARRAY['FEATURE'::character varying, 'FEAT'::character varying, 'INFUSION'::character varying])::text[])))
);


--
-- Name: pers_feature_description_pers_feature_description_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_feature_description_pers_feature_description_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_feature_description_pers_feature_description_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_feature_description_pers_feature_description_id_seq OWNED BY public.pers_feature_description.pers_feature_description_id;


--
-- Name: pers_feature_pers_feature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_feature_pers_feature_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_feature_pers_feature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_feature_pers_feature_id_seq OWNED BY public.pers_feature.pers_feature_id;


--
-- Name: pers_folder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_folder (
    folder_id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(80) NOT NULL,
    color character varying(16) DEFAULT '#38bdf8'::character varying NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    parent_folder_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: pers_folder_folder_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_folder_folder_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_folder_folder_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_folder_folder_id_seq OWNED BY public.pers_folder.folder_id;


--
-- Name: pers_folder_member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_folder_member (
    pers_folder_member_id integer NOT NULL,
    folder_id integer NOT NULL,
    user_id integer NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pers_folder_member_pers_folder_member_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_folder_member_pers_folder_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_folder_member_pers_folder_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_folder_member_pers_folder_member_id_seq OWNED BY public.pers_folder_member.pers_folder_member_id;


--
-- Name: pers_folder_share_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_folder_share_token (
    pers_folder_share_token_id integer NOT NULL,
    folder_id integer NOT NULL,
    token character varying(64) NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pers_folder_share_token_pers_folder_share_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_folder_share_token_pers_folder_share_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_folder_share_token_pers_folder_share_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_folder_share_token_pers_folder_share_token_id_seq OWNED BY public.pers_folder_share_token.pers_folder_share_token_id;


--
-- Name: pers_homebrew_spell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_homebrew_spell (
    pers_homebrew_spell_id integer NOT NULL,
    pers_id integer NOT NULL,
    homebrew_entry_id integer NOT NULL,
    is_prepared boolean DEFAULT false NOT NULL,
    badge_text text,
    badge_color text,
    exclude_from_prepared_count boolean DEFAULT false NOT NULL,
    exclude_from_known_count boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pers_homebrew_spell_pers_homebrew_spell_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_homebrew_spell_pers_homebrew_spell_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_homebrew_spell_pers_homebrew_spell_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_homebrew_spell_pers_homebrew_spell_id_seq OWNED BY public.pers_homebrew_spell.pers_homebrew_spell_id;


--
-- Name: pers_infusion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_infusion (
    pers_infusion_id integer NOT NULL,
    pers_id integer NOT NULL,
    infusion_id integer NOT NULL,
    pers_weapon_id integer,
    pers_armor_id integer,
    pers_magic_item_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone
);


--
-- Name: pers_infusion_pers_infusion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_infusion_pers_infusion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_infusion_pers_infusion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_infusion_pers_infusion_id_seq OWNED BY public.pers_infusion.pers_infusion_id;


--
-- Name: pers_magic_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_magic_item (
    pers_magic_item_id integer NOT NULL,
    pers_id integer NOT NULL,
    magic_item_id integer NOT NULL,
    is_attuned boolean DEFAULT false NOT NULL,
    is_equipped boolean DEFAULT false NOT NULL,
    charges_max integer,
    charges_current integer,
    CONSTRAINT pers_magic_item_charges_within_max CHECK ((((charges_max IS NULL) AND (charges_current IS NULL)) OR ((charges_max > 0) AND ((charges_current >= 0) AND (charges_current <= charges_max)))))
);


--
-- Name: pers_magic_item_pers_magic_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_magic_item_pers_magic_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_magic_item_pers_magic_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_magic_item_pers_magic_item_id_seq OWNED BY public.pers_magic_item.pers_magic_item_id;


--
-- Name: pers_multiclass; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_multiclass (
    pers_multiclass_id integer NOT NULL,
    pers_id integer NOT NULL,
    class_id integer NOT NULL,
    subclass_id integer,
    class_level integer NOT NULL
);


--
-- Name: pers_multiclass_pers_multiclass_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_multiclass_pers_multiclass_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_multiclass_pers_multiclass_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_multiclass_pers_multiclass_id_seq OWNED BY public.pers_multiclass.pers_multiclass_id;


--
-- Name: pers_offline_operation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_offline_operation (
    operation_id character varying(64) NOT NULL,
    pers_id integer NOT NULL,
    user_id integer NOT NULL,
    operation_kind character varying(64) NOT NULL,
    applied_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pers_pers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_pers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_pers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_pers_id_seq OWNED BY public.pers.pers_id;


--
-- Name: pers_resource_pool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_resource_pool (
    pers_resource_pool_id integer NOT NULL,
    pers_id integer NOT NULL,
    pool_key character varying(50) NOT NULL,
    uses_remaining integer
);


--
-- Name: pers_resource_pool_pers_resource_pool_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_resource_pool_pers_resource_pool_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_resource_pool_pers_resource_pool_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_resource_pool_pers_resource_pool_id_seq OWNED BY public.pers_resource_pool.pers_resource_pool_id;


--
-- Name: pers_share_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_share_token (
    pers_share_token_id integer NOT NULL,
    pers_id integer NOT NULL,
    token character varying(64) NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pers_share_token_pers_share_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_share_token_pers_share_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_share_token_pers_share_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_share_token_pers_share_token_id_seq OWNED BY public.pers_share_token.pers_share_token_id;


--
-- Name: pers_skill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_skill (
    pers_skill_id integer NOT NULL,
    skill_id integer NOT NULL,
    pers_id integer NOT NULL,
    proficiency_type public."SkillProficiencyType" DEFAULT 'NONE'::public."SkillProficiencyType" NOT NULL,
    custom_modifier integer,
    name public."Skills" NOT NULL
);


--
-- Name: pers_skill_pers_skill_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_skill_pers_skill_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_skill_pers_skill_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_skill_pers_skill_id_seq OWNED BY public.pers_skill.pers_skill_id;


--
-- Name: pers_spell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_spell (
    pers_spell_id integer NOT NULL,
    pers_id integer NOT NULL,
    spell_id integer NOT NULL,
    learned_at_level integer NOT NULL,
    origin public."SpellOrigin" DEFAULT 'MANUAL'::public."SpellOrigin" NOT NULL,
    source_id integer,
    source_name text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    is_prepared boolean DEFAULT false NOT NULL,
    badge_color text,
    badge_text text,
    exclude_from_prepared_count boolean DEFAULT false NOT NULL,
    exclude_from_known_count boolean DEFAULT false NOT NULL
);


--
-- Name: pers_spell_pers_spell_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_spell_pers_spell_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_spell_pers_spell_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_spell_pers_spell_id_seq OWNED BY public.pers_spell.pers_spell_id;


--
-- Name: pers_weapon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_weapon (
    pers_weapon_id integer NOT NULL,
    pers_id integer NOT NULL,
    weapon_id integer NOT NULL,
    override_damage text,
    attack_bonus integer,
    override_name text,
    override_normal_range integer,
    override_long_range integer,
    override_damage_type public."DamageType",
    override_attack_ability public."Ability",
    is_proficient boolean DEFAULT true NOT NULL,
    customattackbonus jsonb,
    customdamageability public."Ability",
    customdamagebonus jsonb,
    customdamagecount integer,
    customdamagedice text,
    ismagical boolean DEFAULT false NOT NULL
);


--
-- Name: pers_weapon_mastery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_weapon_mastery (
    pers_weapon_mastery_id integer NOT NULL,
    pers_id integer NOT NULL,
    weapon_id integer NOT NULL
);


--
-- Name: TABLE pers_weapon_mastery; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pers_weapon_mastery IS 'Види зброї, для яких персонаж 2024 може використовувати mastery property. Ліміт береться з class.weapon_mastery_progression, а не з цієї таблиці.';


--
-- Name: pers_weapon_mastery_pers_weapon_mastery_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_weapon_mastery_pers_weapon_mastery_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_weapon_mastery_pers_weapon_mastery_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_weapon_mastery_pers_weapon_mastery_id_seq OWNED BY public.pers_weapon_mastery.pers_weapon_mastery_id;


--
-- Name: pers_weapon_pers_weapon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_weapon_pers_weapon_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_weapon_pers_weapon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_weapon_pers_weapon_id_seq OWNED BY public.pers_weapon.pers_weapon_id;


--
-- Name: pers_wildshape; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pers_wildshape (
    pers_wildshape_id integer NOT NULL,
    pers_id integer NOT NULL,
    creature_key character varying(200) NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    current_hp integer,
    is_active boolean DEFAULT false NOT NULL
);


--
-- Name: pers_wildshape_pers_wildshape_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pers_wildshape_pers_wildshape_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pers_wildshape_pers_wildshape_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pers_wildshape_pers_wildshape_id_seq OWNED BY public.pers_wildshape.pers_wildshape_id;


--
-- Name: problem_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.problem_report (
    problem_report_id integer NOT NULL,
    user_id integer,
    message text NOT NULL,
    page_path character varying(2048) NOT NULL,
    page_url text,
    referrer text,
    user_agent text,
    ip_address character varying(64),
    viewport_width integer,
    viewport_height integer,
    screen_width integer,
    screen_height integer,
    language character varying(32),
    timezone character varying(64),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: problem_report_problem_report_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.problem_report_problem_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: problem_report_problem_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.problem_report_problem_report_id_seq OWNED BY public.problem_report.problem_report_id;


--
-- Name: race; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.race (
    race_id integer NOT NULL,
    name public."Races" NOT NULL,
    size public."Size"[] DEFAULT ARRAY['MEDIUM'::public."Size"],
    speed integer DEFAULT 30 NOT NULL,
    burrow_speed integer DEFAULT 0 NOT NULL,
    flight_speed integer DEFAULT 0 NOT NULL,
    swim_speed integer DEFAULT 0 NOT NULL,
    climb_speed integer DEFAULT 0 NOT NULL,
    source public."Source" DEFAULT 'PHB'::public."Source" NOT NULL,
    languages public."Language"[] DEFAULT ARRAY['COMMON'::public."Language"],
    languages_to_choose_count integer DEFAULT 0 NOT NULL,
    armor_proficiencies public."ArmorType"[] DEFAULT ARRAY[]::public."ArmorType"[],
    skill_proficiencies jsonb,
    asi jsonb NOT NULL,
    tool_to_choose_count integer,
    ac jsonb,
    tool_proficiencies jsonb,
    weapon_proficiencies jsonb,
    sort_order integer DEFAULT 999 NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    description text
);


--
-- Name: COLUMN race.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.race.description IS 'Коротка вступна проза раси/виду для каталогу (≈145 слів). NULL — опису немає.';


--
-- Name: race_choice_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.race_choice_option (
    option_id integer NOT NULL,
    race_id integer NOT NULL,
    subrace_id integer,
    choice_group_name text NOT NULL,
    option_name text NOT NULL,
    description text,
    select_multiple boolean DEFAULT false NOT NULL,
    max_selection integer DEFAULT 1 NOT NULL,
    languages_to_choose_count integer DEFAULT 0 NOT NULL,
    modifies_speed integer,
    asi jsonb,
    languages public."Language"[] DEFAULT ARRAY[]::public."Language"[],
    skill_proficiencies jsonb,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    option_name_eng character varying(100),
    spellcasting_ability public."Ability",
    trait_feature_id integer
);


--
-- Name: COLUMN race_choice_option.option_name_eng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.race_choice_option.option_name_eng IS 'Англійський ключ опції (Red, High Elf, Stone''s Endurance). NULL — опція без англійського ключа (усі дані 2014).';


--
-- Name: COLUMN race_choice_option.spellcasting_ability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.race_choice_option.spellcasting_ability IS 'Характеристика замовляння, яку дає ця опція (вибір Інтелект/Мудрість/Харизма для родоводу 2024). NULL — опція характеристики не задає.';


--
-- Name: COLUMN race_choice_option.trait_feature_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.race_choice_option.trait_feature_id IS 'Риса виду, всередині якої стоїть цей вибір. NULL — вибір не належить жодній рисі.';


--
-- Name: race_choice_option_option_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.race_choice_option_option_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: race_choice_option_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.race_choice_option_option_id_seq OWNED BY public.race_choice_option.option_id;


--
-- Name: race_choice_option_spell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.race_choice_option_spell (
    race_choice_option_spell_id integer NOT NULL,
    option_id integer NOT NULL,
    spell_id integer NOT NULL,
    character_level integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: TABLE race_choice_option_spell; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.race_choice_option_spell IS 'Колонки Level 3 і Level 5 таблиці родоводів PHB 2024: заклинання, яке опція виду дає на рівні персонажа вище першого. Заклинання 1-го рівня лежать на фічі опції.';


--
-- Name: COLUMN race_choice_option_spell.character_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.race_choice_option_spell.character_level IS 'Рівень ПЕРСОНАЖА, з якого заклинання доступне. Значень лише два — 3 і 5.';


--
-- Name: race_choice_option_spell_race_choice_option_spell_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.race_choice_option_spell_race_choice_option_spell_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: race_choice_option_spell_race_choice_option_spell_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.race_choice_option_spell_race_choice_option_spell_id_seq OWNED BY public.race_choice_option_spell.race_choice_option_spell_id;


--
-- Name: race_choice_option_trait; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.race_choice_option_trait (
    race_choice_option_trait_id integer NOT NULL,
    option_id integer NOT NULL,
    feature_id integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: race_choice_option_trait_race_choice_option_trait_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.race_choice_option_trait_race_choice_option_trait_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: race_choice_option_trait_race_choice_option_trait_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.race_choice_option_trait_race_choice_option_trait_id_seq OWNED BY public.race_choice_option_trait.race_choice_option_trait_id;


--
-- Name: race_race_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.race_race_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: race_race_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.race_race_id_seq OWNED BY public.race.race_id;


--
-- Name: race_trait; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.race_trait (
    race_trait_id integer NOT NULL,
    race_id integer NOT NULL,
    feature_id integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    level integer DEFAULT 1 NOT NULL
);


--
-- Name: COLUMN race_trait.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.race_trait.level IS 'Рівень ПЕРСОНАЖА, з якого риса виду доступна (2024: Драконячий політ 5, Прояв небожителя 3). 1 — риса з першого рівня, усі дані 2014.';


--
-- Name: race_trait_race_trait_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.race_trait_race_trait_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: race_trait_race_trait_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.race_trait_race_trait_id_seq OWNED BY public.race_trait.race_trait_id;


--
-- Name: race_variant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.race_variant (
    race_variant_id integer NOT NULL,
    race_id integer NOT NULL,
    name public."Variants" NOT NULL,
    source public."Source" NOT NULL,
    exclusivity_group text,
    overrides_race_asi jsonb NOT NULL,
    overrides_race_speed integer,
    overrides_flight_speed integer,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    description text
);


--
-- Name: COLUMN race_variant.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.race_variant.description IS 'Коротка проза варіанта раси для каталогу. NULL — опису немає.';


--
-- Name: race_variant_race_variant_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.race_variant_race_variant_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: race_variant_race_variant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.race_variant_race_variant_id_seq OWNED BY public.race_variant.race_variant_id;


--
-- Name: race_variant_trait; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.race_variant_trait (
    race_variant_trait_id integer NOT NULL,
    race_variant_id integer NOT NULL,
    feature_id integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: race_variant_trait_race_variant_trait_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.race_variant_trait_race_variant_trait_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: race_variant_trait_race_variant_trait_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.race_variant_trait_race_variant_trait_id_seq OWNED BY public.race_variant_trait.race_variant_trait_id;


--
-- Name: spell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spell (
    spell_id integer NOT NULL,
    name character varying(255) NOT NULL,
    school character varying(255),
    casting_time character varying(255) NOT NULL,
    range character varying(255) NOT NULL,
    components character varying(500),
    duration character varying(255) NOT NULL,
    description text NOT NULL,
    has_ritual character varying,
    has_concentration character varying,
    source public."Source" DEFAULT 'PHB'::public."Source" NOT NULL,
    level integer NOT NULL,
    eng_name character varying(255) NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: spell_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spell_classes (
    class_id integer NOT NULL,
    spell_id integer NOT NULL,
    class_name character varying(255) NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    source public."Source"
);


--
-- Name: COLUMN spell_classes.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.spell_classes.source IS 'Книга розширеного списку заклинань, що дала класу це заклинання. NULL — базовий перелік.';


--
-- Name: spell_classes_class_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spell_classes_class_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spell_classes_class_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spell_classes_class_id_seq OWNED BY public.spell_classes.class_id;


--
-- Name: spell_races; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spell_races (
    spell_id integer,
    race_id integer NOT NULL,
    race_name character varying,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: spell_races_race_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spell_races_race_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spell_races_race_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spell_races_race_id_seq OWNED BY public.spell_races.race_id;


--
-- Name: spell_spell_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spell_spell_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spell_spell_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spell_spell_id_seq OWNED BY public.spell.spell_id;


--
-- Name: subclass; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subclass (
    subclass_id integer NOT NULL,
    class_id integer NOT NULL,
    description text,
    grants_spells boolean DEFAULT false NOT NULL,
    languages_to_choose_count integer DEFAULT 0 NOT NULL,
    languages public."Language"[] DEFAULT ARRAY[]::public."Language"[],
    tool_proficiencies public."ToolCategory"[] DEFAULT ARRAY[]::public."ToolCategory"[],
    tool_to_choose_count integer,
    primary_casting_stat public."Ability",
    spellcasting_type public."SpellcastingType" DEFAULT 'NONE'::public."SpellcastingType" NOT NULL,
    name public."Subclasses" NOT NULL,
    armor_proficiencies public."ArmorType"[] DEFAULT ARRAY[]::public."ArmorType"[],
    weapon_proficiencies jsonb,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: subclass_choice_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subclass_choice_option (
    option_id integer NOT NULL,
    subclass_id integer NOT NULL,
    choice_option_id integer NOT NULL,
    levels_granted integer[],
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: subclass_choice_option_option_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subclass_choice_option_option_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subclass_choice_option_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subclass_choice_option_option_id_seq OWNED BY public.subclass_choice_option.option_id;


--
-- Name: subclass_feature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subclass_feature (
    subclass_feature_id integer NOT NULL,
    subclass_id integer NOT NULL,
    feature_id integer NOT NULL,
    level_granted integer NOT NULL,
    grants_spell_slots boolean DEFAULT false NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: subclass_feature_subclass_feature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subclass_feature_subclass_feature_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subclass_feature_subclass_feature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subclass_feature_subclass_feature_id_seq OWNED BY public.subclass_feature.subclass_feature_id;


--
-- Name: subclass_spell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subclass_spell (
    subclass_spell_id integer NOT NULL,
    subclass_id integer NOT NULL,
    spell_id integer NOT NULL,
    class_level integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: subclass_spell_subclass_spell_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subclass_spell_subclass_spell_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subclass_spell_subclass_spell_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subclass_spell_subclass_spell_id_seq OWNED BY public.subclass_spell.subclass_spell_id;


--
-- Name: subclass_subclass_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subclass_subclass_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subclass_subclass_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subclass_subclass_id_seq OWNED BY public.subclass.subclass_id;


--
-- Name: subrace; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subrace (
    subrace_id integer NOT NULL,
    race_id integer NOT NULL,
    name public."Subraces" NOT NULL,
    speed_modifier integer,
    source public."Source" DEFAULT 'PHB'::public."Source" NOT NULL,
    replaces_asi boolean DEFAULT false NOT NULL,
    additional_asi jsonb,
    additional_languages public."Language"[] DEFAULT ARRAY[]::public."Language"[],
    languages_to_choose_count integer DEFAULT 0 NOT NULL,
    skill_proficiencies jsonb,
    armor_proficiencies public."ArmorType"[] DEFAULT ARRAY[]::public."ArmorType"[],
    tool_to_choose_count integer,
    tool_proficiencies jsonb,
    weapon_proficiencies jsonb,
    cantrip_to_choose_count integer DEFAULT 0 NOT NULL,
    flight_speed integer,
    swim_speed integer,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    description text
);


--
-- Name: COLUMN subrace.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subrace.description IS 'Коротка проза підраси для каталогу. NULL — опису немає.';


--
-- Name: subrace_subrace_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subrace_subrace_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subrace_subrace_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subrace_subrace_id_seq OWNED BY public.subrace.subrace_id;


--
-- Name: subrace_trait; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subrace_trait (
    subrace_trait_id integer NOT NULL,
    subrace_id integer NOT NULL,
    feature_id integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);


--
-- Name: subrace_trait_subrace_trait_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subrace_trait_subrace_trait_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subrace_trait_subrace_trait_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subrace_trait_subrace_trait_id_seq OWNED BY public.subrace_trait.subrace_trait_id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    user_id integer NOT NULL,
    name text,
    email text,
    email_verified timestamp(3) without time zone,
    image text
);


--
-- Name: user_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_user_id_seq OWNED BY public."user".user_id;


--
-- Name: weapon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weapon (
    weapon_id integer NOT NULL,
    name public."WeaponCategory" NOT NULL,
    damage text NOT NULL,
    damage_type public."DamageType" NOT NULL,
    weapon_type public."WeaponType" NOT NULL,
    properties public."WeaponProperty"[],
    versatile_damage text,
    normal_range integer,
    long_range integer,
    is_ranged boolean DEFAULT false NOT NULL,
    is_additional boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 999 NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    mastery public."WeaponMastery"
);


--
-- Name: weapon_weapon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weapon_weapon_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weapon_weapon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weapon_weapon_id_seq OWNED BY public.weapon.weapon_id;


--
-- Name: account account_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account ALTER COLUMN account_id SET DEFAULT nextval('public.account_account_id_seq'::regclass);


--
-- Name: armor armor_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.armor ALTER COLUMN armor_id SET DEFAULT nextval('public.armor_armor_id_seq'::regclass);


--
-- Name: background background_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.background ALTER COLUMN background_id SET DEFAULT nextval('public.background_background_id_seq'::regclass);


--
-- Name: choice_option option_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.choice_option ALTER COLUMN option_id SET DEFAULT nextval('public.choice_option_option_id_seq'::regclass);


--
-- Name: choice_option_feature option_feature_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.choice_option_feature ALTER COLUMN option_feature_id SET DEFAULT nextval('public."ChoiceOptionFeature_option_feature_id_seq"'::regclass);


--
-- Name: class class_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class ALTER COLUMN class_id SET DEFAULT nextval('public.class_class_id_seq'::regclass);


--
-- Name: class_choice_option option_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_choice_option ALTER COLUMN option_id SET DEFAULT nextval('public.class_choice_option_option_id_seq'::regclass);


--
-- Name: class_feature class_feature_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_feature ALTER COLUMN class_feature_id SET DEFAULT nextval('public.class_feature_class_feature_id_seq'::regclass);


--
-- Name: class_optional_feature option_feature_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_optional_feature ALTER COLUMN option_feature_id SET DEFAULT nextval('public.class_optional_feature_option_feature_id_seq'::regclass);


--
-- Name: class_starting_equipment_option option_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_starting_equipment_option ALTER COLUMN option_id SET DEFAULT nextval('public.class_starting_equipment_option_option_id_seq'::regclass);


--
-- Name: content_comment content_comment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_comment ALTER COLUMN content_comment_id SET DEFAULT nextval('public.content_comment_content_comment_id_seq'::regclass);


--
-- Name: content_report content_report_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_report ALTER COLUMN content_report_id SET DEFAULT nextval('public.content_report_content_report_id_seq'::regclass);


--
-- Name: creature creature_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creature ALTER COLUMN creature_id SET DEFAULT nextval('public.creature_creature_id_seq'::regclass);


--
-- Name: equipment_pack equipment_pack_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_pack ALTER COLUMN equipment_pack_id SET DEFAULT nextval('public.equipment_pack_equipment_pack_id_seq'::regclass);


--
-- Name: feat feat_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feat ALTER COLUMN feat_id SET DEFAULT nextval('public.feat_feat_id_seq'::regclass);


--
-- Name: feat_choice_option option_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feat_choice_option ALTER COLUMN option_id SET DEFAULT nextval('public.feat_choice_option_option_id_seq'::regclass);


--
-- Name: feature feature_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature ALTER COLUMN feature_id SET DEFAULT nextval('public.feature_feature_id_seq'::regclass);


--
-- Name: fighting_style id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fighting_style ALTER COLUMN id SET DEFAULT nextval('public.fighting_style_id_seq'::regclass);


--
-- Name: homebrew_entry homebrew_entry_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homebrew_entry ALTER COLUMN homebrew_entry_id SET DEFAULT nextval('public.homebrew_entry_homebrew_entry_id_seq'::regclass);


--
-- Name: infusion infusion_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infusion ALTER COLUMN infusion_id SET DEFAULT nextval('public.infusion_infusion_id_seq'::regclass);


--
-- Name: magic_item magic_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_item ALTER COLUMN magic_item_id SET DEFAULT nextval('public.magic_item_magic_item_id_seq'::regclass);


--
-- Name: pers pers_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers ALTER COLUMN pers_id SET DEFAULT nextval('public.pers_pers_id_seq'::regclass);


--
-- Name: pers_additional_users pers_additional_user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_additional_users ALTER COLUMN pers_additional_user_id SET DEFAULT nextval('public.pers_additional_users_pers_additional_user_id_seq'::regclass);


--
-- Name: pers_armor pers_armor_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_armor ALTER COLUMN pers_armor_id SET DEFAULT nextval('public.pers_armor_pers_armor_id_seq'::regclass);


--
-- Name: pers_bastion pers_bastion_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_bastion ALTER COLUMN pers_bastion_id SET DEFAULT nextval('public.pers_bastion_pers_bastion_id_seq'::regclass);


--
-- Name: pers_bastion_facility pers_bastion_facility_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_bastion_facility ALTER COLUMN pers_bastion_facility_id SET DEFAULT nextval('public.pers_bastion_facility_pers_bastion_facility_id_seq'::regclass);


--
-- Name: pers_bastion_turn pers_bastion_turn_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_bastion_turn ALTER COLUMN pers_bastion_turn_id SET DEFAULT nextval('public.pers_bastion_turn_pers_bastion_turn_id_seq'::regclass);


--
-- Name: pers_effect pers_effect_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_effect ALTER COLUMN pers_effect_id SET DEFAULT nextval('public.pers_effect_pers_effect_id_seq'::regclass);


--
-- Name: pers_feat pers_feat_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feat ALTER COLUMN pers_feat_id SET DEFAULT nextval('public.pers_feat_pers_feat_id_seq'::regclass);


--
-- Name: pers_feat_choice pers_feat_choice_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feat_choice ALTER COLUMN pers_feat_choice_id SET DEFAULT nextval('public.pers_feat_choice_pers_feat_choice_id_seq'::regclass);


--
-- Name: pers_feature pers_feature_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feature ALTER COLUMN pers_feature_id SET DEFAULT nextval('public.pers_feature_pers_feature_id_seq'::regclass);


--
-- Name: pers_feature_description pers_feature_description_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feature_description ALTER COLUMN pers_feature_description_id SET DEFAULT nextval('public.pers_feature_description_pers_feature_description_id_seq'::regclass);


--
-- Name: pers_folder folder_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder ALTER COLUMN folder_id SET DEFAULT nextval('public.pers_folder_folder_id_seq'::regclass);


--
-- Name: pers_folder_member pers_folder_member_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder_member ALTER COLUMN pers_folder_member_id SET DEFAULT nextval('public.pers_folder_member_pers_folder_member_id_seq'::regclass);


--
-- Name: pers_folder_share_token pers_folder_share_token_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder_share_token ALTER COLUMN pers_folder_share_token_id SET DEFAULT nextval('public.pers_folder_share_token_pers_folder_share_token_id_seq'::regclass);


--
-- Name: pers_homebrew_spell pers_homebrew_spell_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_homebrew_spell ALTER COLUMN pers_homebrew_spell_id SET DEFAULT nextval('public.pers_homebrew_spell_pers_homebrew_spell_id_seq'::regclass);


--
-- Name: pers_infusion pers_infusion_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_infusion ALTER COLUMN pers_infusion_id SET DEFAULT nextval('public.pers_infusion_pers_infusion_id_seq'::regclass);


--
-- Name: pers_magic_item pers_magic_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_magic_item ALTER COLUMN pers_magic_item_id SET DEFAULT nextval('public.pers_magic_item_pers_magic_item_id_seq'::regclass);


--
-- Name: pers_multiclass pers_multiclass_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_multiclass ALTER COLUMN pers_multiclass_id SET DEFAULT nextval('public.pers_multiclass_pers_multiclass_id_seq'::regclass);


--
-- Name: pers_resource_pool pers_resource_pool_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_resource_pool ALTER COLUMN pers_resource_pool_id SET DEFAULT nextval('public.pers_resource_pool_pers_resource_pool_id_seq'::regclass);


--
-- Name: pers_share_token pers_share_token_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_share_token ALTER COLUMN pers_share_token_id SET DEFAULT nextval('public.pers_share_token_pers_share_token_id_seq'::regclass);


--
-- Name: pers_skill pers_skill_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_skill ALTER COLUMN pers_skill_id SET DEFAULT nextval('public.pers_skill_pers_skill_id_seq'::regclass);


--
-- Name: pers_spell pers_spell_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_spell ALTER COLUMN pers_spell_id SET DEFAULT nextval('public.pers_spell_pers_spell_id_seq'::regclass);


--
-- Name: pers_weapon pers_weapon_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_weapon ALTER COLUMN pers_weapon_id SET DEFAULT nextval('public.pers_weapon_pers_weapon_id_seq'::regclass);


--
-- Name: pers_weapon_mastery pers_weapon_mastery_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_weapon_mastery ALTER COLUMN pers_weapon_mastery_id SET DEFAULT nextval('public.pers_weapon_mastery_pers_weapon_mastery_id_seq'::regclass);


--
-- Name: pers_wildshape pers_wildshape_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_wildshape ALTER COLUMN pers_wildshape_id SET DEFAULT nextval('public.pers_wildshape_pers_wildshape_id_seq'::regclass);


--
-- Name: problem_report problem_report_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problem_report ALTER COLUMN problem_report_id SET DEFAULT nextval('public.problem_report_problem_report_id_seq'::regclass);


--
-- Name: race race_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race ALTER COLUMN race_id SET DEFAULT nextval('public.race_race_id_seq'::regclass);


--
-- Name: race_choice_option option_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option ALTER COLUMN option_id SET DEFAULT nextval('public.race_choice_option_option_id_seq'::regclass);


--
-- Name: race_choice_option_spell race_choice_option_spell_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option_spell ALTER COLUMN race_choice_option_spell_id SET DEFAULT nextval('public.race_choice_option_spell_race_choice_option_spell_id_seq'::regclass);


--
-- Name: race_choice_option_trait race_choice_option_trait_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option_trait ALTER COLUMN race_choice_option_trait_id SET DEFAULT nextval('public.race_choice_option_trait_race_choice_option_trait_id_seq'::regclass);


--
-- Name: race_trait race_trait_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_trait ALTER COLUMN race_trait_id SET DEFAULT nextval('public.race_trait_race_trait_id_seq'::regclass);


--
-- Name: race_variant race_variant_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_variant ALTER COLUMN race_variant_id SET DEFAULT nextval('public.race_variant_race_variant_id_seq'::regclass);


--
-- Name: race_variant_trait race_variant_trait_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_variant_trait ALTER COLUMN race_variant_trait_id SET DEFAULT nextval('public.race_variant_trait_race_variant_trait_id_seq'::regclass);


--
-- Name: spell spell_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell ALTER COLUMN spell_id SET DEFAULT nextval('public.spell_spell_id_seq'::regclass);


--
-- Name: spell_classes class_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell_classes ALTER COLUMN class_id SET DEFAULT nextval('public.spell_classes_class_id_seq'::regclass);


--
-- Name: spell_races race_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell_races ALTER COLUMN race_id SET DEFAULT nextval('public.spell_races_race_id_seq'::regclass);


--
-- Name: subclass subclass_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass ALTER COLUMN subclass_id SET DEFAULT nextval('public.subclass_subclass_id_seq'::regclass);


--
-- Name: subclass_choice_option option_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_choice_option ALTER COLUMN option_id SET DEFAULT nextval('public.subclass_choice_option_option_id_seq'::regclass);


--
-- Name: subclass_feature subclass_feature_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_feature ALTER COLUMN subclass_feature_id SET DEFAULT nextval('public.subclass_feature_subclass_feature_id_seq'::regclass);


--
-- Name: subclass_spell subclass_spell_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_spell ALTER COLUMN subclass_spell_id SET DEFAULT nextval('public.subclass_spell_subclass_spell_id_seq'::regclass);


--
-- Name: subrace subrace_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subrace ALTER COLUMN subrace_id SET DEFAULT nextval('public.subrace_subrace_id_seq'::regclass);


--
-- Name: subrace_trait subrace_trait_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subrace_trait ALTER COLUMN subrace_trait_id SET DEFAULT nextval('public.subrace_trait_subrace_trait_id_seq'::regclass);


--
-- Name: user user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user" ALTER COLUMN user_id SET DEFAULT nextval('public.user_user_id_seq'::regclass);


--
-- Name: weapon weapon_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weapon ALTER COLUMN weapon_id SET DEFAULT nextval('public.weapon_weapon_id_seq'::regclass);


--
-- Name: _BackgroundToFeat _BackgroundToFeat_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_BackgroundToFeat"
    ADD CONSTRAINT "_BackgroundToFeat_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _ChoiceOptionToClassOptionalFeature _ChoiceOptionToClassOptionalFeature_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ChoiceOptionToClassOptionalFeature"
    ADD CONSTRAINT "_ChoiceOptionToClassOptionalFeature_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _ChoiceOptionToPers _ChoiceOptionToPers_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ChoiceOptionToPers"
    ADD CONSTRAINT "_ChoiceOptionToPers_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _ClassOptionalFeatureToPers _ClassOptionalFeatureToPers_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ClassOptionalFeatureToPers"
    ADD CONSTRAINT "_ClassOptionalFeatureToPers_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _FeatGrantsFeature _FeatGrantsFeature_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_FeatGrantsFeature"
    ADD CONSTRAINT "_FeatGrantsFeature_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _FeatureToSpell _FeatureToSpell_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_FeatureToSpell"
    ADD CONSTRAINT "_FeatureToSpell_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _MagicItemToSpell _MagicItemToSpell_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_MagicItemToSpell"
    ADD CONSTRAINT "_MagicItemToSpell_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _PersToRaceChoiceOption _PersToRaceChoiceOption_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PersToRaceChoiceOption"
    ADD CONSTRAINT "_PersToRaceChoiceOption_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _PersToRaceVariant _PersToRaceVariant_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PersToRaceVariant"
    ADD CONSTRAINT "_PersToRaceVariant_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _PersToSpell _PersToSpell_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PersToSpell"
    ADD CONSTRAINT "_PersToSpell_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _RaceVariantReplacingFeature _RaceVariantReplacingFeature_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_RaceVariantReplacingFeature"
    ADD CONSTRAINT "_RaceVariantReplacingFeature_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _SubclassExpandedSpells _SubclassExpandedSpells_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_SubclassExpandedSpells"
    ADD CONSTRAINT "_SubclassExpandedSpells_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _SubraceReplacingFeature _SubraceReplacingFeature_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_SubraceReplacingFeature"
    ADD CONSTRAINT "_SubraceReplacingFeature_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (account_id);


--
-- Name: armor armor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.armor
    ADD CONSTRAINT armor_pkey PRIMARY KEY (armor_id);


--
-- Name: background background_name_ruleset_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.background
    ADD CONSTRAINT background_name_ruleset_key UNIQUE (name, ruleset);


--
-- Name: background background_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.background
    ADD CONSTRAINT background_pkey PRIMARY KEY (background_id);


--
-- Name: choice_option_feature choice_option_feature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.choice_option_feature
    ADD CONSTRAINT choice_option_feature_pkey PRIMARY KEY (option_feature_id);


--
-- Name: choice_option choice_option_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.choice_option
    ADD CONSTRAINT choice_option_pkey PRIMARY KEY (option_id);


--
-- Name: class_choice_option class_choice_option_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_choice_option
    ADD CONSTRAINT class_choice_option_pkey PRIMARY KEY (option_id);


--
-- Name: class class_eng_name_ruleset_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class
    ADD CONSTRAINT class_eng_name_ruleset_key UNIQUE (eng_name, ruleset);


--
-- Name: class_feature class_feature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_feature
    ADD CONSTRAINT class_feature_pkey PRIMARY KEY (class_feature_id);


--
-- Name: class_optional_feature class_optional_feature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_optional_feature
    ADD CONSTRAINT class_optional_feature_pkey PRIMARY KEY (option_feature_id);


--
-- Name: class_optional_feature_replaces_feature class_optional_feature_replaces_feature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_optional_feature_replaces_feature
    ADD CONSTRAINT class_optional_feature_replaces_feature_pkey PRIMARY KEY (class_optional_feature_id, replaced_feature_id);


--
-- Name: class class_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class
    ADD CONSTRAINT class_pkey PRIMARY KEY (class_id);


--
-- Name: class_starting_equipment_option class_starting_equipment_option_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_starting_equipment_option
    ADD CONSTRAINT class_starting_equipment_option_pkey PRIMARY KEY (option_id);


--
-- Name: content_comment content_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_comment
    ADD CONSTRAINT content_comment_pkey PRIMARY KEY (content_comment_id);


--
-- Name: content_comment_vote content_comment_vote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_comment_vote
    ADD CONSTRAINT content_comment_vote_pkey PRIMARY KEY (content_comment_id, user_id);


--
-- Name: content_report content_report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_report
    ADD CONSTRAINT content_report_pkey PRIMARY KEY (content_report_id);


--
-- Name: content_vote content_vote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_vote
    ADD CONSTRAINT content_vote_pkey PRIMARY KEY (target, user_id);


--
-- Name: creature creature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creature
    ADD CONSTRAINT creature_pkey PRIMARY KEY (creature_id);


--
-- Name: equipment_pack equipment_pack_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_pack
    ADD CONSTRAINT equipment_pack_pkey PRIMARY KEY (equipment_pack_id);


--
-- Name: feat_choice_option feat_choice_option_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feat_choice_option
    ADD CONSTRAINT feat_choice_option_pkey PRIMARY KEY (option_id);


--
-- Name: feat feat_name_ruleset_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feat
    ADD CONSTRAINT feat_name_ruleset_key UNIQUE (name, ruleset);


--
-- Name: feat feat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feat
    ADD CONSTRAINT feat_pkey PRIMARY KEY (feat_id);


--
-- Name: feature feature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature
    ADD CONSTRAINT feature_pkey PRIMARY KEY (feature_id);


--
-- Name: fighting_style fighting_style_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fighting_style
    ADD CONSTRAINT fighting_style_pkey PRIMARY KEY (id);


--
-- Name: homebrew_creature homebrew_creature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homebrew_creature
    ADD CONSTRAINT homebrew_creature_pkey PRIMARY KEY (homebrew_entry_id);


--
-- Name: homebrew_entry homebrew_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homebrew_entry
    ADD CONSTRAINT homebrew_entry_pkey PRIMARY KEY (homebrew_entry_id);


--
-- Name: homebrew_spell homebrew_spell_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homebrew_spell
    ADD CONSTRAINT homebrew_spell_pkey PRIMARY KEY (homebrew_entry_id);


--
-- Name: infusion infusion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infusion
    ADD CONSTRAINT infusion_pkey PRIMARY KEY (infusion_id);


--
-- Name: magic_item magic_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_item
    ADD CONSTRAINT magic_item_pkey PRIMARY KEY (magic_item_id);


--
-- Name: pers_additional_users pers_additional_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_additional_users
    ADD CONSTRAINT pers_additional_users_pkey PRIMARY KEY (pers_additional_user_id);


--
-- Name: pers_armor pers_armor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_armor
    ADD CONSTRAINT pers_armor_pkey PRIMARY KEY (pers_armor_id);


--
-- Name: pers_bastion_facility pers_bastion_facility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_bastion_facility
    ADD CONSTRAINT pers_bastion_facility_pkey PRIMARY KEY (pers_bastion_facility_id);


--
-- Name: pers_bastion pers_bastion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_bastion
    ADD CONSTRAINT pers_bastion_pkey PRIMARY KEY (pers_bastion_id);


--
-- Name: pers_bastion_turn pers_bastion_turn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_bastion_turn
    ADD CONSTRAINT pers_bastion_turn_pkey PRIMARY KEY (pers_bastion_turn_id);


--
-- Name: pers_effect pers_effect_one_per_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_effect
    ADD CONSTRAINT pers_effect_one_per_key UNIQUE (pers_id, effect_key);


--
-- Name: pers_effect pers_effect_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_effect
    ADD CONSTRAINT pers_effect_pkey PRIMARY KEY (pers_effect_id);


--
-- Name: pers_feat_choice pers_feat_choice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feat_choice
    ADD CONSTRAINT pers_feat_choice_pkey PRIMARY KEY (pers_feat_choice_id);


--
-- Name: pers_feat pers_feat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feat
    ADD CONSTRAINT pers_feat_pkey PRIMARY KEY (pers_feat_id);


--
-- Name: pers_feature_description pers_feature_description_pers_id_kind_ref_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feature_description
    ADD CONSTRAINT pers_feature_description_pers_id_kind_ref_id_key UNIQUE (pers_id, kind, ref_id);


--
-- Name: pers_feature_description pers_feature_description_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feature_description
    ADD CONSTRAINT pers_feature_description_pkey PRIMARY KEY (pers_feature_description_id);


--
-- Name: pers_feature pers_feature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feature
    ADD CONSTRAINT pers_feature_pkey PRIMARY KEY (pers_feature_id);


--
-- Name: pers_folder_member pers_folder_member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder_member
    ADD CONSTRAINT pers_folder_member_pkey PRIMARY KEY (pers_folder_member_id);


--
-- Name: pers_folder pers_folder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder
    ADD CONSTRAINT pers_folder_pkey PRIMARY KEY (folder_id);


--
-- Name: pers_folder_share_token pers_folder_share_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder_share_token
    ADD CONSTRAINT pers_folder_share_token_pkey PRIMARY KEY (pers_folder_share_token_id);


--
-- Name: pers_homebrew_spell pers_homebrew_spell_pers_id_homebrew_entry_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_homebrew_spell
    ADD CONSTRAINT pers_homebrew_spell_pers_id_homebrew_entry_id_key UNIQUE (pers_id, homebrew_entry_id);


--
-- Name: pers_homebrew_spell pers_homebrew_spell_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_homebrew_spell
    ADD CONSTRAINT pers_homebrew_spell_pkey PRIMARY KEY (pers_homebrew_spell_id);


--
-- Name: pers_infusion pers_infusion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_infusion
    ADD CONSTRAINT pers_infusion_pkey PRIMARY KEY (pers_infusion_id);


--
-- Name: pers_magic_item pers_magic_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_magic_item
    ADD CONSTRAINT pers_magic_item_pkey PRIMARY KEY (pers_magic_item_id);


--
-- Name: pers_multiclass pers_multiclass_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_multiclass
    ADD CONSTRAINT pers_multiclass_pkey PRIMARY KEY (pers_multiclass_id);


--
-- Name: pers_offline_operation pers_offline_operation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_offline_operation
    ADD CONSTRAINT pers_offline_operation_pkey PRIMARY KEY (operation_id);


--
-- Name: pers pers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers
    ADD CONSTRAINT pers_pkey PRIMARY KEY (pers_id);


--
-- Name: pers_resource_pool pers_resource_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_resource_pool
    ADD CONSTRAINT pers_resource_pool_pkey PRIMARY KEY (pers_resource_pool_id);


--
-- Name: pers_share_token pers_share_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_share_token
    ADD CONSTRAINT pers_share_token_pkey PRIMARY KEY (pers_share_token_id);


--
-- Name: pers_skill pers_skill_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_skill
    ADD CONSTRAINT pers_skill_pkey PRIMARY KEY (pers_skill_id);


--
-- Name: pers_spell pers_spell_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_spell
    ADD CONSTRAINT pers_spell_pkey PRIMARY KEY (pers_spell_id);


--
-- Name: pers_weapon_mastery pers_weapon_mastery_pers_id_weapon_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_weapon_mastery
    ADD CONSTRAINT pers_weapon_mastery_pers_id_weapon_id_key UNIQUE (pers_id, weapon_id);


--
-- Name: pers_weapon_mastery pers_weapon_mastery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_weapon_mastery
    ADD CONSTRAINT pers_weapon_mastery_pkey PRIMARY KEY (pers_weapon_mastery_id);


--
-- Name: pers_weapon pers_weapon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_weapon
    ADD CONSTRAINT pers_weapon_pkey PRIMARY KEY (pers_weapon_id);


--
-- Name: pers_wildshape pers_wildshape_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_wildshape
    ADD CONSTRAINT pers_wildshape_pkey PRIMARY KEY (pers_wildshape_id);


--
-- Name: problem_report problem_report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problem_report
    ADD CONSTRAINT problem_report_pkey PRIMARY KEY (problem_report_id);


--
-- Name: race_choice_option race_choice_option_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option
    ADD CONSTRAINT race_choice_option_pkey PRIMARY KEY (option_id);


--
-- Name: race_choice_option_spell race_choice_option_spell_option_id_spell_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option_spell
    ADD CONSTRAINT race_choice_option_spell_option_id_spell_id_key UNIQUE (option_id, spell_id);


--
-- Name: race_choice_option_spell race_choice_option_spell_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option_spell
    ADD CONSTRAINT race_choice_option_spell_pkey PRIMARY KEY (race_choice_option_spell_id);


--
-- Name: race_choice_option_trait race_choice_option_trait_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option_trait
    ADD CONSTRAINT race_choice_option_trait_pkey PRIMARY KEY (race_choice_option_trait_id);


--
-- Name: race race_name_ruleset_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race
    ADD CONSTRAINT race_name_ruleset_key UNIQUE (name, ruleset);


--
-- Name: race race_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race
    ADD CONSTRAINT race_pkey PRIMARY KEY (race_id);


--
-- Name: race_trait race_trait_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_trait
    ADD CONSTRAINT race_trait_pkey PRIMARY KEY (race_trait_id);


--
-- Name: race_variant race_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_variant
    ADD CONSTRAINT race_variant_pkey PRIMARY KEY (race_variant_id);


--
-- Name: race_variant_trait race_variant_trait_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_variant_trait
    ADD CONSTRAINT race_variant_trait_pkey PRIMARY KEY (race_variant_trait_id);


--
-- Name: spell_classes spell_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell_classes
    ADD CONSTRAINT spell_classes_pkey PRIMARY KEY (class_id);


--
-- Name: spell spell_eng_name_ruleset_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell
    ADD CONSTRAINT spell_eng_name_ruleset_key UNIQUE (eng_name, ruleset);


--
-- Name: spell spell_name_ruleset_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell
    ADD CONSTRAINT spell_name_ruleset_key UNIQUE (name, ruleset);


--
-- Name: spell spell_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell
    ADD CONSTRAINT spell_pkey PRIMARY KEY (spell_id);


--
-- Name: spell_races spell_races_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell_races
    ADD CONSTRAINT spell_races_pkey PRIMARY KEY (race_id);


--
-- Name: subclass_choice_option subclass_choice_option_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_choice_option
    ADD CONSTRAINT subclass_choice_option_pkey PRIMARY KEY (option_id);


--
-- Name: subclass_feature subclass_feature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_feature
    ADD CONSTRAINT subclass_feature_pkey PRIMARY KEY (subclass_feature_id);


--
-- Name: subclass subclass_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass
    ADD CONSTRAINT subclass_pkey PRIMARY KEY (subclass_id);


--
-- Name: subclass_spell subclass_spell_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_spell
    ADD CONSTRAINT subclass_spell_pkey PRIMARY KEY (subclass_spell_id);


--
-- Name: subclass_spell subclass_spell_subclass_id_spell_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_spell
    ADD CONSTRAINT subclass_spell_subclass_id_spell_id_key UNIQUE (subclass_id, spell_id);


--
-- Name: subrace subrace_name_ruleset_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subrace
    ADD CONSTRAINT subrace_name_ruleset_key UNIQUE (name, ruleset);


--
-- Name: subrace subrace_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subrace
    ADD CONSTRAINT subrace_pkey PRIMARY KEY (subrace_id);


--
-- Name: subrace_trait subrace_trait_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subrace_trait
    ADD CONSTRAINT subrace_trait_pkey PRIMARY KEY (subrace_trait_id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (user_id);


--
-- Name: weapon weapon_name_ruleset_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weapon
    ADD CONSTRAINT weapon_name_ruleset_key UNIQUE (name, ruleset);


--
-- Name: weapon weapon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weapon
    ADD CONSTRAINT weapon_pkey PRIMARY KEY (weapon_id);


--
-- Name: _BackgroundToFeat_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_BackgroundToFeat_B_index" ON public."_BackgroundToFeat" USING btree ("B");


--
-- Name: _ChoiceOptionToClassOptionalFeature_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_ChoiceOptionToClassOptionalFeature_B_index" ON public."_ChoiceOptionToClassOptionalFeature" USING btree ("B");


--
-- Name: _ChoiceOptionToPers_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_ChoiceOptionToPers_B_index" ON public."_ChoiceOptionToPers" USING btree ("B");


--
-- Name: _ClassOptionalFeatureToPers_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_ClassOptionalFeatureToPers_B_index" ON public."_ClassOptionalFeatureToPers" USING btree ("B");


--
-- Name: _FeatGrantsFeature_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_FeatGrantsFeature_B_index" ON public."_FeatGrantsFeature" USING btree ("B");


--
-- Name: _FeatureToSpell_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_FeatureToSpell_B_index" ON public."_FeatureToSpell" USING btree ("B");


--
-- Name: _MagicItemToSpell_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_MagicItemToSpell_B_index" ON public."_MagicItemToSpell" USING btree ("B");


--
-- Name: _PersToRaceChoiceOption_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_PersToRaceChoiceOption_B_index" ON public."_PersToRaceChoiceOption" USING btree ("B");


--
-- Name: _PersToRaceVariant_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_PersToRaceVariant_B_index" ON public."_PersToRaceVariant" USING btree ("B");


--
-- Name: _PersToSpell_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_PersToSpell_B_index" ON public."_PersToSpell" USING btree ("B");


--
-- Name: _RaceVariantReplacingFeature_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_RaceVariantReplacingFeature_B_index" ON public."_RaceVariantReplacingFeature" USING btree ("B");


--
-- Name: _SubclassExpandedSpells_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_SubclassExpandedSpells_B_index" ON public."_SubclassExpandedSpells" USING btree ("B");


--
-- Name: _SubraceReplacingFeature_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_SubraceReplacingFeature_B_index" ON public."_SubraceReplacingFeature" USING btree ("B");


--
-- Name: account_provider_provider_account_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX account_provider_provider_account_id_key ON public.account USING btree (provider, provider_account_id);


--
-- Name: armor_name_ruleset_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX armor_name_ruleset_key ON public.armor USING btree (name, ruleset);


--
-- Name: choice_option_option_name_eng_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX choice_option_option_name_eng_key ON public.choice_option USING btree (option_name_eng);


--
-- Name: class_choice_option_class_id_choice_option_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX class_choice_option_class_id_choice_option_id_key ON public.class_choice_option USING btree (class_id, choice_option_id);


--
-- Name: class_feature_class_id_feature_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX class_feature_class_id_feature_id_key ON public.class_feature USING btree (class_id, feature_id);


--
-- Name: class_feature_class_id_level_granted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_feature_class_id_level_granted_idx ON public.class_feature USING btree (class_id, level_granted);


--
-- Name: class_feature_mechanic_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_feature_mechanic_type_idx ON public.class_feature USING btree (mechanic_type);


--
-- Name: class_optional_feature_seed_index_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX class_optional_feature_seed_index_key ON public.class_optional_feature USING btree (seed_index);


--
-- Name: class_starting_equipment_option_class_id_choice_group_optio_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_starting_equipment_option_class_id_choice_group_optio_idx ON public.class_starting_equipment_option USING btree (class_id, choice_group, option);


--
-- Name: class_starting_equipment_option_seed_index_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX class_starting_equipment_option_seed_index_key ON public.class_starting_equipment_option USING btree (seed_index);


--
-- Name: content_comment_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_comment_target_idx ON public.content_comment USING btree (target, created_at);


--
-- Name: content_comment_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_comment_user_idx ON public.content_comment USING btree (user_id, created_at);


--
-- Name: content_report_one_per_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX content_report_one_per_target_idx ON public.content_report USING btree (reporter_user_id, target, COALESCE(content_comment_id, 0));


--
-- Name: content_report_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_report_open_idx ON public.content_report USING btree (created_at) WHERE ((status)::text = 'OPEN'::text);


--
-- Name: equipment_pack_name_ruleset_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX equipment_pack_name_ruleset_key ON public.equipment_pack USING btree (name, ruleset);


--
-- Name: feat_choice_option_feat_id_choice_option_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feat_choice_option_feat_id_choice_option_id_key ON public.feat_choice_option USING btree (feat_id, choice_option_id);


--
-- Name: feature_eng_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feature_eng_name_key ON public.feature USING btree (eng_name);


--
-- Name: feature_feature_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feature_feature_id_key ON public.feature USING btree (feature_id);


--
-- Name: fighting_style_eng_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fighting_style_eng_name_key ON public.fighting_style USING btree (eng_name);


--
-- Name: homebrew_entry_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX homebrew_entry_author_idx ON public.homebrew_entry USING btree (author_user_id);


--
-- Name: homebrew_entry_kind_ruleset_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX homebrew_entry_kind_ruleset_idx ON public.homebrew_entry USING btree (kind, ruleset) WHERE (deleted_at IS NULL);


--
-- Name: infusion_eng_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX infusion_eng_name_key ON public.infusion USING btree (eng_name);


--
-- Name: magic_item_eng_name_ruleset_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX magic_item_eng_name_ruleset_key ON public.magic_item USING btree (eng_name, ruleset);


--
-- Name: pers_additional_users_pers_id_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_additional_users_pers_id_user_id_key ON public.pers_additional_users USING btree (pers_id, user_id);


--
-- Name: pers_additional_users_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_additional_users_user_id_idx ON public.pers_additional_users USING btree (user_id);


--
-- Name: pers_bastion_facility_pers_bastion_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_bastion_facility_pers_bastion_id_idx ON public.pers_bastion_facility USING btree (pers_bastion_id);


--
-- Name: pers_bastion_pers_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_bastion_pers_id_key ON public.pers_bastion USING btree (pers_id);


--
-- Name: pers_bastion_turn_pers_bastion_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_bastion_turn_pers_bastion_id_idx ON public.pers_bastion_turn USING btree (pers_bastion_id);


--
-- Name: pers_feat_choice_pers_feat_id_choice_option_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_feat_choice_pers_feat_id_choice_option_id_key ON public.pers_feat_choice USING btree (pers_feat_id, choice_option_id);


--
-- Name: pers_feat_pers_id_feat_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_feat_pers_id_feat_id_idx ON public.pers_feat USING btree (pers_id, feat_id);


--
-- Name: pers_feature_pers_id_feature_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_feature_pers_id_feature_id_key ON public.pers_feature USING btree (pers_id, feature_id);


--
-- Name: pers_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_folder_id_idx ON public.pers USING btree (folder_id);


--
-- Name: pers_folder_member_folder_id_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_folder_member_folder_id_user_id_key ON public.pers_folder_member USING btree (folder_id, user_id);


--
-- Name: pers_folder_member_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_folder_member_user_id_idx ON public.pers_folder_member USING btree (user_id);


--
-- Name: pers_folder_parent_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_folder_parent_folder_id_idx ON public.pers_folder USING btree (parent_folder_id);


--
-- Name: pers_folder_share_token_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_folder_share_token_folder_id_idx ON public.pers_folder_share_token USING btree (folder_id);


--
-- Name: pers_folder_share_token_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_folder_share_token_token_key ON public.pers_folder_share_token USING btree (token);


--
-- Name: pers_folder_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_folder_user_id_idx ON public.pers_folder USING btree (user_id);


--
-- Name: pers_multiclass_pers_id_class_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_multiclass_pers_id_class_id_key ON public.pers_multiclass USING btree (pers_id, class_id);


--
-- Name: pers_offline_operation_pers_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_offline_operation_pers_id_idx ON public.pers_offline_operation USING btree (pers_id);


--
-- Name: pers_offline_operation_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_offline_operation_user_id_idx ON public.pers_offline_operation USING btree (user_id);


--
-- Name: pers_parentpersid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_parentpersid_idx ON public.pers USING btree (parentpersid);


--
-- Name: pers_resource_pool_pers_id_pool_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_resource_pool_pers_id_pool_key_key ON public.pers_resource_pool USING btree (pers_id, pool_key);


--
-- Name: pers_share_token_pers_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_share_token_pers_id_idx ON public.pers_share_token USING btree (pers_id);


--
-- Name: pers_share_token_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_share_token_token_key ON public.pers_share_token USING btree (token);


--
-- Name: pers_sharetoken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_sharetoken_key ON public.pers USING btree (sharetoken);


--
-- Name: pers_skill_pers_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_skill_pers_id_name_key ON public.pers_skill USING btree (pers_id, name);


--
-- Name: pers_spell_origin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_spell_origin_idx ON public.pers_spell USING btree (origin);


--
-- Name: pers_spell_pers_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_spell_pers_id_idx ON public.pers_spell USING btree (pers_id);


--
-- Name: pers_spell_pers_id_spell_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_spell_pers_id_spell_id_key ON public.pers_spell USING btree (pers_id, spell_id);


--
-- Name: pers_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_user_id_idx ON public.pers USING btree (user_id);


--
-- Name: pers_weapon_mastery_weapon_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_weapon_mastery_weapon_id_idx ON public.pers_weapon_mastery USING btree (weapon_id);


--
-- Name: pers_wildshape_one_active_per_pers; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_wildshape_one_active_per_pers ON public.pers_wildshape USING btree (pers_id) WHERE is_active;


--
-- Name: pers_wildshape_pers_id_creature_key_ruleset_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pers_wildshape_pers_id_creature_key_ruleset_key ON public.pers_wildshape USING btree (pers_id, creature_key, ruleset);


--
-- Name: pers_wildshape_pers_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pers_wildshape_pers_id_idx ON public.pers_wildshape USING btree (pers_id);


--
-- Name: problem_report_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX problem_report_created_at_idx ON public.problem_report USING btree (created_at);


--
-- Name: problem_report_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX problem_report_user_id_idx ON public.problem_report USING btree (user_id);


--
-- Name: race_choice_option_race_id_subrace_id_choice_group_name_opt_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX race_choice_option_race_id_subrace_id_choice_group_name_opt_key ON public.race_choice_option USING btree (race_id, subrace_id, choice_group_name, option_name);


--
-- Name: race_choice_option_spell_option_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX race_choice_option_spell_option_id_idx ON public.race_choice_option_spell USING btree (option_id);


--
-- Name: race_variant_trait_race_variant_id_feature_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX race_variant_trait_race_variant_id_feature_id_key ON public.race_variant_trait USING btree (race_variant_id, feature_id);


--
-- Name: subclass_choice_option_subclass_id_choice_option_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subclass_choice_option_subclass_id_choice_option_id_key ON public.subclass_choice_option USING btree (subclass_id, choice_option_id);


--
-- Name: subclass_class_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subclass_class_id_name_key ON public.subclass USING btree (class_id, name);


--
-- Name: subclass_feature_subclass_id_feature_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subclass_feature_subclass_id_feature_id_key ON public.subclass_feature USING btree (subclass_id, feature_id);


--
-- Name: subclass_spell_subclass_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subclass_spell_subclass_id_idx ON public.subclass_spell USING btree (subclass_id);


--
-- Name: subrace_trait_subrace_id_feature_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subrace_trait_subrace_id_feature_id_key ON public.subrace_trait USING btree (subrace_id, feature_id);


--
-- Name: user_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_email_key ON public."user" USING btree (email);


--
-- Name: _BackgroundToFeat _BackgroundToFeat_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_BackgroundToFeat"
    ADD CONSTRAINT "_BackgroundToFeat_A_fkey" FOREIGN KEY ("A") REFERENCES public.background(background_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _BackgroundToFeat _BackgroundToFeat_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_BackgroundToFeat"
    ADD CONSTRAINT "_BackgroundToFeat_B_fkey" FOREIGN KEY ("B") REFERENCES public.feat(feat_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ChoiceOptionToClassOptionalFeature _ChoiceOptionToClassOptionalFeature_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ChoiceOptionToClassOptionalFeature"
    ADD CONSTRAINT "_ChoiceOptionToClassOptionalFeature_A_fkey" FOREIGN KEY ("A") REFERENCES public.choice_option(option_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ChoiceOptionToClassOptionalFeature _ChoiceOptionToClassOptionalFeature_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ChoiceOptionToClassOptionalFeature"
    ADD CONSTRAINT "_ChoiceOptionToClassOptionalFeature_B_fkey" FOREIGN KEY ("B") REFERENCES public.class_optional_feature(option_feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ChoiceOptionToPers _ChoiceOptionToPers_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ChoiceOptionToPers"
    ADD CONSTRAINT "_ChoiceOptionToPers_A_fkey" FOREIGN KEY ("A") REFERENCES public.choice_option(option_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ChoiceOptionToPers _ChoiceOptionToPers_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ChoiceOptionToPers"
    ADD CONSTRAINT "_ChoiceOptionToPers_B_fkey" FOREIGN KEY ("B") REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ClassOptionalFeatureToPers _ClassOptionalFeatureToPers_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ClassOptionalFeatureToPers"
    ADD CONSTRAINT "_ClassOptionalFeatureToPers_A_fkey" FOREIGN KEY ("A") REFERENCES public.class_optional_feature(option_feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ClassOptionalFeatureToPers _ClassOptionalFeatureToPers_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ClassOptionalFeatureToPers"
    ADD CONSTRAINT "_ClassOptionalFeatureToPers_B_fkey" FOREIGN KEY ("B") REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _FeatGrantsFeature _FeatGrantsFeature_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_FeatGrantsFeature"
    ADD CONSTRAINT "_FeatGrantsFeature_A_fkey" FOREIGN KEY ("A") REFERENCES public.feat(feat_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _FeatGrantsFeature _FeatGrantsFeature_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_FeatGrantsFeature"
    ADD CONSTRAINT "_FeatGrantsFeature_B_fkey" FOREIGN KEY ("B") REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _FeatureToSpell _FeatureToSpell_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_FeatureToSpell"
    ADD CONSTRAINT "_FeatureToSpell_A_fkey" FOREIGN KEY ("A") REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _FeatureToSpell _FeatureToSpell_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_FeatureToSpell"
    ADD CONSTRAINT "_FeatureToSpell_B_fkey" FOREIGN KEY ("B") REFERENCES public.spell(spell_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _MagicItemToSpell _MagicItemToSpell_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_MagicItemToSpell"
    ADD CONSTRAINT "_MagicItemToSpell_A_fkey" FOREIGN KEY ("A") REFERENCES public.magic_item(magic_item_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _MagicItemToSpell _MagicItemToSpell_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_MagicItemToSpell"
    ADD CONSTRAINT "_MagicItemToSpell_B_fkey" FOREIGN KEY ("B") REFERENCES public.spell(spell_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _PersToRaceChoiceOption _PersToRaceChoiceOption_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PersToRaceChoiceOption"
    ADD CONSTRAINT "_PersToRaceChoiceOption_A_fkey" FOREIGN KEY ("A") REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _PersToRaceChoiceOption _PersToRaceChoiceOption_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PersToRaceChoiceOption"
    ADD CONSTRAINT "_PersToRaceChoiceOption_B_fkey" FOREIGN KEY ("B") REFERENCES public.race_choice_option(option_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _PersToRaceVariant _PersToRaceVariant_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PersToRaceVariant"
    ADD CONSTRAINT "_PersToRaceVariant_A_fkey" FOREIGN KEY ("A") REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _PersToRaceVariant _PersToRaceVariant_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PersToRaceVariant"
    ADD CONSTRAINT "_PersToRaceVariant_B_fkey" FOREIGN KEY ("B") REFERENCES public.race_variant(race_variant_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _PersToSpell _PersToSpell_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PersToSpell"
    ADD CONSTRAINT "_PersToSpell_A_fkey" FOREIGN KEY ("A") REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _PersToSpell _PersToSpell_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PersToSpell"
    ADD CONSTRAINT "_PersToSpell_B_fkey" FOREIGN KEY ("B") REFERENCES public.spell(spell_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _RaceVariantReplacingFeature _RaceVariantReplacingFeature_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_RaceVariantReplacingFeature"
    ADD CONSTRAINT "_RaceVariantReplacingFeature_A_fkey" FOREIGN KEY ("A") REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _RaceVariantReplacingFeature _RaceVariantReplacingFeature_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_RaceVariantReplacingFeature"
    ADD CONSTRAINT "_RaceVariantReplacingFeature_B_fkey" FOREIGN KEY ("B") REFERENCES public.race_variant(race_variant_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _SubclassExpandedSpells _SubclassExpandedSpells_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_SubclassExpandedSpells"
    ADD CONSTRAINT "_SubclassExpandedSpells_A_fkey" FOREIGN KEY ("A") REFERENCES public.spell(spell_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _SubclassExpandedSpells _SubclassExpandedSpells_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_SubclassExpandedSpells"
    ADD CONSTRAINT "_SubclassExpandedSpells_B_fkey" FOREIGN KEY ("B") REFERENCES public.subclass(subclass_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _SubraceReplacingFeature _SubraceReplacingFeature_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_SubraceReplacingFeature"
    ADD CONSTRAINT "_SubraceReplacingFeature_A_fkey" FOREIGN KEY ("A") REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _SubraceReplacingFeature _SubraceReplacingFeature_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_SubraceReplacingFeature"
    ADD CONSTRAINT "_SubraceReplacingFeature_B_fkey" FOREIGN KEY ("B") REFERENCES public.subrace(subrace_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: account account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: background background_origin_feat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.background
    ADD CONSTRAINT background_origin_feat_id_fkey FOREIGN KEY (origin_feat_id) REFERENCES public.feat(feat_id);


--
-- Name: choice_option_feature choice_option_feature_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.choice_option_feature
    ADD CONSTRAINT choice_option_feature_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: choice_option_feature choice_option_feature_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.choice_option_feature
    ADD CONSTRAINT choice_option_feature_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.choice_option(option_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_choice_option class_choice_option_choice_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_choice_option
    ADD CONSTRAINT class_choice_option_choice_option_id_fkey FOREIGN KEY (choice_option_id) REFERENCES public.choice_option(option_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_choice_option class_choice_option_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_choice_option
    ADD CONSTRAINT class_choice_option_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(class_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_feature class_feature_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_feature
    ADD CONSTRAINT class_feature_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(class_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_feature class_feature_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_feature
    ADD CONSTRAINT class_feature_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_optional_feature class_optional_feature_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_optional_feature
    ADD CONSTRAINT class_optional_feature_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(class_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_optional_feature class_optional_feature_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_optional_feature
    ADD CONSTRAINT class_optional_feature_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_optional_feature_replaces_feature class_optional_feature_replaces_feature_class_optional_fea_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_optional_feature_replaces_feature
    ADD CONSTRAINT class_optional_feature_replaces_feature_class_optional_fea_fkey FOREIGN KEY (class_optional_feature_id) REFERENCES public.class_optional_feature(option_feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_optional_feature_replaces_feature class_optional_feature_replaces_feature_replaced_feature_i_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_optional_feature_replaces_feature
    ADD CONSTRAINT class_optional_feature_replaces_feature_replaced_feature_i_fkey FOREIGN KEY (replaced_feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_starting_equipment_option class_starting_equipment_option_armor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_starting_equipment_option
    ADD CONSTRAINT class_starting_equipment_option_armor_id_fkey FOREIGN KEY (armor_id) REFERENCES public.armor(armor_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: class_starting_equipment_option class_starting_equipment_option_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_starting_equipment_option
    ADD CONSTRAINT class_starting_equipment_option_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(class_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_starting_equipment_option class_starting_equipment_option_equipment_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_starting_equipment_option
    ADD CONSTRAINT class_starting_equipment_option_equipment_pack_id_fkey FOREIGN KEY (equipment_pack_id) REFERENCES public.equipment_pack(equipment_pack_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: class_starting_equipment_option class_starting_equipment_option_weapon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_starting_equipment_option
    ADD CONSTRAINT class_starting_equipment_option_weapon_id_fkey FOREIGN KEY (weapon_id) REFERENCES public.weapon(weapon_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: content_comment content_comment_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_comment
    ADD CONSTRAINT content_comment_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.content_comment(content_comment_id) ON DELETE CASCADE;


--
-- Name: content_comment content_comment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_comment
    ADD CONSTRAINT content_comment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE CASCADE;


--
-- Name: content_comment_vote content_comment_vote_content_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_comment_vote
    ADD CONSTRAINT content_comment_vote_content_comment_id_fkey FOREIGN KEY (content_comment_id) REFERENCES public.content_comment(content_comment_id) ON DELETE CASCADE;


--
-- Name: content_comment_vote content_comment_vote_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_comment_vote
    ADD CONSTRAINT content_comment_vote_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE CASCADE;


--
-- Name: content_report content_report_content_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_report
    ADD CONSTRAINT content_report_content_comment_id_fkey FOREIGN KEY (content_comment_id) REFERENCES public.content_comment(content_comment_id) ON DELETE CASCADE;


--
-- Name: content_report content_report_reporter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_report
    ADD CONSTRAINT content_report_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES public."user"(user_id) ON DELETE CASCADE;


--
-- Name: content_report content_report_resolved_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_report
    ADD CONSTRAINT content_report_resolved_by_user_id_fkey FOREIGN KEY (resolved_by_user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: content_vote content_vote_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_vote
    ADD CONSTRAINT content_vote_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE CASCADE;


--
-- Name: feat_choice_option feat_choice_option_choice_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feat_choice_option
    ADD CONSTRAINT feat_choice_option_choice_option_id_fkey FOREIGN KEY (choice_option_id) REFERENCES public.choice_option(option_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: feat_choice_option feat_choice_option_feat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feat_choice_option
    ADD CONSTRAINT feat_choice_option_feat_id_fkey FOREIGN KEY (feat_id) REFERENCES public.feat(feat_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spell_classes fk_spell_classes; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell_classes
    ADD CONSTRAINT fk_spell_classes FOREIGN KEY (spell_id) REFERENCES public.spell(spell_id);


--
-- Name: homebrew_creature homebrew_creature_homebrew_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homebrew_creature
    ADD CONSTRAINT homebrew_creature_homebrew_entry_id_fkey FOREIGN KEY (homebrew_entry_id) REFERENCES public.homebrew_entry(homebrew_entry_id) ON DELETE CASCADE;


--
-- Name: homebrew_entry homebrew_entry_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homebrew_entry
    ADD CONSTRAINT homebrew_entry_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES public."user"(user_id) ON DELETE CASCADE;


--
-- Name: homebrew_spell homebrew_spell_homebrew_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homebrew_spell
    ADD CONSTRAINT homebrew_spell_homebrew_entry_id_fkey FOREIGN KEY (homebrew_entry_id) REFERENCES public.homebrew_entry(homebrew_entry_id) ON DELETE CASCADE;


--
-- Name: infusion infusion_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infusion
    ADD CONSTRAINT infusion_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: infusion infusion_replicated_magic_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infusion
    ADD CONSTRAINT infusion_replicated_magic_item_id_fkey FOREIGN KEY (replicated_magic_item_id) REFERENCES public.magic_item(magic_item_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pers_additional_users pers_additional_users_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_additional_users
    ADD CONSTRAINT pers_additional_users_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_additional_users pers_additional_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_additional_users
    ADD CONSTRAINT pers_additional_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_armor pers_armor_armor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_armor
    ADD CONSTRAINT pers_armor_armor_id_fkey FOREIGN KEY (armor_id) REFERENCES public.armor(armor_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_armor pers_armor_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_armor
    ADD CONSTRAINT pers_armor_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers pers_background_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers
    ADD CONSTRAINT pers_background_id_fkey FOREIGN KEY (background_id) REFERENCES public.background(background_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_bastion_facility pers_bastion_facility_pers_bastion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_bastion_facility
    ADD CONSTRAINT pers_bastion_facility_pers_bastion_id_fkey FOREIGN KEY (pers_bastion_id) REFERENCES public.pers_bastion(pers_bastion_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_bastion pers_bastion_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_bastion
    ADD CONSTRAINT pers_bastion_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_bastion_turn pers_bastion_turn_pers_bastion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_bastion_turn
    ADD CONSTRAINT pers_bastion_turn_pers_bastion_id_fkey FOREIGN KEY (pers_bastion_id) REFERENCES public.pers_bastion(pers_bastion_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers pers_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers
    ADD CONSTRAINT pers_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(class_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_effect pers_effect_homebrew_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_effect
    ADD CONSTRAINT pers_effect_homebrew_entry_id_fkey FOREIGN KEY (homebrew_entry_id) REFERENCES public.homebrew_entry(homebrew_entry_id) ON DELETE SET NULL;


--
-- Name: pers_effect pers_effect_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_effect
    ADD CONSTRAINT pers_effect_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON DELETE CASCADE;


--
-- Name: pers_effect pers_effect_spell_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_effect
    ADD CONSTRAINT pers_effect_spell_id_fkey FOREIGN KEY (spell_id) REFERENCES public.spell(spell_id) ON DELETE SET NULL;


--
-- Name: pers_feat_choice pers_feat_choice_choice_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feat_choice
    ADD CONSTRAINT pers_feat_choice_choice_option_id_fkey FOREIGN KEY (choice_option_id) REFERENCES public.choice_option(option_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_feat_choice pers_feat_choice_pers_feat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feat_choice
    ADD CONSTRAINT pers_feat_choice_pers_feat_id_fkey FOREIGN KEY (pers_feat_id) REFERENCES public.pers_feat(pers_feat_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_feat pers_feat_feat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feat
    ADD CONSTRAINT pers_feat_feat_id_fkey FOREIGN KEY (feat_id) REFERENCES public.feat(feat_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_feat pers_feat_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feat
    ADD CONSTRAINT pers_feat_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_feature_description pers_feature_description_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feature_description
    ADD CONSTRAINT pers_feature_description_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON DELETE CASCADE;


--
-- Name: pers_feature pers_feature_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feature
    ADD CONSTRAINT pers_feature_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_feature pers_feature_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_feature
    ADD CONSTRAINT pers_feature_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers pers_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers
    ADD CONSTRAINT pers_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.pers_folder(folder_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pers_folder_member pers_folder_member_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder_member
    ADD CONSTRAINT pers_folder_member_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.pers_folder(folder_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_folder_member pers_folder_member_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder_member
    ADD CONSTRAINT pers_folder_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_folder pers_folder_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder
    ADD CONSTRAINT pers_folder_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.pers_folder(folder_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pers_folder_share_token pers_folder_share_token_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder_share_token
    ADD CONSTRAINT pers_folder_share_token_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.pers_folder(folder_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_folder pers_folder_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_folder
    ADD CONSTRAINT pers_folder_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_homebrew_spell pers_homebrew_spell_homebrew_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_homebrew_spell
    ADD CONSTRAINT pers_homebrew_spell_homebrew_entry_id_fkey FOREIGN KEY (homebrew_entry_id) REFERENCES public.homebrew_entry(homebrew_entry_id) ON DELETE CASCADE;


--
-- Name: pers_homebrew_spell pers_homebrew_spell_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_homebrew_spell
    ADD CONSTRAINT pers_homebrew_spell_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON DELETE CASCADE;


--
-- Name: pers_infusion pers_infusion_infusion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_infusion
    ADD CONSTRAINT pers_infusion_infusion_id_fkey FOREIGN KEY (infusion_id) REFERENCES public.infusion(infusion_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_infusion pers_infusion_pers_armor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_infusion
    ADD CONSTRAINT pers_infusion_pers_armor_id_fkey FOREIGN KEY (pers_armor_id) REFERENCES public.pers_armor(pers_armor_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_infusion pers_infusion_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_infusion
    ADD CONSTRAINT pers_infusion_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_infusion pers_infusion_pers_magic_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_infusion
    ADD CONSTRAINT pers_infusion_pers_magic_item_id_fkey FOREIGN KEY (pers_magic_item_id) REFERENCES public.pers_magic_item(pers_magic_item_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_infusion pers_infusion_pers_weapon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_infusion
    ADD CONSTRAINT pers_infusion_pers_weapon_id_fkey FOREIGN KEY (pers_weapon_id) REFERENCES public.pers_weapon(pers_weapon_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_magic_item pers_magic_item_magic_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_magic_item
    ADD CONSTRAINT pers_magic_item_magic_item_id_fkey FOREIGN KEY (magic_item_id) REFERENCES public.magic_item(magic_item_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_magic_item pers_magic_item_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_magic_item
    ADD CONSTRAINT pers_magic_item_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_multiclass pers_multiclass_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_multiclass
    ADD CONSTRAINT pers_multiclass_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(class_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_multiclass pers_multiclass_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_multiclass
    ADD CONSTRAINT pers_multiclass_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_multiclass pers_multiclass_subclass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_multiclass
    ADD CONSTRAINT pers_multiclass_subclass_id_fkey FOREIGN KEY (subclass_id) REFERENCES public.subclass(subclass_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_offline_operation pers_offline_operation_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_offline_operation
    ADD CONSTRAINT pers_offline_operation_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_offline_operation pers_offline_operation_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_offline_operation
    ADD CONSTRAINT pers_offline_operation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers pers_race_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers
    ADD CONSTRAINT pers_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.race(race_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_resource_pool pers_resource_pool_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_resource_pool
    ADD CONSTRAINT pers_resource_pool_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_share_token pers_share_token_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_share_token
    ADD CONSTRAINT pers_share_token_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_skill pers_skill_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_skill
    ADD CONSTRAINT pers_skill_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_spell pers_spell_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_spell
    ADD CONSTRAINT pers_spell_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_spell pers_spell_spell_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_spell
    ADD CONSTRAINT pers_spell_spell_id_fkey FOREIGN KEY (spell_id) REFERENCES public.spell(spell_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers pers_subclass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers
    ADD CONSTRAINT pers_subclass_id_fkey FOREIGN KEY (subclass_id) REFERENCES public.subclass(subclass_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers pers_subrace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers
    ADD CONSTRAINT pers_subrace_id_fkey FOREIGN KEY (subrace_id) REFERENCES public.subrace(subrace_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers pers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers
    ADD CONSTRAINT pers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_weapon_mastery pers_weapon_mastery_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_weapon_mastery
    ADD CONSTRAINT pers_weapon_mastery_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_weapon_mastery pers_weapon_mastery_weapon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_weapon_mastery
    ADD CONSTRAINT pers_weapon_mastery_weapon_id_fkey FOREIGN KEY (weapon_id) REFERENCES public.weapon(weapon_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_weapon pers_weapon_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_weapon
    ADD CONSTRAINT pers_weapon_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pers_weapon pers_weapon_weapon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_weapon
    ADD CONSTRAINT pers_weapon_weapon_id_fkey FOREIGN KEY (weapon_id) REFERENCES public.weapon(weapon_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pers_wildshape pers_wildshape_pers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pers_wildshape
    ADD CONSTRAINT pers_wildshape_pers_id_fkey FOREIGN KEY (pers_id) REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: problem_report problem_report_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problem_report
    ADD CONSTRAINT problem_report_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: race_choice_option race_choice_option_race_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option
    ADD CONSTRAINT race_choice_option_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.race(race_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: race_choice_option_spell race_choice_option_spell_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option_spell
    ADD CONSTRAINT race_choice_option_spell_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.race_choice_option(option_id) ON DELETE CASCADE;


--
-- Name: race_choice_option_spell race_choice_option_spell_spell_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option_spell
    ADD CONSTRAINT race_choice_option_spell_spell_id_fkey FOREIGN KEY (spell_id) REFERENCES public.spell(spell_id) ON DELETE RESTRICT;


--
-- Name: race_choice_option race_choice_option_subrace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option
    ADD CONSTRAINT race_choice_option_subrace_id_fkey FOREIGN KEY (subrace_id) REFERENCES public.subrace(subrace_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: race_choice_option race_choice_option_trait_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option
    ADD CONSTRAINT race_choice_option_trait_feature_id_fkey FOREIGN KEY (trait_feature_id) REFERENCES public.feature(feature_id) ON DELETE SET NULL;


--
-- Name: race_choice_option_trait race_choice_option_trait_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option_trait
    ADD CONSTRAINT race_choice_option_trait_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: race_choice_option_trait race_choice_option_trait_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_choice_option_trait
    ADD CONSTRAINT race_choice_option_trait_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.race_choice_option(option_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: race_trait race_trait_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_trait
    ADD CONSTRAINT race_trait_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: race_trait race_trait_race_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_trait
    ADD CONSTRAINT race_trait_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.race(race_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: race_variant race_variant_race_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_variant
    ADD CONSTRAINT race_variant_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.race(race_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: race_variant_trait race_variant_trait_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_variant_trait
    ADD CONSTRAINT race_variant_trait_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: race_variant_trait race_variant_trait_race_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_variant_trait
    ADD CONSTRAINT race_variant_trait_race_variant_id_fkey FOREIGN KEY (race_variant_id) REFERENCES public.race_variant(race_variant_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spell_races spell_races_spell_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spell_races
    ADD CONSTRAINT spell_races_spell_id_fkey FOREIGN KEY (spell_id) REFERENCES public.spell(spell_id);


--
-- Name: subclass_choice_option subclass_choice_option_choice_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_choice_option
    ADD CONSTRAINT subclass_choice_option_choice_option_id_fkey FOREIGN KEY (choice_option_id) REFERENCES public.choice_option(option_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subclass_choice_option subclass_choice_option_subclass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_choice_option
    ADD CONSTRAINT subclass_choice_option_subclass_id_fkey FOREIGN KEY (subclass_id) REFERENCES public.subclass(subclass_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subclass subclass_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass
    ADD CONSTRAINT subclass_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(class_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subclass_feature subclass_feature_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_feature
    ADD CONSTRAINT subclass_feature_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subclass_feature subclass_feature_subclass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_feature
    ADD CONSTRAINT subclass_feature_subclass_id_fkey FOREIGN KEY (subclass_id) REFERENCES public.subclass(subclass_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subclass_spell subclass_spell_spell_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_spell
    ADD CONSTRAINT subclass_spell_spell_id_fkey FOREIGN KEY (spell_id) REFERENCES public.spell(spell_id) ON DELETE RESTRICT;


--
-- Name: subclass_spell subclass_spell_subclass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subclass_spell
    ADD CONSTRAINT subclass_spell_subclass_id_fkey FOREIGN KEY (subclass_id) REFERENCES public.subclass(subclass_id) ON DELETE CASCADE;


--
-- Name: subrace subrace_race_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subrace
    ADD CONSTRAINT subrace_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.race(race_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subrace_trait subrace_trait_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subrace_trait
    ADD CONSTRAINT subrace_trait_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subrace_trait subrace_trait_subrace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subrace_trait
    ADD CONSTRAINT subrace_trait_subrace_id_fkey FOREIGN KEY (subrace_id) REFERENCES public.subrace(subrace_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict spellsSchemaBaseline


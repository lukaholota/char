import {
  Ability,
  ArmorType,
  Classes,
  Prisma,
  PrismaClient,
  Ruleset,
  SpellcastingType,
  Subclasses,
  WeaponType,
} from "@prisma/client";
import { readCatalogProse2014 } from "./catalogProse2014";

type SubclassSeed = Omit<Prisma.SubclassCreateInput, "class" | "name"> & {
  name: Subclasses;
  classConnect: Classes;
};

const ACTIVE_RULESET: Ruleset = "RULES_2014";

/// Дані лежать на рівні модуля, бо їх читає ще й адресний синк тексту
/// `subclassFeatureText2014.ts`. Другого примірника рядка бути не може — саме розбіжність
/// копій ховала зняті форми термінів у корпусі.
const SUBCLASS_SEED_INPUTS: SubclassSeed[] = [
    // ==== Artificer ====
    {
      name: Subclasses.ALCHEMIST,
      spellcastingType: SpellcastingType.HALF,
      classConnect: Classes.ARTIFICER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ARMORER,
      spellcastingType: SpellcastingType.HALF,
      classConnect: Classes.ARTIFICER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ARTILLERIST,
      spellcastingType: SpellcastingType.HALF,
      classConnect: Classes.ARTIFICER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.BATTLE_SMITH,
      spellcastingType: SpellcastingType.HALF,
      classConnect: Classes.ARTIFICER_2014,
      expandedSpells: { connect: [] },
    },

    {
      name: Subclasses.ARCANE_ARCHER,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.BANNERET,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.BATTLE_MASTER,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CAVALIER,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CHAMPION,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ECHO_KNIGHT,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ELDRITCH_KNIGHT,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.THIRD,
      grantsSpells: true,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PSI_WARRIOR,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.RUNE_KNIGHT,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SAMURAI,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.FIGHTER_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Barbarian ====
    {
      name: Subclasses.PATH_OF_THE_ANCESTRAL_GUARDIAN,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_BATTLERAGER,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_BEAST,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_BERSERKER,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_GIANT,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_STORM_HERALD,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_TOTEM_WARRIOR,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_WILD_MAGIC,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PATH_OF_THE_ZEALOT,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.BARBARIAN_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Cleric ====
    {
      name: Subclasses.ARCANA_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.DEATH_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FORGE_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.GRAVE_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.KNOWLEDGE_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.LIFE_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.LIGHT_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.NATURE_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ORDER_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PEACE_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.TEMPEST_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.TRICKERY_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.TWILIGHT_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAR_DOMAIN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.CLERIC_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Warlock ====
    {
      name: Subclasses.ARCHFEY,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FIEND,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.GREAT_OLD_ONE,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.HEXBLADE,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      armorProficiencies: [ArmorType.MEDIUM, ArmorType.SHIELD],
      weaponProficiencies: [WeaponType.MARTIAL_WEAPON],
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CELESTIAL,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FATHOMLESS,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.THE_GENIE,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.UNDEAD,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.UNDYING,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.PACT,
      grantsSpells: true,
      classConnect: Classes.WARLOCK_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Sorcerer ====
    {
      name: Subclasses.ABERRANT_MIND,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CLOCKWORK_SOUL,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.DRACONIC_BLOODLINE,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.DIVINE_SOUL,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.LUNAR_SORCERY,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SHADOW_MAGIC,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.STORM_SORCERY,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WILD_MAGIC,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.SORCERER_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Wizard ====
    {
      name: Subclasses.SCHOOL_OF_ABJURATION,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_BLADESINGING,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_CHRONURGY,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_CONJURATION,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_DIVINATION,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_ENCHANTMENT,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_EVOCATION,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_GRAVITURGY,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_ILLUSION,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_NECROMANCY,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ORDER_OF_SCRIBES,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_TRANSMUTATION,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCHOOL_OF_WAR_MAGIC,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.WIZARD_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Druid ====
    {
      name: Subclasses.CIRCLE_OF_DREAMS,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_THE_LAND,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_THE_MOON,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_THE_SHEPHERD,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_SPORES,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_STARS,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.CIRCLE_OF_WILDFIRE,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.DRUID_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Paladin ====
    {
      name: Subclasses.OATH_OF_THE_ANCIENTS,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_CONQUEST,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_THE_CROWN,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_DEVOTION,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_GLORY,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_REDEMPTION,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_VENGEANCE,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATH_OF_THE_WATCHERS,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.OATHBREAKER,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.PALADIN_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Ranger ====
    {
      name: Subclasses.BEAST_MASTER_CONCLAVE,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.DRAKEWARDEN,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.FEY_WANDERER,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.GLOOM_STALKER_CONCLAVE,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.HORIZON_WALKER_CONCLAVE,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.HUNTER_CONCLAVE,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.MONSTER_SLAYER_CONCLAVE,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SWARMKEEPER,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.HALF,
      grantsSpells: true,
      classConnect: Classes.RANGER_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Bard ====
    {
      name: Subclasses.COLLEGE_OF_CREATION,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_ELOQUENCE,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_GLAMOUR,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_LORE,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_SPIRITS,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_SWORDS,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_VALOR,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.COLLEGE_OF_WHISPERS,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.FULL,
      grantsSpells: true,
      classConnect: Classes.BARD_2014,
      expandedSpells: { connect: [] },
    },

    // ==== Rogue ====
    {
      name: Subclasses.ARCANE_TRICKSTER,
      primaryCastingStat: Ability.INT,
      spellcastingType: SpellcastingType.THIRD,
      grantsSpells: true,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.ASSASSIN,
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.INQUISITIVE,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.MASTERMIND,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.PHANTOM,
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SCOUT,
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SOULKNIFE,
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.SWASHBUCKLER,
      primaryCastingStat: Ability.CHA,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.THIEF,
      primaryCastingStat: Ability.DEX,
      spellcastingType: SpellcastingType.NONE,
      grantsSpells: false,
      classConnect: Classes.ROGUE_2014,
      expandedSpells: { connect: [] },
    },

    {
      name: Subclasses.WAY_OF_MERCY,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_ASCENDANT_DRAGON,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_ASTRAL_SELF,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_DRUNKEN_MASTER,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_FOUR_ELEMENTS,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_KENSEI,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_LONG_DEATH,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_OPEN_HAND,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_SHADOW,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
    {
      name: Subclasses.WAY_OF_THE_SUN_SOUL,
      primaryCastingStat: Ability.WIS,
      spellcastingType: SpellcastingType.NONE,
      classConnect: Classes.MONK_2014,
      expandedSpells: { connect: [] },
    },
];

export function readSubclassSeedInputs(): SubclassSeed[] {
  const proseByKey = new Map(readCatalogProse2014("subclasses").map((entry) => [entry.key, entry.description]));
  return SUBCLASS_SEED_INPUTS.map((input) => attachCatalogProse(input, proseByKey.get(input.name)));
}

/// KR33.7: опис, звірений із джерелом, живе в `data/2014/catalog-prose/subclasses.json`, а
/// самописний рядок із цього модуля тоді прибирається — двох копій одного опису не буває.
function attachCatalogProse(input: SubclassSeed, prose: string | undefined): SubclassSeed {
  if (prose === undefined) return input;
  if (input.description !== undefined) {
    throw new Error(`${input.name}: опис і в subclassSeed.ts, і в data/2014/catalog-prose/subclasses.json`);
  }
  return { ...input, description: prose };
}

export const seedSubclasses = async (prisma: PrismaClient) => {
  console.log("Створюємо підкласи...");

  const subclasses = readSubclassSeedInputs();

  for (const subclass of subclasses) {
    const { classConnect, ...data } = subclass;
    const cls = await prisma.class.findUnique({
      where: { name_ruleset: { name: classConnect, ruleset: ACTIVE_RULESET } },
    });

    if (!cls) {
      console.error(
        "💀 КЛАС НЕ ЗНАЙДЕНО:",
        classConnect,
        "для підкласу:",
        subclass.name,
      );
      throw new Error(
        `Class ${classConnect} not found for subclass ${subclass.name}`,
      );
    }

    await prisma.subclass.upsert({
      where: {
        classId_name: {
          classId: cls.classId,
          name: subclass.name,
        },
      },
      update: {
        ...data,
        class: {
          connect: { name_ruleset: { name: classConnect, ruleset: ACTIVE_RULESET } },
        },
      },
      create: {
        ...data,
        class: {
          connect: { name_ruleset: { name: classConnect, ruleset: ACTIVE_RULESET } },
        },
      },
    });
  }

  console.log(`Готово. Оновлено ${subclasses.length} підкласів.`);
};

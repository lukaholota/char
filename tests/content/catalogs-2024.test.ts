import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getAllSpells, getSpellById, getSpellByIdOrSlug } from "@/lib/spellsData";
import { getAllMagicItems, getMagicItemById } from "@/lib/magicItemsData";
import { getAllFeats, getFeatById, getFeatByIdOrSlug } from "@/lib/featsData";
import { getAllCreatures, getCreatureById, getCreatureByIdOrSlug } from "@/lib/bestiaryData";

import {
  getSpellSchoolVisual,
  getMagicItemTypeVisual,
  getFeatVisual,
  getCreatureVisual,
} from "@/components/catalogs/catalog-visuals";
import {
  Sword,
  Shield,
  FlaskConical,
  Scroll,
  CircleDot,
  Wand2,
  Sparkles,
  Award,
  Crown,
  Swords,
  PawPrint,
  Skull,
  Sun,
  Flame,
  Bot,
  Wind,
  Zap,
  User,
  Eye,
} from "lucide-react";

/// Каталог 2014 більше не рахується числом у тесті: KR16.2 злив два дублікати, 501 стало 499,
/// і друге написане від руки число протухло б так само. Розмір бере ратифікований перелік назв
/// у dictionary.json; що він сам не розходиться з каталогом, тримає ratified-spell-names.test.ts.
function countRatifiedSpellNames(): number {
  const dictionary = JSON.parse(
    readFileSync(join(process.cwd(), "src/lib/refs/dictionary.json"), "utf-8"),
  ) as { SPELLS: unknown[] };

  return dictionary.SPELLS.length;
}

describe("KR7.3 / KR8.3 — 2024 Catalogs Content & Visuals", () => {
  describe("Spells 2024 catalog data", () => {
    it("returns 391 spells for RULES_2024 and one per ratified name for RULES_2014", () => {
      const spells2024 = getAllSpells("RULES_2024");
      const spells2014 = getAllSpells("RULES_2014");

      expect(spells2024.length).toBe(391);
      expect(spells2014.length).toBe(countRatifiedSpellNames());
    });

    it("has properly assigned spell classes and metadata on 2024 spells", () => {
      const spells2024 = getAllSpells("RULES_2024");
      for (const spell of spells2024) {
        expect(spell.spellId).toBeGreaterThanOrEqual(20000);
        expect(spell.name).toBeTruthy();
        expect(spell.engName).toBeTruthy();
        expect(spell.ruleset).toBe("RULES_2024");
        expect(spell.source).toBe("PHB_2024");
        expect(spell.spellClasses.length).toBeGreaterThan(0);
      }
    });

    it("retrieves spells by ID and by slug/name in 2024 ruleset", () => {
      const spell = getSpellByIdOrSlug("Acid Splash", "RULES_2024");
      expect(spell).toBeDefined();
      expect(spell?.engName).toBe("Acid Splash");
      expect(spell?.ruleset).toBe("RULES_2024");

      const spellById = getSpellById(spell!.spellId, "RULES_2024");
      expect(spellById?.engName).toBe("Acid Splash");
    });
  });

  describe("Magic Items 2024 catalog data", () => {
    it("returns 445 items for RULES_2024 and 472 items for RULES_2014", () => {
      const items2024 = getAllMagicItems("RULES_2024");
      const items2014 = getAllMagicItems("RULES_2014");

      expect(items2024.length).toBe(445);
      expect(items2014.length).toBe(472);
    });

    it("has valid rarities, item types, and attunement properties on 2024 items", () => {
      const items2024 = getAllMagicItems("RULES_2024");
      for (const item of items2024) {
        expect(item.magicItemId).toBeGreaterThanOrEqual(20000);
        expect(item.name).toBeTruthy();
        expect(item.engName).toBeTruthy();
        expect(item.ruleset).toBe("RULES_2024");
        expect(["COMMON", "UNCOMMON", "RARE", "VERY_RARE", "LEGENDARY", "ARTIFACT"]).toContain(item.rarity);
        expect(typeof item.requiresAttunement).toBe("boolean");
      }
    });

    it("retrieves magic item by ID in 2024 ruleset", () => {
      const item = getMagicItemById(20001, "RULES_2024");
      expect(item).toBeDefined();
      expect(item?.engName).toBe("Adamantine Armor");
    });
  });

  describe("Feats 2024 catalog data", () => {
    it("returns 75 feats for RULES_2024 and 92 feats for RULES_2014", () => {
      const feats2024 = getAllFeats("RULES_2024");
      const feats2014 = getAllFeats("RULES_2014");

      expect(feats2024.length).toBe(75);
      expect(feats2014.length).toBe(92);
    });

    it("correctly categorizes all 4 2024 feat categories", () => {
      const feats2024 = getAllFeats("RULES_2024");
      const originFeats = feats2024.filter((f) => f.category === "ORIGIN");
      const generalFeats = feats2024.filter((f) => f.category === "GENERAL");
      const epicBoonFeats = feats2024.filter((f) => f.category === "EPIC_BOON");
      const fightingStyleFeats = feats2024.filter((f) => f.category === "FIGHTING_STYLE");

      expect(originFeats.length).toBe(10);
      expect(generalFeats.length).toBe(43);
      expect(epicBoonFeats.length).toBe(12);
      expect(fightingStyleFeats.length).toBe(10);
    });

    it("retrieves feat by ID or slug in 2024 ruleset", () => {
      const feat = getFeatByIdOrSlug("Actor", "RULES_2024");
      expect(feat).toBeDefined();
      expect(feat?.name).toBe("Актор");
      expect(feat?.category).toBe("GENERAL");

      const featById = getFeatById(feat!.featId, "RULES_2024");
      expect(featById?.engName).toBe("Actor");
    });
  });

  describe("Bestiary 2024 & 2014 catalog data", () => {
    it("loads creatures for both 2014 and 2024 rulesets", () => {
      const creatures2024 = getAllCreatures("RULES_2024");
      const creatures2014 = getAllCreatures("RULES_2014");

      expect(creatures2024.length).toBeGreaterThan(0);
      expect(creatures2014.length).toBeGreaterThan(0);
    });

    it("has complete statblock fields on 2024 summon creatures", () => {
      const creatures2024 = getAllCreatures("RULES_2024");
      for (const creature of creatures2024) {
        expect(creature.name).toBeTruthy();
        expect(creature.nameEng).toBeTruthy();
        expect(creature.size).toBeTruthy();
        expect(creature.type).toBeTruthy();
        expect(creature.ac).toBeTruthy();
        expect(creature.hp).toBeTruthy();
        expect(creature.speed).toBeTruthy();
        expect(creature.strength).toBeTruthy();
        expect(creature.dexterity).toBeTruthy();
        expect(creature.constitution).toBeTruthy();
        expect(creature.intelligence).toBeTruthy();
        expect(creature.wisdom).toBeTruthy();
        expect(creature.charisma).toBeTruthy();
        // Не «дії», а «хоч одна секція»: Shrieker Fungus з MM 2024 має лише реакцію.
        const sections = [
          creature.specialAbilities,
          creature.actions,
          creature.bonusActions ?? "",
          creature.reactions,
          creature.legendaryActions,
        ].join("");
        expect(sections).toBeTruthy();
      }
    });

    it("retrieves creature by ID or slug in 2024 ruleset", () => {
      const creature = getCreatureByIdOrSlug("Bestial Spirit", "RULES_2024");
      expect(creature).toBeDefined();
      expect(creature?.nameEng).toBe("Bestial Spirit");

      const creatureById = getCreatureById(creature!.creatureId, "RULES_2024");
      expect(creatureById?.nameEng).toBe("Bestial Spirit");
    });

    it("has valid Ukrainian creature types (e.g. Construct Spirit is 'Конструкт')", () => {
      const construct = getCreatureByIdOrSlug("Construct Spirit", "RULES_2024");
      expect(construct).toBeDefined();
      expect(construct?.type).toBe("Конструкт");
    });
  });

  describe("Catalog Visuals & Icons (KR8.3)", () => {
    it("maps spell schools to correct visual icons", () => {
      expect(getSpellSchoolVisual("EVOCATION").icon).toBe(Flame);
      expect(getSpellSchoolVisual("NECROMANCY").icon).toBe(Skull);
      expect(getSpellSchoolVisual("ABJURATION").icon).toBe(Shield);
    });

    it("maps magic item types to correct thematic icons", () => {
      expect(getMagicItemTypeVisual("WEAPON").icon).toBe(Sword);
      expect(getMagicItemTypeVisual("Зброя").icon).toBe(Sword);
      expect(getMagicItemTypeVisual("ARMOR").icon).toBe(Shield);
      expect(getMagicItemTypeVisual("Обладунок").icon).toBe(Shield);
      expect(getMagicItemTypeVisual("POTION").icon).toBe(FlaskConical);
      expect(getMagicItemTypeVisual("Зілля").icon).toBe(FlaskConical);
      expect(getMagicItemTypeVisual("SCROLL").icon).toBe(Scroll);
      expect(getMagicItemTypeVisual("Сувій").icon).toBe(Scroll);
      expect(getMagicItemTypeVisual("RING").icon).toBe(CircleDot);
      expect(getMagicItemTypeVisual("Перстень").icon).toBe(CircleDot);
      expect(getMagicItemTypeVisual("WAND").icon).toBe(Wand2);
      expect(getMagicItemTypeVisual("Паличка").icon).toBe(Wand2);
      expect(getMagicItemTypeVisual("WONDROUS_ITEM").icon).toBe(Sparkles);
    });

    it("maps feat categories to correct thematic icons", () => {
      expect(getFeatVisual("ORIGIN").icon).toBe(Sparkles);
      expect(getFeatVisual("Походження").icon).toBe(Sparkles);
      expect(getFeatVisual("GENERAL").icon).toBe(Award);
      expect(getFeatVisual("EPIC_BOON").icon).toBe(Crown);
      expect(getFeatVisual("Епічні").icon).toBe(Crown);
      expect(getFeatVisual("FIGHTING_STYLE").icon).toBe(Swords);
      expect(getFeatVisual("Бойовий стиль").icon).toBe(Swords);
    });

    it("maps creature types to correct thematic icons", () => {
      expect(getCreatureVisual("Звір").icon).toBe(PawPrint);
      expect(getCreatureVisual("Beast").icon).toBe(PawPrint);
      expect(getCreatureVisual("Нежить").icon).toBe(Skull);
      expect(getCreatureVisual("Undead").icon).toBe(Skull);
      expect(getCreatureVisual("Небожитель").icon).toBe(Sun);
      expect(getCreatureVisual("Celestial").icon).toBe(Sun);
      expect(getCreatureVisual("Дракон").icon).toBe(Flame);
      expect(getCreatureVisual("Dragon").icon).toBe(Flame);
      expect(getCreatureVisual("Фея").icon).toBe(Sparkles);
      expect(getCreatureVisual("Fey").icon).toBe(Sparkles);
      expect(getCreatureVisual("Конструкт").icon).toBe(Bot);
      expect(getCreatureVisual("Construct").icon).toBe(Bot);
      expect(getCreatureVisual("Елементаль").icon).toBe(Wind);
      expect(getCreatureVisual("Elemental").icon).toBe(Wind);
      expect(getCreatureVisual("Демон").icon).toBe(Zap);
      expect(getCreatureVisual("Fiend").icon).toBe(Zap);
      expect(getCreatureVisual("Гуманоїд").icon).toBe(User);
      expect(getCreatureVisual("Humanoid").icon).toBe(User);
      expect(getCreatureVisual("Аберація").icon).toBe(Eye);
    });
  });
});


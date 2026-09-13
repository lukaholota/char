import { describe, it, expect } from "vitest";
import { getAllWeapons, getWeaponByIdOrSlug } from "@/lib/weaponsData";
import { getAllArmors, getArmorByIdOrSlug } from "@/lib/armorData";
import { getAllInfusions, getInfusionByIdOrSlug } from "@/lib/infusionsData";
import { getAllInvocations, getInvocationByIdOrSlug } from "@/lib/invocationsData";
import {
  getWeaponVisual,
  getArmorVisual,
  getInfusionVisual,
  getInvocationVisual,
} from "@/components/catalogs/catalog-visuals";
import { Sword, Shield, Wrench, Eye, Swords, ShieldCheck, Crosshair, Target, BookOpen, PawPrint, Crown } from "lucide-react";

describe("KR9.2 — New Entity Catalogs (Weapons, Armor, Infusions, Invocations)", () => {
  describe("1. Weapons Catalog", () => {
    it("returns 48 weapons for RULES_2014 and 38 weapons for RULES_2024", () => {
      const weapons2014 = getAllWeapons("RULES_2014");
      const weapons2024 = getAllWeapons("RULES_2024");

      expect(weapons2014.length).toBe(48);
      expect(weapons2024.length).toBe(38);
    });

    it("ensures each weapon has Ukrainian and English names [English Name]", () => {
      for (const w of getAllWeapons("RULES_2014")) {
        expect(w.name).toMatch(/\[.+\]/);
        expect(w.damage).toBeTruthy();
        expect(w.weaponType).toBeTruthy();
      }
      for (const w of getAllWeapons("RULES_2024")) {
        expect(w.name).toMatch(/\[.+\]/);
        expect(w.damage).toBeTruthy();
        expect(w.weaponType).toBeTruthy();
      }
    });

    it("2024 weapons include Weapon Mastery properties with Ukrainian translation", () => {
      const weapons2024 = getAllWeapons("RULES_2024");
      const dagger = weapons2024.find((w) => w.engName === "Dagger");
      expect(dagger).toBeDefined();
      expect(dagger?.mastery).toBe("NICK");
      expect(dagger?.masteryNameUa).toBe("Кидок");

      const greatsword = weapons2024.find((w) => w.engName === "Greatsword");
      expect(greatsword).toBeDefined();
      expect(greatsword?.mastery).toBe("GRAZE");
      expect(greatsword?.masteryNameUa).toBe("Черкання");
    });

    it("retrieves weapons by ID or slug/name", () => {
      const rapier = getWeaponByIdOrSlug("Rapier", "RULES_2014");
      expect(rapier).toBeDefined();
      expect(rapier?.nameUa).toBe("Рапіра");

      const rapier2024 = getWeaponByIdOrSlug("Rapier", "RULES_2024");
      expect(rapier2024).toBeDefined();
      expect(rapier2024?.mastery).toBe("VEX");
    });

    it("assigns appropriate visual icons based on weapon category", () => {
      expect(getWeaponVisual("FIREARMS").icon).toBe(Crosshair);
      expect(getWeaponVisual("SIMPLE_WEAPON", true).icon).toBe(Target);
      expect(getWeaponVisual("MARTIAL_WEAPON", false).icon).toBe(Swords);
      expect(getWeaponVisual("SIMPLE_WEAPON", false).icon).toBe(Sword);
    });
  });

  describe("2. Armor Catalog", () => {
    it("returns standard equipment armor pieces for RULES_2014 and RULES_2024", () => {
      const armors2014 = getAllArmors("RULES_2014").filter((a) => a.isStandardEquipment);
      const armors2024 = getAllArmors("RULES_2024");

      expect(armors2014.length).toBe(13);
      expect(armors2024.length).toBe(13);
    });

    it("correctly models base AC and Stealth disadvantage", () => {
      const plate2014 = getArmorByIdOrSlug("Plate", "RULES_2014");
      expect(plate2014).toBeDefined();
      expect(plate2014?.baseAC).toBe(18);
      expect(plate2014?.strengthReq).toBe(15);
      expect(plate2014?.stealthDisadvantage).toBe(true);

      const leather2024 = getArmorByIdOrSlug("Leather Armor", "RULES_2024");
      expect(leather2024).toBeDefined();
      expect(leather2024?.baseAC).toBe(11);
      expect(leather2024?.stealthDisadvantage).toBe(false);
    });

    it("assigns appropriate visual icons for armor types", () => {
      expect(getArmorVisual("SHIELD").icon).toBe(ShieldCheck);
      expect(getArmorVisual("HEAVY").icon).toBe(Shield);
      expect(getArmorVisual("LIGHT").icon).toBe(Shield);
    });
  });

  describe("3. Artificer Infusions Catalog", () => {
    it("returns 66 Artificer infusions (TCoE)", () => {
      const infusions = getAllInfusions();
      expect(infusions.length).toBeGreaterThanOrEqual(40);
      expect(infusions.length).toBe(66);
    });

    it("includes canonical infusions like Enhanced Defense, Enhanced Weapon, Returning Weapon", () => {
      const def = getInfusionByIdOrSlug("Enhanced Defense");
      expect(def).toBeDefined();
      expect(def?.minArtificerLevel).toBe(2);
      expect(def?.targetType).toBe("ARMOR");

      const returning = getInfusionByIdOrSlug("Returning Weapon");
      expect(returning).toBeDefined();
      expect(returning?.minArtificerLevel).toBe(2);
      expect(returning?.targetType).toBe("WEAPON");
    });

    it("assigns appropriate visual icons for infusion target types", () => {
      expect(getInfusionVisual("WEAPON").icon).toBe(Sword);
      expect(getInfusionVisual("ARMOR").icon).toBe(Shield);
      expect(getInfusionVisual("ANY").icon).toBe(Wrench);
    });
  });

  describe("4. Warlock Invocations Catalog", () => {
    it("returns 50 invocations for 2014 and 32 invocations for 2024", () => {
      const inv2014 = getAllInvocations("RULES_2014");
      const inv2024 = getAllInvocations("RULES_2024");

      expect(inv2014.length).toBe(50);
      // KR31.2 додав 32-й виклик — Thirsting Blade, який SRD вимагає передумовою Devouring Blade.
      expect(inv2024.length).toBe(32);
    });

    it("correctly models level and pact requirements for 2014 and 2024", () => {
      const agon2014 = getInvocationByIdOrSlug("Agonizing Blast", "RULES_2014");
      expect(agon2014).toBeDefined();
      expect(agon2014?.description.length).toBeGreaterThan(10);

      const devouring2024 = getInvocationByIdOrSlug("Devouring Blade", "RULES_2024");
      expect(devouring2024).toBeDefined();
      expect(devouring2024?.minLevel).toBe(12);
      expect(devouring2024?.pactRequirement).toBe("Pact of the Blade");
    });

    it("assigns appropriate visual icons for invocations based on pact boons", () => {
      expect(getInvocationVisual("Pact of the Blade").icon).toBe(Sword);
      expect(getInvocationVisual("Pact of the Tome").icon).toBe(BookOpen);
      expect(getInvocationVisual("Pact of the Chain").icon).toBe(PawPrint);
      expect(getInvocationVisual(null, 15).icon).toBe(Crown);
      expect(getInvocationVisual(null, 2).icon).toBe(Eye);
    });
  });
});

"use server";

import { prisma } from "@/lib/prisma";
import { fullCharacterSchema, PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { auth } from "@/lib/auth";
import { Ability, ArmorType, Feats, Language, SkillProficiencyType, Skills } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  formatArmorProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";

type UnknownRecord = Record<string, unknown>;

const ABILITY_KEYS = new Set(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);

function isAbilityKey(value: string): boolean {
  return ABILITY_KEYS.has(String(value).toUpperCase());
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getChildRecord(value: unknown, key: string): UnknownRecord | null {
  if (!isRecord(value)) return null;
  const child = value[key];
  return isRecord(child) ? child : null;
}

function getSimpleBonuses(asi: unknown): Record<string, number> {
  const basic = getChildRecord(asi, "basic");
  const simple = getChildRecord(basic, "simple");
  if (!simple) return {};

  const out: Record<string, number> = {};
  for (const [ability, rawBonus] of Object.entries(simple)) {
    if (!isAbilityKey(ability)) continue;
    const bonus =
      typeof rawBonus === "number"
        ? rawBonus
        : typeof rawBonus === "string"
          ? Number(rawBonus)
          : NaN;
    if (Number.isFinite(bonus)) out[ability] = bonus;
  }
  return out;
}

function getPlainBonuses(map: unknown): Record<string, number> {
  if (!isRecord(map)) return {};
  if ("basic" in map || "tasha" in map || "flexible" in map) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(map)) {
    if (!isAbilityKey(key)) continue;
    const bonus = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (Number.isFinite(bonus) && bonus !== 0) out[String(key)] = bonus;
  }
  return out;
}

function normalizeASI(asi: unknown): UnknownRecord | null {
  if (!isRecord(asi)) return null;

  let next: UnknownRecord;
  try {
    next = JSON.parse(JSON.stringify(asi));
  } catch {
    next = { ...asi };
  }

  if (!isRecord(next.basic) && isRecord((next as any).flexible) && isRecord((next as any).flexible)) {
    const flexible = (next as any).flexible;
    if (isRecord(flexible) && Array.isArray((flexible as any).groups)) {
      (next as any).basic = { simple: {}, flexible };
    }
  }

  if (!isRecord(next.basic) && isRecord((next as any).tasha)) {
    const tasha = (next as any).tasha;
    if (isRecord(tasha) && isRecord((tasha as any).flexible)) {
      (next as any).basic = { simple: {}, flexible: (tasha as any).flexible };
    }
  }

  if (isRecord((next as any).basic) && !isRecord(((next as any).basic as any).simple)) {
    ((next as any).basic as any).simple = {};
  }

  return next;
}

function extractFlexibleGroups(asi: unknown, mode: "basic" | "tasha") {
  const normalized = normalizeASI(asi);
  if (!normalized) return [] as any[];
  const container = mode === "basic" ? (normalized as any).basic : (normalized as any).tasha;
  const flexible = isRecord(container) ? (container as any).flexible : null;
  const groups = isRecord(flexible) ? (flexible as any).groups : null;
  return Array.isArray(groups) ? (groups as any[]) : [];
}

function subraceTashaGroups(additionalASI: unknown) {
  const bonuses = getPlainBonuses(additionalASI);
  const byValue = new Map<number, number>();
  for (const raw of Object.values(bonuses)) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value === 0) continue;
    byValue.set(value, (byValue.get(value) ?? 0) + 1);
  }
  return Array.from(byValue.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([value, count]) => ({
      groupName: `+${value} до ${count}`,
      value,
      choiceCount: count,
      unique: true,
    }));
}

function addBonuses(scores: Record<string, number>, bonuses: Record<string, number>) {
  for (const [ability, bonus] of Object.entries(bonuses)) {
    if (scores[ability] == null) continue;
    scores[ability] += Number(bonus) || 0;
  }
}

function applyRacialChoices(
  scores: Record<string, number>,
  choices: Array<{ groupIndex: number; selectedAbilities: string[] }> | undefined,
  groups: any[]
) {
  if (!choices?.length) return;
  for (const choice of choices) {
    const group = groups[choice.groupIndex];
    const rawValue = (group as any)?.value;
    const bonusValue = typeof rawValue === "number" ? rawValue : Number(rawValue) || 1;
    for (const ability of choice.selectedAbilities) {
      if (scores[ability] == null) continue;
      scores[ability] += bonusValue;
    }
  }
}

export async function createCharacter(data: PersFormData) {
  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return { error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return { error: "User not found" };
  }

  const validation = fullCharacterSchema.safeParse(data);

  if (!validation.success) {
    return { error: "Validation failed", details: validation.error.flatten() };
  }

  const validData = validation.data;

  // Calculate Ability Scores
  const scores: Record<string, number> = {
    STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10
  };

  if (validData.asiSystem === 'POINT_BUY') {
    validData.asi.forEach(s => scores[s.ability] = s.value);
  } else if (validData.asiSystem === 'SIMPLE') {
    validData.simpleAsi.forEach(s => scores[s.ability] = s.value);
  } else if (validData.asiSystem === 'CUSTOM' && validData.customAsi) {
    validData.customAsi.forEach(s => scores[s.ability] = Number(s.value));
  }

  // Let's fetch the race to be sure about fixed bonuses.
  const race = await prisma.race.findUnique({ where: { raceId: validData.raceId } });
  if (!race) return { error: "Race not found" };

  // If race defines a Warforged-style static AC bonus (consistent bonus), initialize toggleable pers field.
    // Race static AC bonuses (e.g. Warforged +1) must be explicitly enabled via the UI toggle.
    // So we initialize it to 0 even if the race defines a consistentBonus.
    const initialRaceStaticAcBonus = 0;

  let effectiveASI: unknown = race.ASI;

  const variant = validData.raceVariantId
    ? await prisma.raceVariant.findUnique({ where: { raceVariantId: validData.raceVariantId } })
    : null;
  if (variant?.overridesRaceASI) {
    effectiveASI = variant.overridesRaceASI;
  }

  const subrace = validData.subraceId
    ? await prisma.subrace.findUnique({ where: { subraceId: validData.subraceId } })
    : null;

  const background = await prisma.background.findUnique({ where: { backgroundId: validData.backgroundId } });
  if (!background) return { error: "Background not found" };

  const cls = await prisma.class.findUnique({
    where: { classId: validData.classId },
    select: {
      name: true,
      spellcastingType: true,
      savingThrows: true,
      armorProficiencies: true,
      weaponProficiencies: true,
      toolProficiencies: true,
      toolToChooseCount: true,
      languages: true,
      languagesToChooseCount: true,
      hitDie: true,
    },
  });
  if (!cls) return { error: "Class not found" };

  const subclass = validData.subclassId
    ? await prisma.subclass.findUnique({
        where: { subclassId: validData.subclassId },
        select: {
          subclassId: true,
          classId: true,
          armorProficiencies: true,
          weaponProficiencies: true,
        },
      })
    : null;

  if (subclass && subclass.classId !== validData.classId) {
    return { error: "Підклас не належить обраному класу" };
  }

  const feat = validData.featId
    ? await prisma.feat.findUnique({
        where: { featId: validData.featId },
        include: {
          featChoiceOptions: {
            include: { choiceOption: true },
          },
        },
      })
    : null;

  const backgroundFeat = validData.backgroundFeatId
    ? await prisma.feat.findUnique({
        where: { featId: validData.backgroundFeatId },
        include: {
          featChoiceOptions: {
            include: { choiceOption: true },
          },
        },
      })
    : null;

  if (validData.isDefaultASI) {
    addBonuses(scores, getSimpleBonuses(normalizeASI(effectiveASI)));
    if (subrace) addBonuses(scores, getPlainBonuses(subrace.additionalASI));
  }

  if (validData.racialBonusChoiceSchema) {
    const choices = validData.isDefaultASI
      ? validData.racialBonusChoiceSchema.basicChoices
      : validData.racialBonusChoiceSchema.tashaChoices;

    const raceGroups = extractFlexibleGroups(effectiveASI, validData.isDefaultASI ? "basic" : "tasha");
    const extraGroups = !validData.isDefaultASI && subrace ? subraceTashaGroups(subrace.additionalASI) : [];
    applyRacialChoices(scores, choices, [...raceGroups, ...extraGroups]);
  }

  if (feat) {
    const isResilient = feat.name === Feats.RESILIENT;
    let resilientSaveAbility: Ability | null = null;

    addBonuses(scores, getPlainBonuses(feat.grantedASI));
    addBonuses(scores, getSimpleBonuses(feat.grantedASI));

    const entries = Object.values(validData.featChoiceSelections ?? {});
    for (const choiceOptionId of entries) {
      const option = feat.featChoiceOptions?.find((fco) => fco.choiceOptionId === Number(choiceOptionId));
      const co: any = option?.choiceOption;
      const nameEng = String(co?.optionNameEng ?? "");

      const effectKind = String(co?.effectKind ?? "").trim();
      if (effectKind === "ASI") {
        const ability = String(co?.effectAbility ?? "").trim();
        if (isAbilityKey(ability)) {
          scores[ability.toUpperCase() as keyof typeof scores] += Number(co?.effectAmount ?? 1) || 1;
          if (isResilient) resilientSaveAbility = ability.toUpperCase() as Ability;
          continue;
        }
      }

      // Legacy fallback
      if (!nameEng) continue;
      if (nameEng.includes("Strength")) {
        scores.STR += 1;
        if (isResilient) resilientSaveAbility = Ability.STR;
      } else if (nameEng.includes("Dexterity")) {
        scores.DEX += 1;
        if (isResilient) resilientSaveAbility = Ability.DEX;
      } else if (nameEng.includes("Constitution")) {
        scores.CON += 1;
        if (isResilient) resilientSaveAbility = Ability.CON;
      } else if (nameEng.includes("Intelligence")) {
        scores.INT += 1;
        if (isResilient) resilientSaveAbility = Ability.INT;
      } else if (nameEng.includes("Wisdom")) {
        scores.WIS += 1;
        if (isResilient) resilientSaveAbility = Ability.WIS;
      } else if (nameEng.includes("Charisma")) {
        scores.CHA += 1;
        if (isResilient) resilientSaveAbility = Ability.CHA;
      }
    }

    // Persist Resilient save proficiency at creation time.
    if (isResilient && resilientSaveAbility) {
      cls.savingThrows = Array.from(new Set([...(cls.savingThrows ?? []), resilientSaveAbility]));
    }
  }

  if (backgroundFeat) {
    const isResilient = backgroundFeat.name === Feats.RESILIENT;
    let resilientSaveAbility: Ability | null = null;

    addBonuses(scores, getPlainBonuses(backgroundFeat.grantedASI));
    addBonuses(scores, getSimpleBonuses(backgroundFeat.grantedASI));

    const entries = Object.values(validData.backgroundFeatChoiceSelections ?? {});
    for (const choiceOptionId of entries) {
      const option = backgroundFeat.featChoiceOptions?.find((fco) => fco.choiceOptionId === Number(choiceOptionId));
      const co: any = option?.choiceOption;
      const nameEng = String(co?.optionNameEng ?? "");

      const effectKind = String(co?.effectKind ?? "").trim();
      if (effectKind === "ASI") {
        const ability = String(co?.effectAbility ?? "").trim();
        if (isAbilityKey(ability)) {
          scores[ability.toUpperCase() as keyof typeof scores] += Number(co?.effectAmount ?? 1) || 1;
          if (isResilient) resilientSaveAbility = ability.toUpperCase() as Ability;
          continue;
        }
      }

      // Legacy fallback
      if (!nameEng) continue;
      if (nameEng.includes("Strength")) {
        scores.STR += 1;
        if (isResilient) resilientSaveAbility = Ability.STR;
      } else if (nameEng.includes("Dexterity")) {
        scores.DEX += 1;
        if (isResilient) resilientSaveAbility = Ability.DEX;
      } else if (nameEng.includes("Constitution")) {
        scores.CON += 1;
        if (isResilient) resilientSaveAbility = Ability.CON;
      } else if (nameEng.includes("Intelligence")) {
        scores.INT += 1;
        if (isResilient) resilientSaveAbility = Ability.INT;
      } else if (nameEng.includes("Wisdom")) {
        scores.WIS += 1;
        if (isResilient) resilientSaveAbility = Ability.WIS;
      } else if (nameEng.includes("Charisma")) {
        scores.CHA += 1;
        if (isResilient) resilientSaveAbility = Ability.CHA;
      }
    }

    // Persist Resilient save proficiency at creation time.
    if (isResilient && resilientSaveAbility) {
      cls.savingThrows = Array.from(new Set([...(cls.savingThrows ?? []), resilientSaveAbility]));
    }
  }

  // Prepare Skills
  const allSkills = new Set<string>(validData.skills);

  // From Schema
  if (validData.skillsSchema) {
      if (validData.skillsSchema.isTasha) {
          validData.skillsSchema.tashaChoices.forEach(s => allSkills.add(s));
      } else {
          validData.skillsSchema.basicChoices.race.forEach(s => allSkills.add(s));
          validData.skillsSchema.basicChoices.selectedClass.forEach(s => allSkills.add(s));
      }
  }

  // From Race (Fixed)
  if (race && race.skillProficiencies && Array.isArray(race.skillProficiencies)) {
      (race.skillProficiencies as string[]).forEach(s => allSkills.add(s));
  }

  // From Subrace (Fixed)
  if (subrace && (subrace as any).skillProficiencies && Array.isArray((subrace as any).skillProficiencies)) {
    ((subrace as any).skillProficiencies as string[]).forEach((s) => allSkills.add(s));
  }
  
  // From Background (Fixed)
  if (background.skillProficiencies && Array.isArray(background.skillProficiencies)) {
    (background.skillProficiencies as string[]).forEach((s) => allSkills.add(s));
  }

  // From Feat (if selected) - now processed AFTER base skills
  const expertiseFromFeat = new Set<string>();
  if (feat) {
    if (feat.grantedSkills && Array.isArray(feat.grantedSkills)) {
      (feat.grantedSkills as string[]).forEach((s) => allSkills.add(s));
    }

    if (validData.featChoiceSelections) {
      const extractSkill = (nameEng?: string | null) => {
        if (!nameEng) return null;
        const match = nameEng.match(/\(([A-Z_]+)\)$/);
        return match ? match[1] : nameEng;
      };

      for (const choiceOptionId of Object.values(validData.featChoiceSelections)) {
        const featChoice = feat.featChoiceOptions?.find((fco) => fco.choiceOptionId === Number(choiceOptionId));
        const option = featChoice?.choiceOption;
        if (!option) continue;

        const skillCode = extractSkill(option.optionNameEng);
        if (skillCode && Object.values(Skills).includes(skillCode as Skills)) {
          if (option.optionNameEng.includes("Expertise")) {
            expertiseFromFeat.add(skillCode);
          } else if (option.optionNameEng.includes("Proficiency")) {
            allSkills.add(skillCode);
          }
        }
      }
    }
  }

  if (backgroundFeat) {
    if (backgroundFeat.grantedSkills && Array.isArray(backgroundFeat.grantedSkills)) {
      (backgroundFeat.grantedSkills as string[]).forEach((s) => allSkills.add(s));
    }

    if (validData.backgroundFeatChoiceSelections) {
      const extractSkill = (nameEng?: string | null) => {
        if (!nameEng) return null;
        const match = nameEng.match(/\(([A-Z_]+)\)$/);
        return match ? match[1] : nameEng;
      };

      for (const choiceOptionId of Object.values(validData.backgroundFeatChoiceSelections)) {
        const featChoice = backgroundFeat.featChoiceOptions?.find((fco) => fco.choiceOptionId === Number(choiceOptionId));
        const option = featChoice?.choiceOption;
        if (!option) continue;

        const skillCode = extractSkill(option.optionNameEng);
        if (skillCode && Object.values(Skills).includes(skillCode as Skills)) {
          if (option.optionNameEng.includes("Expertise")) {
            expertiseFromFeat.add(skillCode);
          } else if (option.optionNameEng.includes("Proficiency")) {
            allSkills.add(skillCode);
          }
        }
      }
    }
  }

  // 1. Prepare Features
  const featuresToConnect: { featureId: number }[] = [];
  
  const classFeatures = await prisma.classFeature.findMany({
    where: { classId: validData.classId, levelGranted: 1 },
    select: { featureId: true }
  });
  featuresToConnect.push(...classFeatures.map(f => ({ featureId: f.featureId })));

  const raceFeatures = await prisma.raceTrait.findMany({
    where: { raceId: validData.raceId },
    select: { featureId: true }
  });
  featuresToConnect.push(...raceFeatures.map(f => ({ featureId: f.featureId })));

  if (validData.subraceId) {
    const subraceFeatures = await prisma.subraceTrait.findMany({
      where: { subraceId: validData.subraceId },
      select: { featureId: true }
    });
    featuresToConnect.push(...subraceFeatures.map(f => ({ featureId: f.featureId })));
  }

  if (validData.subclassId) {
    const subclassFeatures = await prisma.subclassFeature.findMany({
      where: { subclassId: validData.subclassId, levelGranted: 1 },
      select: { featureId: true }
    });
    featuresToConnect.push(...subclassFeatures.map(f => ({ featureId: f.featureId })));
  }

  // Deduplicate feature ids (PersFeature has @@unique([persId, featureId]))
  const uniqueFeatureIds = Array.from(
    new Set(featuresToConnect.map((f) => f.featureId))
  ).filter((id) => Number.isFinite(id));

  const acceptedOptionalFeatureIds = Object.entries(validData.classOptionalFeatureSelections ?? {})
    .filter(([, accepted]) => accepted === true)
    .map(([id]) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const optionalFeatures = acceptedOptionalFeatureIds.length
    ? await prisma.classOptionalFeature.findMany({
        where: { optionalFeatureId: { in: acceptedOptionalFeatureIds } },
        include: { replacesFeatures: true },
      })
    : [];

  const optionalGrantedFeatureIds = optionalFeatures
    .map((o) => o.featureId)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0);

  const optionalReplacedFeatureIds = Array.from(
    new Set(optionalFeatures.flatMap((o) => o.replacesFeatures.map((r) => r.replacedFeatureId)))
  ).filter((id) => Number.isFinite(id) && id > 0);

  // 2. Prepare Equipment
  const weaponsToCreate: { weaponId: number }[] = [];
  const armorsToCreate: { armorId: number }[] = [];
  const customEquipmentLines: string[] = [];

  const moneyFromBackground = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const applyMoneyToken = (name: string, quantity: number): boolean => {
    const key = String(name || "").trim().toLowerCase();
    const qty = Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0;
    if (!qty) return false;
    // UA abbreviations in seeds: зм=gp, см=sp, мм=cp, ем=ep, пм=pp
    if (key === "зм") {
      moneyFromBackground.gp += qty;
      return true;
    }
    if (key === "см") {
      moneyFromBackground.sp += qty;
      return true;
    }
    if (key === "мм") {
      moneyFromBackground.cp += qty;
      return true;
    }
    if (key === "ем") {
      moneyFromBackground.ep += qty;
      return true;
    }
    if (key === "пм") {
      moneyFromBackground.pp += qty;
      return true;
    }
    return false;
  };

  const backgroundItems = (background as any).items;
  if (Array.isArray(backgroundItems)) {
    for (const item of backgroundItems as unknown[]) {
      if (!isRecord(item)) continue;
      const name = typeof item.name === "string" ? item.name : null;
      const quantity =
        typeof item.quantity === "number"
          ? item.quantity
          : typeof item.quantity === "string"
            ? Number(item.quantity)
            : NaN;
      if (name && Number.isFinite(quantity)) {
        // Persist starting money separately (Pers.gp/sp/...) instead of storing coins as "equipment".
        if (!applyMoneyToken(name, quantity)) {
          customEquipmentLines.push(`${name} x${quantity}`);
        }
      }
    }
  }

  if (validData.equipmentSchema) {
      const { choiceGroupToId, anyWeaponSelection } = validData.equipmentSchema;

      // Choice Groups
      for (const ids of Object.values(choiceGroupToId)) {
          for (const id of ids) {
              const opt = await prisma.classStartingEquipmentOption.findUnique({
                  where: { optionId: id },
                    include: { equipmentPack: true }
              });
              if (opt) {
                  if (opt.weaponId) {
                    const qty = Number.isFinite(opt.quantity) ? Math.max(1, Math.trunc(opt.quantity)) : 1;
                    for (let i = 0; i < qty; i++) weaponsToCreate.push({ weaponId: opt.weaponId });
                  }
                  if (opt.armorId) armorsToCreate.push({ armorId: opt.armorId });
                  if (typeof opt.item === "string" && opt.item.trim()) {
                    const qty = Number.isFinite(opt.quantity) ? opt.quantity : 1;
                    customEquipmentLines.push(`${opt.item} x${qty}`);
                  }
                  if (opt.equipmentPack && Array.isArray(opt.equipmentPack.items)) {
                      for (const item of opt.equipmentPack.items as unknown[]) {
                        if (!isRecord(item)) continue;
                        const name = typeof item.name === "string" ? item.name : null;
                        const quantity =
                          typeof item.quantity === "number"
                            ? item.quantity
                            : typeof item.quantity === "string"
                              ? Number(item.quantity)
                              : NaN;

                        if (name && Number.isFinite(quantity)) {
                          customEquipmentLines.push(`${name} x${quantity}`);
                        }
                      }
                  }
              }
          }
      }

      // Any Weapon
      for (const ids of Object.values(anyWeaponSelection)) {
          ids.forEach(id => weaponsToCreate.push({ weaponId: id }));
      }
  }

  // 3. Prepare Choices
  const choiceOptionsToConnect: { choiceOptionId: number }[] = [];
  
  Object.values(validData.classChoiceSelections).forEach(id => {
    if (Array.isArray(id)) {
      id.forEach(subId => choiceOptionsToConnect.push({ choiceOptionId: subId }));
    } else {
      choiceOptionsToConnect.push({ choiceOptionId: id });
    }
  });
  Object.values(validData.subclassChoiceSelections).forEach(id => {
    if (Array.isArray(id)) {
      id.forEach(subId => choiceOptionsToConnect.push({ choiceOptionId: subId }));
    } else {
      choiceOptionsToConnect.push({ choiceOptionId: id });
    }
  });

  // Avoid duplicates when connecting many-to-many choice options
  const uniqueChoiceOptionsToConnect = Array.from(
    new Map(choiceOptionsToConnect.map((c) => [c.choiceOptionId, c])).values()
  ).filter((c) => Number.isFinite(c.choiceOptionId) && c.choiceOptionId > 0);

  const choiceOptionFeatureRows = uniqueChoiceOptionsToConnect.length
    ? await prisma.choiceOptionFeature.findMany({
        where: { choiceOptionId: { in: uniqueChoiceOptionsToConnect.map((c) => c.choiceOptionId) } },
        select: { featureId: true },
      })
    : [];
  const choiceOptionFeatureIds = choiceOptionFeatureRows
    .map((r) => r.featureId)
    .filter((id) => Number.isFinite(id) && id > 0);

  const raceChoiceOptionIds = Array.from(
    new Set(
      Object.values(validData.raceChoiceSelections ?? {})
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );

  const raceChoiceOptions = raceChoiceOptionIds.length
    ? await prisma.raceChoiceOption.findMany({
        where: { optionId: { in: raceChoiceOptionIds } },
      })
    : [];

  const raceChoiceTraitRows = raceChoiceOptionIds.length
    ? await prisma.raceChoiceOptionTrait.findMany({
        where: { optionId: { in: raceChoiceOptionIds } },
        select: { featureId: true },
      })
    : [];
  const raceChoiceTraitFeatureIds = raceChoiceTraitRows
    .map((r) => r.featureId)
    .filter((id) => Number.isFinite(id) && id > 0);

  for (const opt of raceChoiceOptions) {
    addBonuses(scores, getPlainBonuses((opt as any).ASI));
    addBonuses(scores, getSimpleBonuses(normalizeASI((opt as any).ASI)));

    const skillProfs = (opt as any).skillProficiencies;
    if (Array.isArray(skillProfs)) {
      for (const skill of skillProfs) {
        allSkills.add(String(skill));
      }
    }
  }

  // Clamp base ability scores (creation) to max 20
  for (const k of ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const) {
    const v = scores[k];
    if (typeof v === "number" && Number.isFinite(v)) scores[k] = Math.min(20, v);
  }

  const languagesKnown = new Set<string>();
  (race.languages ?? []).forEach((l) => languagesKnown.add(translateValue(String(l))));
  (cls.languages ?? []).forEach((l) => languagesKnown.add(translateValue(String(l))));
  (subrace?.additionalLanguages ?? []).forEach((l: Language) => languagesKnown.add(translateValue(String(l))));
  (feat?.grantedLanguages ?? []).forEach((l: Language) => languagesKnown.add(translateValue(String(l))));
  (backgroundFeat?.grantedLanguages ?? []).forEach((l: Language) => languagesKnown.add(translateValue(String(l))));

  for (const opt of raceChoiceOptions) {
    ((opt as any).languages ?? []).forEach((l: Language) => languagesKnown.add(translateValue(String(l))));
  }

  const languageChoiceLines: string[] = [];
  const appendChoiceCount = (count?: number | null) => {
    const n = typeof count === "number" ? count : 0;
    if (n > 0) languageChoiceLines.push(`Обери ще ${n}`);
  };

  appendChoiceCount((race as any).languagesToChooseCount);
  appendChoiceCount((subrace as any)?.languagesToChooseCount);
  appendChoiceCount((background as any)?.languagesToChooseCount);
  appendChoiceCount((feat as any)?.grantedLanguageCount);
  appendChoiceCount((backgroundFeat as any)?.grantedLanguageCount);
  appendChoiceCount((cls as any).languagesToChooseCount);
  for (const opt of raceChoiceOptions) {
    appendChoiceCount((opt as any).languagesToChooseCount);
  }

  const customLanguagesKnown = [
    Array.from(languagesKnown).filter(Boolean).join("\n"),
    languageChoiceLines.join("\n"),
  ]
    .filter((x) => x && x.trim())
    .join("\n");

  const profLines: string[] = [];
  const armorAll = [
    ...(race.armorProficiencies ?? []),
    ...((cls.armorProficiencies ?? []) as ArmorType[]),
    ...(((subclass as any)?.armorProficiencies ?? []) as ArmorType[]),
    ...(((subrace as any)?.armorProficiencies ?? []) as ArmorType[]),
    ...(((feat as any)?.grantedArmorProficiencies ?? []) as ArmorType[]),
    ...(((backgroundFeat as any)?.grantedArmorProficiencies ?? []) as ArmorType[]),
  ];
  const armorText = formatArmorProficiencies(Array.from(new Set(armorAll)));
  if (armorText && armorText !== "—") profLines.push(armorText);

  const toolTextParts = [
    formatToolProficiencies((race as any).toolProficiencies, (race as any).toolToChooseCount),
    formatToolProficiencies((cls as any).toolProficiencies, (cls as any).toolToChooseCount),
    formatToolProficiencies((subrace as any)?.toolProficiencies, (subrace as any)?.toolToChooseCount),
    Array.isArray((background as any).toolProficiencies)
      ? ((background as any).toolProficiencies as Array<string | number>)
          .map((t) => translateValue(t))
          .filter(Boolean)
          .join(", ")
      : "—",
    formatToolProficiencies((feat as any)?.grantedToolProficiencies, undefined),
    formatToolProficiencies((backgroundFeat as any)?.grantedToolProficiencies, undefined),
  ].filter((x) => x && x !== "—");
  if (toolTextParts.length) profLines.push(toolTextParts.join("\n"));

  const weaponTextParts = [
    formatWeaponProficiencies((race as any).weaponProficiencies),
    formatWeaponProficiencies((cls as any).weaponProficiencies),
    formatWeaponProficiencies((subclass as any)?.weaponProficiencies),
    formatWeaponProficiencies((subrace as any)?.weaponProficiencies),
    formatWeaponProficiencies((feat as any)?.grantedWeaponProficiencies),
    formatWeaponProficiencies((backgroundFeat as any)?.grantedWeaponProficiencies),
  ].filter((x) => x && x !== "—");
  if (weaponTextParts.length) profLines.push(weaponTextParts.join("\n"));

  const customProficiencies = profLines.join("\n");

  const caster = calculateCasterLevel({
    level: 1,
    class: { name: cls.name, spellcastingType: cls.spellcastingType },
    subclass: null,
    multiclasses: [],
  });
  const maxSpellSlotsRow = ((SPELL_SLOT_PROGRESSION as any).FULL?.[caster.casterLevel] as number[] | undefined) ?? [];
  const initialCurrentSpellSlots = Array.from({ length: 9 }, (_, idx) => {
    const v = maxSpellSlotsRow[idx];
    return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
  });
  const pactInfo = (SPELL_SLOT_PROGRESSION as any).PACT?.[caster.pactLevel] as
    | { slots: number; level: number }
    | undefined;
  const initialCurrentPactSlots = pactInfo?.slots ? Math.max(0, Math.trunc(pactInfo.slots)) : 0;

  const allFeatureIdsToCreate = Array.from(
    new Set([
      ...uniqueFeatureIds,
      ...optionalGrantedFeatureIds,
      ...choiceOptionFeatureIds,
      ...raceChoiceTraitFeatureIds,
    ])
  ).filter((id) => Number.isFinite(id) && id > 0);


  try {
    const newPers = await prisma.$transaction(async (tx) => {
      const createdPers = await tx.pers.create({
        data: {
          userId: user.id,
          name: validData.name,
          raceId: validData.raceId,
          subraceId: validData.subraceId,
          classId: validData.classId,
          subclassId: validData.subclassId,
          backgroundId: validData.backgroundId,

          currentSpellSlots: initialCurrentSpellSlots,
          currentPactSlots: initialCurrentPactSlots,

          raceStaticAcBonus: initialRaceStaticAcBonus,

          customLanguagesKnown,
          customProficiencies,

          // Starting money from background
          cp: String(moneyFromBackground.cp),
          sp: String(moneyFromBackground.sp),
          ep: String(moneyFromBackground.ep),
          gp: String(moneyFromBackground.gp),
          pp: String(moneyFromBackground.pp),

          // Save proficiency source-of-truth (prefill from class at creation)
          additionalSaveProficiencies: cls.savingThrows ?? [],

          str: scores.STR,
          dex: scores.DEX,
          con: scores.CON,
          int: scores.INT,
          wis: scores.WIS,
          cha: scores.CHA,

          // Placeholder, updated below once we know class hit die
          currentHp: 10,
          maxHp: 10,

          customEquipment: customEquipmentLines.join("\n"),

          raceVariants: validData.raceVariantId
            ? {
                connect: { raceVariantId: validData.raceVariantId },
              }
            : undefined,

          raceChoiceOptions:
            raceChoiceOptionIds.length > 0
              ? {
                  connect: raceChoiceOptionIds.map((optionId) => ({ optionId })),
                }
              : undefined,

          features:
            allFeatureIdsToCreate.length > 0
              ? {
                  createMany: {
                    data: allFeatureIdsToCreate.map((featureId) => ({ featureId })),
                    skipDuplicates: true,
                  },
                }
              : undefined,
          choiceOptions:
            uniqueChoiceOptionsToConnect.length > 0
              ? {
                  connect: uniqueChoiceOptionsToConnect,
                }
              : undefined,
          classOptionalFeatures:
            acceptedOptionalFeatureIds.length > 0
              ? {
                  connect: acceptedOptionalFeatureIds.map((optionalFeatureId) => ({ optionalFeatureId })),
                }
              : undefined,
        },
      });

      if (optionalReplacedFeatureIds.length > 0) {
        await tx.persFeature.deleteMany({
          where: {
            persId: createdPers.persId,
            featureId: { in: optionalReplacedFeatureIds },
          },
        });
      }

      // Save Feat + Feat choices AFTER Pers exists
      if (validData.featId) {
        const persFeat = await tx.persFeat.create({
          data: {
            persId: createdPers.persId,
            featId: validData.featId,
          },
        });

        const entries = Object.entries(validData.featChoiceSelections ?? {});
        if (entries.length > 0) {
          await tx.persFeatChoice.createMany({
            data: entries
              .map(([, choiceOptionId]) => Number(choiceOptionId))
              .filter((choiceOptionId) => Number.isFinite(choiceOptionId) && choiceOptionId > 0)
              .map((choiceOptionId) => ({
                persFeatId: persFeat.persFeatId,
                choiceOptionId,
              })),
            skipDuplicates: true,
          });
        }
      }

      // Save Background Feat + choices
      if (validData.backgroundFeatId) {
        const persBgFeat = await tx.persFeat.create({
          data: {
            persId: createdPers.persId,
            featId: validData.backgroundFeatId,
          },
        });

        const bgEntries = Object.entries(validData.backgroundFeatChoiceSelections ?? {});
        if (bgEntries.length > 0) {
          await tx.persFeatChoice.createMany({
            data: bgEntries
              .map(([, choiceOptionId]) => Number(choiceOptionId))
              .filter((choiceOptionId) => Number.isFinite(choiceOptionId) && choiceOptionId > 0)
              .map((choiceOptionId) => ({
                persFeatId: persBgFeat.persFeatId,
                choiceOptionId,
              })),
            skipDuplicates: true,
          });
        }
      }

      // Save skills AFTER Pers exists (createMany + skipDuplicates)
      const skillRows = Array.from(allSkills)
        .filter((skillName) => Object.values(Skills).includes(skillName as Skills))
        .map((skillName) => {
          const skillEnum = skillName as Skills;
          const skillIndex = Object.values(Skills).indexOf(skillEnum);
          return {
            persId: createdPers.persId,
            name: skillEnum,
            skillId: skillIndex + 1,
            proficiencyType: SkillProficiencyType.PROFICIENT,
          };
        })
        .filter((row) => row.skillId > 0);

      if (skillRows.length > 0) {
        await tx.persSkill.createMany({
          data: skillRows,
          skipDuplicates: true,
        });
      }

      // Update expertise skills (upsert so it's safe even if missing)
      const expertiseSkills = new Set<string>([
        ...(validData.expertiseSchema?.expertises ?? []),
        ...expertiseFromFeat
      ]);

      for (const skillName of expertiseSkills) {
        if (!Object.values(Skills).includes(skillName as Skills)) continue;
        const skillEnum = skillName as Skills;
        const skillIndex = Object.values(Skills).indexOf(skillEnum);
        await tx.persSkill.upsert({
          where: {
            persId_name: {
              persId: createdPers.persId,
              name: skillEnum,
            },
          },
          update: {
            proficiencyType: SkillProficiencyType.EXPERTISE,
          },
          create: {
            persId: createdPers.persId,
            name: skillEnum,
            skillId: skillIndex + 1,
            proficiencyType: SkillProficiencyType.EXPERTISE,
          },
        });
      }

      // Save weapons AFTER Pers exists
      if (weaponsToCreate.length > 0) {
        await tx.persWeapon.createMany({
          data: weaponsToCreate.map((w) => ({
            persId: createdPers.persId,
            weaponId: w.weaponId,
          })),
          skipDuplicates: true,
        });
      }

      // Save armors AFTER Pers exists
      if (armorsToCreate.length > 0) {
        const armorMetas = await tx.armor.findMany({
          where: { armorId: { in: armorsToCreate.map((a) => a.armorId) } },
          select: { armorId: true, abilityBonuses: true, abilityBonusType: true },
        });
        const metaById = new Map<number, { abilityBonuses: any; abilityBonusType: any }>(
          armorMetas.map((m) => [m.armorId, { abilityBonuses: (m as any).abilityBonuses ?? [], abilityBonusType: (m as any).abilityBonusType }])
        );

        await tx.persArmor.createMany({
          data: armorsToCreate.map((a, index) => ({
            persId: createdPers.persId,
            armorId: a.armorId,
            abilityBonuses: metaById.get(a.armorId)?.abilityBonuses ?? [],
            abilityBonusType: metaById.get(a.armorId)?.abilityBonusType,
            equipped: (race as any).name === "TORTLE_MPMM" ? false : index === 0,
          })),
          skipDuplicates: true,
        });
      }

      // Explicit AC sources as equipable armor entries (seeded, translated)
      // Tortle: 17.
      // Monk UD: 10 + DEX + WIS.
      // Barbarian UD: 10 + DEX + CON.
      // Some races: natural armor base formula (e.g., 13+DEX, 12+DEX, 12+CON).
      try {
        const isTortle = (race as any).name === "TORTLE_MPMM";

        const raceAc = (race as any).ac as any;
        const getSeededNaturalArmorName = (): string | null => {
          if (!raceAc || typeof raceAc !== "object") return null;
          if (typeof raceAc.base === "number") {
            const base = Math.trunc(raceAc.base);
            const bonus = raceAc.bonus;
            if (base === 17 && (bonus === null || bonus === undefined)) return "NATURAL_ARMOR_TORTLE";
            if (base === 13 && bonus === "DEX") return "NATURAL_ARMOR_13_DEX";
            if (base === 12 && bonus === "DEX") return "NATURAL_ARMOR_12_DEX";
            if (base === 12 && bonus === "CON") return "NATURAL_ARMOR_12_CON";
          }
          return null;
        };

        const seededArmorNames = new Set<string>();

        const naturalArmorName = getSeededNaturalArmorName();
        if (naturalArmorName) seededArmorNames.add(naturalArmorName);
        if (cls.name === "MONK_2014") seededArmorNames.add("UNARMORED_DEFENSE_MONK");
        if (cls.name === "BARBARIAN_2014") seededArmorNames.add("UNARMORED_DEFENSE_BARBARIAN");

        if (seededArmorNames.size > 0) {
          const rows = await tx.armor.findMany({
            where: { name: { in: Array.from(seededArmorNames) as any } },
            select: { armorId: true, name: true, abilityBonuses: true, abilityBonusType: true },
          });

          const byName = new Map<string, { armorId: number; abilityBonuses: any; abilityBonusType: any }>(
            rows.map((r) => [String(r.name), { armorId: r.armorId, abilityBonuses: (r as any).abilityBonuses ?? [], abilityBonusType: (r as any).abilityBonusType }])
          );

          const specialArmorsToCreate: Array<{
            persId: number;
            armorId: number;
            abilityBonuses: any;
            abilityBonusType: any;
            miscACBonus: number;
            isProficient: boolean;
            equipped: boolean;
          }> = [];

          // Race natural armor
          if (naturalArmorName && byName.has(naturalArmorName)) {
            const meta = byName.get(naturalArmorName)!;
            specialArmorsToCreate.push({
              persId: createdPers.persId,
              armorId: meta.armorId,
              abilityBonuses: meta.abilityBonuses,
              abilityBonusType: meta.abilityBonusType,
              miscACBonus: 0,
              isProficient: true,
              equipped: isTortle,
            });
          }

          // Class unarmored defenses
          if (cls.name === "MONK_2014" && byName.has("UNARMORED_DEFENSE_MONK")) {
            const meta = byName.get("UNARMORED_DEFENSE_MONK")!;
            specialArmorsToCreate.push({
              persId: createdPers.persId,
              armorId: meta.armorId,
              abilityBonuses: meta.abilityBonuses,
              abilityBonusType: meta.abilityBonusType,
              miscACBonus: 0,
              isProficient: true,
              equipped: !isTortle && armorsToCreate.length === 0,
            });
          }
          if (cls.name === "BARBARIAN_2014" && byName.has("UNARMORED_DEFENSE_BARBARIAN")) {
            const meta = byName.get("UNARMORED_DEFENSE_BARBARIAN")!;
            specialArmorsToCreate.push({
              persId: createdPers.persId,
              armorId: meta.armorId,
              abilityBonuses: meta.abilityBonuses,
              abilityBonusType: meta.abilityBonusType,
              miscACBonus: 0,
              isProficient: true,
              equipped: !isTortle && armorsToCreate.length === 0,
            });
          }

          // If we have a non-tortle natural armor and the character otherwise has no armor,
          // equip the natural armor by default.
          if (!isTortle && armorsToCreate.length === 0 && naturalArmorName && naturalArmorName !== "NATURAL_ARMOR_TORTLE") {
            const idx = specialArmorsToCreate.findIndex((a) => {
              const name = Array.from(byName.entries()).find(([, meta]) => meta.armorId === a.armorId)?.[0];
              return name === naturalArmorName;
            });
            if (idx >= 0) {
              specialArmorsToCreate[idx] = { ...specialArmorsToCreate[idx], equipped: true };
            }
          }

          if (specialArmorsToCreate.length > 0) {
            await tx.persArmor.createMany({
              data: specialArmorsToCreate,
            });
          }
        }
      } catch {
        // Best-effort; character creation should not fail if we can't create special AC sources.
      }

      // Update HP based on Class and CON mod
      const conMod = Math.floor((scores.CON - 10) / 2);
      const hitDie = cls.hitDie;
      let maxHp = hitDie + conMod;

      const hasTough = (feat?.name === Feats.TOUGH) || (backgroundFeat?.name === Feats.TOUGH);
      if (hasTough) {
        maxHp += 2;
      }

      await tx.pers.update({
        where: { persId: createdPers.persId },
        data: {
          maxHp,
          currentHp: maxHp,
        },
      });

      return createdPers;
    });

    revalidatePath("/char");
    return { success: true, persId: newPers.persId };
  } catch (error) {
    console.error("Error creating character:", error);
    return { error: "Database error" };
  }
}

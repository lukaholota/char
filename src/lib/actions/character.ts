"use server";

import { prisma } from "@/lib/prisma";
import { fullCharacterSchema, PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { auth } from "@/lib/auth";
import { SkillProficiencyType, Skills } from "@prisma/client";
import { revalidatePath } from "next/cache";

type UnknownRecord = Record<string, unknown>;

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

  // Apply Racial Bonuses if needed (This logic might be complex depending on how the form sends data)
  // The form seems to handle the final calculation or at least the base assignment.
  // However, usually the form sends the *base* score and the *bonuses* separately or combined.
  // Looking at the schema, `asi` seems to be the base scores from the calculator.
  // Racial bonuses might need to be added if they are not already included.
  // BUT, for now, let's assume the user sees the final score or the form handles it.
  // Wait, `asiSchema` has `racialBonusChoiceSchema`. This implies bonuses are separate.
  
  // Let's fetch the race to be sure about fixed bonuses.
  const race = await prisma.race.findUnique({ where: { raceId: validData.raceId } });
  if (!race) return { error: "Race not found" };

  let effectiveASI: unknown = race.ASI;

  if (validData.raceVariantId) {
      const variant = await prisma.raceVariant.findUnique({ where: { raceVariantId: validData.raceVariantId } });
      if (variant && variant.overridesRaceASI) {
          effectiveASI = variant.overridesRaceASI;
      }
  }

  // Apply fixed racial bonuses
  {
    const bonuses = getSimpleBonuses(effectiveASI);
    Object.entries(bonuses).forEach(([ability, bonus]) => {
      if (scores[ability]) scores[ability] += bonus;
    });
  }

  // Apply chosen racial bonuses
  if (validData.racialBonusChoiceSchema) {
      const choices = validData.isDefaultASI 
          ? validData.racialBonusChoiceSchema.basicChoices 
          : validData.racialBonusChoiceSchema.tashaChoices;
      
      choices?.forEach(choice => {
          choice.selectedAbilities.forEach(ability => {
             if (scores[ability]) scores[ability] += 1; // Usually +1
          });
      });
  }
  
  // Apply Subrace bonuses
  if (validData.subraceId) {
      const subrace = await prisma.subrace.findUnique({ where: { subraceId: validData.subraceId } });
      if (subrace) {
          const bonuses = getSimpleBonuses(subrace.additionalASI);
          Object.entries(bonuses).forEach(([ability, bonus]) => {
            if (scores[ability]) scores[ability] += bonus;
          });
          // Subrace choices? Usually subraces have fixed bonuses, but some might have choices.
          // The schema handles choices generically.
      }
  }
  
  // Apply Feat bonuses (if any)
  if (validData.featId) {
      const feat = await prisma.feat.findUnique({ where: { featId: validData.featId } });
      if (feat) {
          const bonuses = getSimpleBonuses(feat.grantedASI);
          Object.entries(bonuses).forEach(([ability, bonus]) => {
            if (scores[ability]) scores[ability] += bonus;
          });
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
  
  // From Background (Fixed)
  const background = await prisma.background.findUnique({ where: { backgroundId: validData.backgroundId } });
  if (background && background.skillProficiencies && Array.isArray(background.skillProficiencies)) {
      (background.skillProficiencies as string[]).forEach(s => allSkills.add(s));
  }

  // From Feat (if selected) - now processed AFTER base skills
  if (validData.featId) {
    const feat = await prisma.feat.findUnique({ 
      where: { featId: validData.featId },
      include: { 
        featChoiceOptions: { 
          include: { choiceOption: true } 
        } 
      }
    });
    
    if (feat) {
      // Direct skill grants from feat
      if (feat.grantedSkills && Array.isArray(feat.grantedSkills)) {
        (feat.grantedSkills as string[]).forEach(s => allSkills.add(s));
      }
      
      // Skills from feat choice options (e.g., Skill Expert)
      if (validData.featChoiceSelections) {
        for (const choiceOptionId of Object.values(validData.featChoiceSelections)) {
          const featChoice = feat.featChoiceOptions?.find(
            fco => fco.choiceOptionId === Number(choiceOptionId)
          );
          
          if (featChoice?.choiceOption) {
            // Check if this choice option grants a skill
            // The groupName might contain "Skill Proficiency" or similar
            const option = featChoice.choiceOption;
            
            // If the choice option has a direct skill reference
            if (option.optionName && Object.values(Skills).includes(option.optionName as Skills)) {
              allSkills.add(option.optionName);
            }
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

  // 2. Prepare Equipment
  const weaponsToCreate: { weaponId: number }[] = [];
  const armorsToCreate: { armorId: number }[] = [];
  const customEquipmentLines: string[] = [];

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
                  if (opt.weaponId) weaponsToCreate.push({ weaponId: opt.weaponId });
                  if (opt.armorId) armorsToCreate.push({ armorId: opt.armorId });
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
  
  Object.values(validData.classChoiceSelections).forEach(id => choiceOptionsToConnect.push({ choiceOptionId: id }));
  Object.values(validData.subclassChoiceSelections).forEach(id => choiceOptionsToConnect.push({ choiceOptionId: id }));

  // Avoid duplicates when connecting many-to-many choice options
  const uniqueChoiceOptionsToConnect = Array.from(
    new Map(choiceOptionsToConnect.map((c) => [c.choiceOptionId, c])).values()
  ).filter((c) => Number.isFinite(c.choiceOptionId) && c.choiceOptionId > 0);


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

          features:
            uniqueFeatureIds.length > 0
              ? {
                  createMany: {
                    data: uniqueFeatureIds.map((featureId) => ({ featureId })),
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
        },
      });

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
      const expertiseSkills = validData.expertiseSchema?.expertises ?? [];
      for (const skillEnum of expertiseSkills) {
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
        await tx.persArmor.createMany({
          data: armorsToCreate.map((a) => ({
            persId: createdPers.persId,
            armorId: a.armorId,
            equipped: false,
          })),
          skipDuplicates: true,
        });
      }

      // Update HP based on Class and CON mod
      const cls = await tx.class.findUnique({ where: { classId: validData.classId } });
      if (cls) {
        const conMod = Math.floor((scores.CON - 10) / 2);
        const hitDie = cls.hitDie;
        const maxHp = hitDie + conMod;
        await tx.pers.update({
          where: { persId: createdPers.persId },
          data: {
            maxHp,
            currentHp: maxHp,
          },
        });
      }

      return createdPers;
    });

    revalidatePath("/pers");
    return { success: true, persId: newPers.persId };
  } catch (error) {
    console.error("Error creating character:", error);
    return { error: "Database error" };
  }
}

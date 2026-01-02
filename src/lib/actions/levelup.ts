"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeatPrisma } from "@/lib/types/model-types";
import { createCharacterSnapshot } from "./snapshot-actions";
import { unstable_cache } from "next/cache";
import { ArmorType, Language, SkillProficiencyType, Skills } from "@prisma/client";
import {
  formatArmorProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";

const getAllClassesCached = unstable_cache(
  async () =>
    prisma.class.findMany({
      include: {
        subclasses: {
          include: {
            features: { include: { feature: true } },
            subclassChoiceOptions: {
              include: {
                choiceOption: {
                  include: {
                    features: { include: { feature: true } },
                  },
                },
              },
            },
          },
        },
        classChoiceOptions: {
          include: {
            choiceOption: {
              include: {
                features: { include: { feature: true } },
              },
            },
          },
        },
        classOptionalFeatures: {
          include: {
            feature: true,
            replacesFeatures: { include: { replacedFeature: true } },
            appearsOnlyIfChoicesTaken: true,
          },
        },
        features: { include: { feature: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { classId: "asc" }],
    }),
  ["levelup:classes:v3"],
  { revalidate: 60 * 60 * 24 }
);

const getAllFeatsCached = unstable_cache(
  async () =>
    (prisma.feat.findMany({
      include: {
        grantsFeature: true,
        featChoiceOptions: {
          include: {
            choiceOption: {
              include: {
                features: { include: { feature: true } },
              },
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
    }) as unknown as Promise<FeatPrisma[]>),
  ["levelup:feats:v3"],
  { revalidate: 60 * 60 * 24 }
);

const getAllInfusionsCached = unstable_cache(
  async () =>
    prisma.infusion.findMany({
      include: {
        feature: {
          select: {
            name: true,
            description: true,
          },
        },
      },
      orderBy: [{ minArtificerLevel: "asc" }, { name: "asc" }],
    }),
  ["levelup:infusions:v3"],
  { revalidate: 60 * 60 * 24 }
);

export async function getLevelUpInfo(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  const pers = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: true,
      subclass: true,
      choiceOptions: true,
      persInfusions: {
        select: {
          infusionId: true,
        },
      },
      multiclasses: {
        include: {
          class: true,
          subclass: true,
        },
      },
      race: true,
      subrace: true,
    },
  });

  if (!pers) return { error: "Character not found" };

  const nextLevel = pers.level + 1;
  if (nextLevel > 20) return { error: "Max level reached" };

  const [classes, feats, infusions] = await Promise.all([
    getAllClassesCached(),
    getAllFeatsCached(),
    getAllInfusionsCached(),
  ]);

  const currentClass = classes.find((c) => c.classId === pers.classId);
  const currentSubclass =
    currentClass?.subclasses?.find((s) => s.subclassId === pers.subclassId) ?? null;

  const needsSubclass = !pers.subclassId && nextLevel >= (currentClass?.subclassLevel ?? 3);
  const isASILevel = (currentClass?.abilityScoreUpLevels ?? []).includes(nextLevel);

  const newClassFeatures = (currentClass?.features ?? []).filter((f) => f.levelGranted === nextLevel);
  const newSubclassFeatures = (currentSubclass?.features ?? []).filter((f) => f.levelGranted === nextLevel);

  const classChoiceGroups: Record<string, (typeof currentClass extends undefined ? never : NonNullable<typeof currentClass>["classChoiceOptions"][number])[]> = {} as any;
  const classChoiceOptions = (currentClass?.classChoiceOptions ?? []).filter((opt) =>
    (opt.levelsGranted ?? []).includes(nextLevel)
  );
  for (const opt of classChoiceOptions) {
    const key = opt.choiceOption?.groupName || "Опції";
    if (!classChoiceGroups[key]) classChoiceGroups[key] = [];
    classChoiceGroups[key].push(opt as any);
  }

  const subclassChoiceGroups: Record<string, (typeof currentSubclass extends null ? never : NonNullable<typeof currentSubclass>["subclassChoiceOptions"][number])[]> = {} as any;
  const subclassChoiceOptions = (currentSubclass?.subclassChoiceOptions ?? []).filter((opt) =>
    (opt.levelsGranted ?? []).includes(nextLevel)
  );
  for (const opt of subclassChoiceOptions) {
    const key = opt.choiceOption?.groupName || "Опції";
    if (!subclassChoiceGroups[key]) subclassChoiceGroups[key] = [];
    subclassChoiceGroups[key].push(opt as any);
  }

  return {
    pers,
    nextLevel,
    needsSubclass,
    isASILevel,
    newClassFeatures,
    newSubclassFeatures,
    classChoiceGroups,
    subclassChoiceGroups,
    classes,
    feats,
    infusions,
  };
}

export async function levelUpCharacter(persId: number, data: any) {
    const session = await auth();
    if (!session?.user?.email) return { error: "Unauthorized" };

    try {
    const info = await getLevelUpInfo(persId);
    if ("error" in info) return info;

    const { pers, classes } = info;

    const nextLevel = pers.level + 1;
    if (nextLevel > 20) return { error: "Max level reached" };

    const levelUpPath = data?.levelUpPath === "MULTICLASS" ? "MULTICLASS" : "EXISTING";
    const selectedClassId = Number(data?.classId);
    if (!Number.isFinite(selectedClassId)) return { error: "Оберіть клас для підвищення" };

    const ownedClassIds = new Set<number>([pers.classId, ...(pers.multiclasses || []).map((m) => m.classId)]);
    const hasClassAlready = ownedClassIds.has(selectedClassId);
    if (levelUpPath === "EXISTING" && !hasClassAlready) {
      return { error: "Цей клас ще не взято. Оберіть мультиклас." };
    }
    if (levelUpPath === "MULTICLASS" && hasClassAlready) {
      return { error: "Цей клас уже взято. Оберіть існуючий клас." };
    }

    const selectedClass = (classes as any[]).find((c) => c.classId === selectedClassId);
    if (!selectedClass) return { error: "Клас не знайдено" };

    const multiclassRow = (pers.multiclasses || []).find((m) => m.classId === selectedClassId) ?? null;
    const mainClassLevel = (() => {
      const extras = (pers.multiclasses || []).reduce((acc, m) => acc + (m.classLevel || 0), 0);
      const computed = pers.level - extras;
      return computed > 0 ? computed : 1;
    })();

    const classLevelBefore = levelUpPath === "MULTICLASS"
      ? 0
      : selectedClassId === pers.classId
        ? mainClassLevel
        : multiclassRow?.classLevel ?? 0;
    const classLevelAfter = classLevelBefore + 1;

    // ===== 1) Stats =====
    const newStats = {
      str: pers.str,
      dex: pers.dex,
      con: pers.con,
      int: pers.int,
      wis: pers.wis,
      cha: pers.cha,
    };

    const abilityToStatKey: Record<string, keyof typeof newStats> = {
      STR: "str",
      DEX: "dex",
      CON: "con",
      INT: "int",
      WIS: "wis",
      CHA: "cha",
    };

    const clampStats = () => {
      for (const k of Object.keys(newStats) as Array<keyof typeof newStats>) {
        const v = newStats[k];
        if (typeof v === "number" && Number.isFinite(v)) newStats[k] = Math.min(20, v);
      }
    };

    if (Array.isArray(data?.customAsi)) {
      for (const asi of data.customAsi as Array<{ ability?: string; value?: string }>) {
        const ability = String(asi?.ability || "");
        const key = abilityToStatKey[ability];
        const delta = Number(asi?.value);
        if (!key) continue;
        if (!Number.isFinite(delta) || (delta !== 1 && delta !== 2)) continue;
        newStats[key] += delta;
      }
    }

    // ===== 2) Feat + feat choices =====
    const featId = data?.featId ? Number(data.featId) : undefined;
    const featChoiceSelections = (data?.featChoiceSelections || {}) as Record<string, number>;
    const featChoiceOptionIds = Object.values(featChoiceSelections)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));

    let featFeatureIds: number[] = [];
    let featGrantedASI: any = null;
    let featGrantedSkills: unknown = null;
    let featGrantedLanguageCount = 0;
    let featGrantedLanguages: Language[] = [];
    let featGrantedArmorProficiencies: ArmorType[] = [];
    let featGrantedToolProficiencies: unknown = null;
    let featGrantedWeaponProficiencies: unknown = null;
    let featChoiceOptions: Array<{ choiceOptionId: number; choiceOption?: { optionNameEng?: string | null } | null }> = [];

    const skillsToAdd = new Set<Skills>();
    const skillsToExpertise = new Set<Skills>();

    if (featId) {
      const feat = await prisma.feat.findUnique({
        where: { featId },
        include: {
          grantsFeature: true,
          featChoiceOptions: {
            include: {
              choiceOption: {
                select: { choiceOptionId: true, optionNameEng: true },
              },
            },
          },
        },
      });

      if (!feat) return { error: "Рису не знайдено" };
      featFeatureIds = feat.grantsFeature.map((f) => f.featureId);
      featGrantedASI = feat.grantedASI as any;

      featGrantedSkills = (feat as any).grantedSkills;
      featGrantedLanguageCount = Number((feat as any).grantedLanguageCount ?? 0) || 0;
      featGrantedLanguages = Array.isArray((feat as any).grantedLanguages) ? ((feat as any).grantedLanguages as Language[]) : [];
      featGrantedArmorProficiencies = Array.isArray((feat as any).grantedArmorProficiencies)
        ? ((feat as any).grantedArmorProficiencies as ArmorType[])
        : [];
      featGrantedToolProficiencies = (feat as any).grantedToolProficiencies;
      featGrantedWeaponProficiencies = (feat as any).grantedWeaponProficiencies;
      featChoiceOptions = (feat as any).featChoiceOptions ?? [];

      const abilityKeys = new Set(Object.keys(abilityToStatKey));
      const applyAsiEntry = (ability: string, bonus: unknown) => {
        const upper = String(ability).toUpperCase();
        if (!abilityKeys.has(upper)) return;
        const key = abilityToStatKey[upper];
        const delta = Number(bonus);
        if (!key) return;
        if (!Number.isFinite(delta)) return;
        newStats[key] += delta;
      };

      // grantedASI supports both nested RaceASI-like and plain maps
      if (featGrantedASI?.basic?.simple && typeof featGrantedASI.basic.simple === "object") {
        for (const [ability, bonus] of Object.entries(featGrantedASI.basic.simple as Record<string, unknown>)) {
          applyAsiEntry(ability, bonus);
        }
      } else if (featGrantedASI && typeof featGrantedASI === "object" && !Array.isArray(featGrantedASI)) {
        for (const [ability, bonus] of Object.entries(featGrantedASI as Record<string, unknown>)) {
          applyAsiEntry(ability, bonus);
        }
      }

      // Apply ability choices embedded in feat choice options (e.g., Skill Expert ability pick)
      for (const choiceOptionId of featChoiceOptionIds) {
        const opt = featChoiceOptions.find((o) => Number(o.choiceOptionId) === choiceOptionId);
        const nameEng = opt?.choiceOption?.optionNameEng || "";
        if (nameEng.includes("Strength")) applyAsiEntry("STR", 1);
        else if (nameEng.includes("Dexterity")) applyAsiEntry("DEX", 1);
        else if (nameEng.includes("Constitution")) applyAsiEntry("CON", 1);
        else if (nameEng.includes("Intelligence")) applyAsiEntry("INT", 1);
        else if (nameEng.includes("Wisdom")) applyAsiEntry("WIS", 1);
        else if (nameEng.includes("Charisma")) applyAsiEntry("CHA", 1);
      }

      // Skills from feat.grantedSkills (fixed)
      if (Array.isArray(featGrantedSkills)) {
        for (const s of featGrantedSkills as unknown[]) {
          const raw = String(s);
          if (Object.values(Skills).includes(raw as Skills)) skillsToAdd.add(raw as Skills);
        }
      }

      // Skills from feat choice selections
      const extractSkill = (nameEng?: string | null) => {
        if (!nameEng) return null;
        const match = nameEng.match(/\(([A-Z_]+)\)$/);
        return match ? match[1] : nameEng;
      };

      for (const choiceOptionId of featChoiceOptionIds) {
        const opt = featChoiceOptions.find((o) => Number(o.choiceOptionId) === choiceOptionId);
        const nameEng = opt?.choiceOption?.optionNameEng;
        const skillCode = extractSkill(nameEng);
        if (skillCode && Object.values(Skills).includes(skillCode as Skills)) {
          if (String(nameEng || "").includes("Expertise")) skillsToExpertise.add(skillCode as Skills);
          else if (String(nameEng || "").includes("Proficiency")) skillsToAdd.add(skillCode as Skills);
        }
      }
    }

    clampStats();

    // ===== 3) HP increase (from wizard) =====
    const hpIncreaseFromWizard = Number(data?.levelUpHpIncrease);
    const hpIncrease = Number.isFinite(hpIncreaseFromWizard)
      ? Math.max(0, Math.trunc(hpIncreaseFromWizard))
      : (() => {
        // fallback: average
        const conMod = Math.floor((newStats.con - 10) / 2);
        return Math.floor(pers.class.hitDie / 2) + 1 + conMod;
      })();

    const newMaxHp = pers.maxHp + hpIncrease;
    const newCurrentHp = pers.currentHp + hpIncrease;

    // ===== 4) Subclass selection for the selected class =====
    const chosenSubclassIdRaw = data?.subclassId ? Number(data.subclassId) : undefined;
    const existingSubclassIdForClass =
      selectedClassId === pers.classId ? pers.subclassId ?? undefined : multiclassRow?.subclassId ?? undefined;

    const subclassIdForSelectedClass = chosenSubclassIdRaw ?? existingSubclassIdForClass;
    if (subclassIdForSelectedClass) {
      const belongs = (selectedClass.subclasses || []).some((s: any) => s.subclassId === subclassIdForSelectedClass);
      if (!belongs) return { error: "Підклас не належить обраному класу" };
    }

    const selectedSubclass = subclassIdForSelectedClass
      ? (selectedClass.subclasses || []).find((s: any) => s.subclassId === subclassIdForSelectedClass) ?? null
      : null;

    // ===== 5) Features + choices =====
    const featuresToAdd = new Set<number>();
    const choiceOptionIds: number[] = [];

    // Class features for THIS class level
    for (const cf of (selectedClass.features || [])) {
      if (cf.levelGranted === classLevelAfter) featuresToAdd.add(cf.featureId);
    }

    // Subclass features for THIS class level
    if (selectedSubclass) {
      for (const sf of (selectedSubclass.features || [])) {
        if (sf.levelGranted === classLevelAfter) featuresToAdd.add(sf.featureId);
      }
    }

    // Feat features
    for (const fid of featFeatureIds) featuresToAdd.add(fid);

    const processChoiceSelections = async (selections: Record<string, number> | undefined) => {
      if (!selections) return;
      for (const optionIdRaw of Object.values(selections)) {
        const optionId = Number(optionIdRaw);
        if (!Number.isFinite(optionId)) continue;
        choiceOptionIds.push(optionId);
        const choiceFeatures = await prisma.choiceOptionFeature.findMany({
          where: { choiceOptionId: optionId },
          select: { featureId: true },
        });
        for (const f of choiceFeatures) featuresToAdd.add(f.featureId);
      }
    };

    await processChoiceSelections(data?.classChoiceSelections as Record<string, number> | undefined);
    await processChoiceSelections(data?.subclassChoiceSelections as Record<string, number> | undefined);
    await processChoiceSelections(featChoiceSelections);

    // Optional class features (replacements)
    const optionalSelections = (data?.classOptionalFeatureSelections || {}) as Record<string, boolean>;
    const acceptedOptionalIds = Object.entries(optionalSelections)
      .filter(([, accepted]) => accepted === true)
      .map(([id]) => Number(id))
      .filter((id) => Number.isFinite(id));

    const optionalReplacementSelections =
      (data?.classOptionalFeatureReplacementSelections || {}) as Record<
        string,
        { removeChoiceOptionId?: number; addChoiceOptionId?: number }
      >;

    const optionalReplacedFeatureIds = new Set<number>();
    const optionalGrantedFeatureIds = new Set<number>();

    const replacementChoiceOptionDisconnectIds: number[] = [];
    const replacementChoiceOptionConnectIds: number[] = [];
    const replacementFeatureIdsToRemove = new Set<number>();
    const replacementFeatureIdsToAdd = new Set<number>();
    if (acceptedOptionalIds.length) {
      const optionalRecords = await prisma.classOptionalFeature.findMany({
        where: { optionalFeatureId: { in: acceptedOptionalIds } },
        include: {
          replacesFeatures: true,
        },
      });

      for (const opt of optionalRecords) {
        if (opt.featureId) optionalGrantedFeatureIds.add(opt.featureId);
        for (const rep of opt.replacesFeatures) {
          optionalReplacedFeatureIds.add(rep.replacedFeatureId);
        }

        const needsSwap = Boolean(opt.replacesInvocation || opt.replacesFightingStyle || opt.replacesManeuver);
        if (!needsSwap) continue;

        const sel = optionalReplacementSelections[String(opt.optionalFeatureId)] || {};
        const removeChoiceOptionId = Number(sel.removeChoiceOptionId);
        const addChoiceOptionId = Number(sel.addChoiceOptionId);

        if (!Number.isFinite(removeChoiceOptionId) || !Number.isFinite(addChoiceOptionId) || removeChoiceOptionId === addChoiceOptionId) {
          return { error: "Оберіть що замінюєте і на що міняєте" };
        }

        // Validate remove is currently owned
        const ownedChoiceOptionIds = new Set<number>(
          (pers.choiceOptions || [])
            .map((co: any) => Number(co?.choiceOptionId))
            .filter((v: any) => Number.isFinite(v))
        );
        if (!ownedChoiceOptionIds.has(removeChoiceOptionId)) {
          return { error: "Обрана опція для заміни не належить персонажу" };
        }

        // Validate groups
        const groupName = opt.replacesInvocation
          ? "Потойбічні виклики"
          : opt.replacesFightingStyle
            ? "Бойовий стиль"
            : opt.replacesManeuver
              ? "Маневри майстра бою"
              : undefined;

        if (!groupName) {
          return { error: "Невідомий тип заміни" };
        }

        const ownedGroup = (pers.choiceOptions || []).find((co: any) => Number(co?.choiceOptionId) === removeChoiceOptionId)?.groupName;
        if (String(ownedGroup || "") !== groupName) {
          return { error: "Обрана опція для заміни не з тієї групи" };
        }

        // Validate add choice option exists and belongs to group
        const addChoiceOption = await prisma.choiceOption.findUnique({
          where: { choiceOptionId: addChoiceOptionId },
          select: { choiceOptionId: true, groupName: true, prerequisites: true, optionNameEng: true },
        });
        if (!addChoiceOption) {
          return { error: "Нова опція не знайдена" };
        }
        if (String(addChoiceOption.groupName || "") !== groupName) {
          return { error: "Нова опція не з тієї групи" };
        }

        // Prevent duplicates (except the one being replaced)
        const ownedWithoutRemoved = new Set(ownedChoiceOptionIds);
        ownedWithoutRemoved.delete(removeChoiceOptionId);
        if (ownedWithoutRemoved.has(addChoiceOptionId)) {
          return { error: "Ця опція вже обрана персонажем" };
        }

        // Invocation prerequisites: level and pact
        if (groupName === "Потойбічні виклики") {
          const prereq = (addChoiceOption.prerequisites || {}) as any;
          const minLevel = prereq?.level ? Number(prereq.level) : undefined;
          if (typeof minLevel === "number" && Number.isFinite(minLevel) && classLevelAfter < minLevel) {
            return { error: "Цей виклик недоступний на цьому рівні" };
          }
          const pact = prereq?.pact ? String(prereq.pact) : undefined;
          if (pact) {
            const persPact = (pers.choiceOptions || []).find(
              (co: any) => typeof co?.optionNameEng === "string" && co.optionNameEng.startsWith("Pact of")
            )?.optionNameEng;
            if (!persPact) return { error: "Спершу оберіть Пакт" };
            if (String(persPact) !== pact) return { error: "Цей виклик вимагає іншого Пакту" };
          }
        }

        replacementChoiceOptionDisconnectIds.push(removeChoiceOptionId);
        replacementChoiceOptionConnectIds.push(addChoiceOptionId);

        // Features to remove/add for replacement choice options
        const [removeFeatures, addFeatures] = await Promise.all([
          prisma.choiceOptionFeature.findMany({
            where: { choiceOptionId: removeChoiceOptionId },
            select: { featureId: true },
          }),
          prisma.choiceOptionFeature.findMany({
            where: { choiceOptionId: addChoiceOptionId },
            select: { featureId: true },
          }),
        ]);

        for (const f of removeFeatures) replacementFeatureIdsToRemove.add(f.featureId);
        for (const f of addFeatures) replacementFeatureIdsToAdd.add(f.featureId);
      }
    }

    for (const fid of optionalGrantedFeatureIds) featuresToAdd.add(fid);

    for (const fid of replacementFeatureIdsToAdd) featuresToAdd.add(fid);

    // ===== 6) Persist =====
    await prisma.$transaction(async (tx) => {
      // Create snapshot before changes
      await createCharacterSnapshot(persId);

      // multiclass row update/create
      if (levelUpPath === "MULTICLASS") {
        await tx.persMulticlass.create({
          data: {
            persId,
            classId: selectedClassId,
            classLevel: 1,
            subclassId: subclassIdForSelectedClass ?? null,
          },
        });
      } else if (selectedClassId !== pers.classId) {
        // existing multiclass
        await tx.persMulticlass.update({
          where: { persId_classId: { persId, classId: selectedClassId } },
          data: {
            classLevel: classLevelAfter,
            ...(chosenSubclassIdRaw ? { subclassId: chosenSubclassIdRaw } : {}),
          },
        });
      }

      // create or update PersFeat and its choices
      let persFeatId: number | null = null;
      if (featId) {
        const created = await tx.persFeat.upsert({
          where: { featId_persId: { featId, persId } },
          update: {},
          create: { featId, persId },
          select: { persFeatId: true },
        });
        persFeatId = created.persFeatId;
      }

      if (persFeatId && featChoiceOptionIds.length) {
        await tx.persFeatChoice.createMany({
          data: featChoiceOptionIds.map((choiceOptionId) => ({
            persFeatId: persFeatId as number,
            choiceOptionId,
          })),
          skipDuplicates: true,
        });
      }

      // Update Pers core
      const disconnectIds = Array.from(new Set(replacementChoiceOptionDisconnectIds));
      const connectIds = Array.from(new Set([...choiceOptionIds, ...replacementChoiceOptionConnectIds]));

      await tx.pers.update({
        where: { persId },
        data: {
          level: nextLevel,
          maxHp: newMaxHp,
          currentHp: newCurrentHp,
          ...(selectedClassId === pers.classId
            ? { subclassId: chosenSubclassIdRaw ?? pers.subclassId ?? null }
            : {}),
          ...newStats,
          ...(featId
            ? (() => {
              const mergeLines = (base: unknown, extras: string[]) => {
                const baseText = typeof base === "string" ? base : "";
                const baseLines = baseText
                  .split(/\r?\n/)
                  .map((l) => l.trim())
                  .filter(Boolean);
                const set = new Set(baseLines);
                for (const line of extras.map((l) => String(l).trim()).filter(Boolean)) {
                  set.add(line);
                }
                return Array.from(set).join("\n");
              };

              const languageExtras: string[] = [];
              for (const l of featGrantedLanguages) languageExtras.push(translateValue(String(l)));
              if (featGrantedLanguageCount > 0) languageExtras.push(`Обери ще ${featGrantedLanguageCount}`);

              const profExtras: string[] = [];
              const armorText = formatArmorProficiencies(featGrantedArmorProficiencies);
              if (armorText && armorText !== "—") profExtras.push(armorText);
              const toolText = formatToolProficiencies(featGrantedToolProficiencies as any, null);
              if (toolText && toolText !== "—") profExtras.push(toolText);
              const weaponText = formatWeaponProficiencies(featGrantedWeaponProficiencies as any);
              if (weaponText && weaponText !== "—") profExtras.push(weaponText);

              return {
                customLanguagesKnown: mergeLines((pers as any).customLanguagesKnown, languageExtras),
                customProficiencies: mergeLines((pers as any).customProficiencies, profExtras),
              };
            })()
            : {}),
          choiceOptions:
            disconnectIds.length || connectIds.length
              ? {
                ...(disconnectIds.length
                  ? { disconnect: disconnectIds.map((choiceOptionId) => ({ choiceOptionId })) }
                  : {}),
                ...(connectIds.length
                  ? { connect: connectIds.map((choiceOptionId) => ({ choiceOptionId })) }
                  : {}),
              }
              : undefined,
          classOptionalFeatures: acceptedOptionalIds.length
            ? {
              connect: acceptedOptionalIds.map((optionalFeatureId) => ({ optionalFeatureId })),
            }
            : undefined,
        },
      });

      // Apply feat skill proficiencies/expertise
      if (skillsToAdd.size > 0) {
        const rows = Array.from(skillsToAdd).map((skillEnum) => {
          const idx = Object.values(Skills).indexOf(skillEnum);
          return {
            persId,
            name: skillEnum,
            skillId: idx + 1,
            proficiencyType: SkillProficiencyType.PROFICIENT,
          };
        }).filter((r) => r.skillId > 0);

        if (rows.length) {
          await tx.persSkill.createMany({ data: rows, skipDuplicates: true });
        }
      }

      if (skillsToExpertise.size > 0) {
        for (const skillEnum of skillsToExpertise) {
          const idx = Object.values(Skills).indexOf(skillEnum);
          if (idx < 0) continue;
          await tx.persSkill.upsert({
            where: {
              persId_name: {
                persId,
                name: skillEnum,
              },
            },
            update: { proficiencyType: SkillProficiencyType.EXPERTISE },
            create: {
              persId,
              name: skillEnum,
              skillId: idx + 1,
              proficiencyType: SkillProficiencyType.EXPERTISE,
            },
          });
        }
      }

      // Artificer Infusions (known) at level 2
      if (selectedClass?.name === "ARTIFICER_2014" && classLevelAfter === 2) {
        const rawSelections = Array.isArray(data?.infusionSelections) ? data.infusionSelections : [];
        const infusionIds = rawSelections
          .map((v: unknown) => Number(v))
          .filter((v: number) => Number.isFinite(v) && v > 0);

        if (infusionIds.length !== 4) {
          throw new Error("Оберіть рівно 4 вливання");
        }

        const eligible = await tx.infusion.findMany({
          where: {
            infusionId: { in: infusionIds },
            minArtificerLevel: { lte: classLevelAfter },
          },
          select: { infusionId: true },
        });

        if (eligible.length !== infusionIds.length) {
          throw new Error("Деякі вливання недоступні на цьому рівні");
        }

        const existing = await tx.persInfusion.findMany({
          where: {
            persId,
            infusionId: { in: infusionIds },
          },
          select: { infusionId: true },
        });

        const existingSet = new Set(existing.map((e) => e.infusionId));
        const toCreate = infusionIds.filter((id) => !existingSet.has(id));

        if (toCreate.length) {
          await tx.persInfusion.createMany({
            data: toCreate.map((infusionId) => ({
              persId,
              infusionId,
            })),
          });
        }
      }

      // Remove replaced features
      if (optionalReplacedFeatureIds.size > 0) {
        await tx.persFeature.deleteMany({
          where: {
            persId,
            featureId: { in: Array.from(optionalReplacedFeatureIds) },
          },
        });
      }

      // Remove features from swapped choice options (invocations/styles/maneuvers)
      if (replacementFeatureIdsToRemove.size > 0) {
        await tx.persFeature.deleteMany({
          where: {
            persId,
            featureId: { in: Array.from(replacementFeatureIdsToRemove) },
          },
        });
      }

      // Add features
      if (featuresToAdd.size > 0) {
        await tx.persFeature.createMany({
          data: Array.from(featuresToAdd).map((featureId) => ({ persId, featureId })),
          skipDuplicates: true,
        });
      }
    });

    return { success: true };
    } catch (e) {
        console.error(e);
        return { error: "Failed to level up" };
    }
}

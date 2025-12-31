"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeatPrisma } from "@/lib/types/model-types";
import { createCharacterSnapshot } from "./snapshot-actions";
import { calculateCasterLevel } from "../logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "../refs/static";

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
            expandedSpells: true,
          },
        },
        startingEquipmentOption: {
          include: {
            equipmentPack: true,
            weapon: true,
            armor: true,
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
    prisma.feat.findMany({
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
    }) as unknown as Promise<FeatPrisma[]>,
    prisma.infusion.findMany({
      include: {
        feature: true,
        replicatedMagicItem: true,
      },
      orderBy: [{ minArtificerLevel: "asc" }, { name: "asc" }],
    }),
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

    if (featId) {
      const feat = await prisma.feat.findUnique({
        where: { featId },
        include: {
          grantsFeature: true,
        },
      });

      if (!feat) return { error: "Рису не знайдено" };
      featFeatureIds = feat.grantsFeature.map((f) => f.featureId);
      featGrantedASI = feat.grantedASI as any;

      if (featGrantedASI?.basic?.simple) {
        for (const [ability, bonus] of Object.entries(featGrantedASI.basic.simple as Record<string, unknown>)) {
          const key = abilityToStatKey[String(ability)];
          const delta = Number(bonus);
          if (!key) continue;
          if (!Number.isFinite(delta)) continue;
          newStats[key] += delta;
        }
      }
    }

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

    const processChoiceSelections = async (selections: Record<string, number | number[]> | undefined) => {
      if (!selections) return;
      for (const optionIdRaw of Object.values(selections)) {
        if (Array.isArray(optionIdRaw)) {
          for (const raw of optionIdRaw) {
            const optionId = Number(raw);
            if (!Number.isFinite(optionId)) continue;
            choiceOptionIds.push(optionId);
            const choiceFeatures = await prisma.choiceOptionFeature.findMany({
              where: { choiceOptionId: optionId },
              select: { featureId: true },
            });
            for (const f of choiceFeatures) featuresToAdd.add(f.featureId);
          }
        } else {
          const optionId = Number(optionIdRaw);
          if (!Number.isFinite(optionId)) continue;
          choiceOptionIds.push(optionId);
          const choiceFeatures = await prisma.choiceOptionFeature.findMany({
            where: { choiceOptionId: optionId },
            select: { featureId: true },
          });
          for (const f of choiceFeatures) featuresToAdd.add(f.featureId);
        }
      }
    };

    await processChoiceSelections(data?.classChoiceSelections as Record<string, number> | undefined);
    await processChoiceSelections(data?.subclassChoiceSelections as Record<string, number> | undefined);
    await processChoiceSelections(featChoiceSelections);

    const optionalSelections = (data?.classOptionalFeatureSelections || {}) as Record<string, boolean>;
    const acceptedOptionalIds = Object.entries(optionalSelections)
      .filter(([, accepted]) => accepted === true)
      .map(([id]) => Number(id))
      .filter((id) => Number.isFinite(id));

    // Handle replacements (Fighting Styles, Maneuvers, Invocations)
    const replacementDisconnectIds = new Set<number>();
    const replacementConnectIds = new Set<number>();

    for (const optId of acceptedOptionalIds) {
      const fsKey = `fightingStyleReplacement_${optId}`;
      const manKey = `maneuverReplacement_${optId}`;
      const invKey = `invocationReplacement_${optId}`;

      const fsRep = data[fsKey];
      const manRep = data[manKey];
      const invRep = data[invKey];

      [fsRep, manRep, invRep].forEach(rep => {
        if (rep?.oldId && rep?.newId) {
          replacementDisconnectIds.add(Number(rep.oldId));
          replacementConnectIds.add(Number(rep.newId));
        }
      });
    }

    const optionalReplacedFeatureIds = new Set<number>();
    const optionalGrantedFeatureIds = new Set<number>();
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
      }
    }

    for (const fid of optionalGrantedFeatureIds) featuresToAdd.add(fid);

    // Add features from replacement new choices
    if (replacementConnectIds.size > 0) {
      const repNewOptions = await prisma.choiceOption.findMany({
        where: { choiceOptionId: { in: Array.from(replacementConnectIds) } },
        include: { features: true },
      });
      for (const opt of repNewOptions) {
        choiceOptionIds.push(opt.choiceOptionId);
        for (const f of opt.features) featuresToAdd.add(f.featureId);
      }
    }

    // Identify features to remove from replacement old choices
    const featuresToRemove = new Set<number>();
    if (replacementDisconnectIds.size > 0) {
      const repOldOptions = await prisma.choiceOption.findMany({
        where: { choiceOptionId: { in: Array.from(replacementDisconnectIds) } },
        include: { features: true },
      });
      for (const opt of repOldOptions) {
        for (const f of opt.features) featuresToRemove.add(f.featureId);
      }
    }

    // Combine with other replacements
    for (const fid of optionalReplacedFeatureIds) featuresToRemove.add(fid);
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

      const updatedPers = await tx.pers.update({
        where: { persId },
        data: {
          level: nextLevel,
          maxHp: newMaxHp,
          currentHp: newCurrentHp,
          ...(selectedClassId === pers.classId
            ? { subclassId: chosenSubclassIdRaw ?? pers.subclassId ?? null }
            : {}),
          ...newStats,
        },
        include: {
          class: true,
          subclass: true,
          multiclasses: {
            include: {
              class: true,
              subclass: true,
            },
          },
        },
      });

      // Recalculate spell slots and restore to max
      const caster = calculateCasterLevel(updatedPers as any);
      const maxSpellSlotsRow = ((SPELL_SLOT_PROGRESSION as any).FULL?.[caster.casterLevel] as number[] | undefined) ?? Array(9).fill(0);
      const pactInfo = (SPELL_SLOT_PROGRESSION as any).PACT?.[caster.pactLevel] as { slots: number; level: number } | undefined;
      const maxPactSlots = pactInfo?.slots ? Math.max(0, Math.trunc(pactInfo.slots)) : 0;

      await tx.pers.update({
        where: { persId },
        data: {
          currentSpellSlots: maxSpellSlotsRow,
          currentPactSlots: maxPactSlots,
          classOptionalFeatures: acceptedOptionalIds.length
            ? {
              connect: acceptedOptionalIds.map((optionalFeatureId) => ({ optionalFeatureId })),
            }
            : undefined,
          choiceOptions: {
            disconnect: replacementDisconnectIds.size > 0 
              ? Array.from(replacementDisconnectIds).map(id => ({ choiceOptionId: id })) 
              : undefined,
            connect: choiceOptionIds.length
              ? choiceOptionIds.map((id) => ({ choiceOptionId: id }))
              : undefined,
          }
        },
      });

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
      if (featuresToRemove.size > 0) {
        await tx.persFeature.deleteMany({
          where: {
            persId,
            featureId: { in: Array.from(featuresToRemove) },
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

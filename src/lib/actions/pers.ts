"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeatureDisplayType, RestType } from "@prisma/client";

export async function getUserPerses() {
  const session = await auth();
  if (!session?.user?.email) {
    return [];
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return [];

  return prisma.pers.findMany({
    where: { userId: user.id },
    include: {
      race: true,
      class: true,
      background: true,
    },
    orderBy: { updatedAt: 'desc' }
  });
}

export async function getPersById(id: number) {
    const session = await auth();
    if (!session?.user?.email) return null;

    const pers = await prisma.pers.findUnique({
        where: { persId: id },
        include: {
            race: {
                include: {
                    traits: {
                        include: {
                            feature: true
                        }
                    }
                }
            },
            subrace: {
                include: {
                    traits: {
                        include: {
                            feature: true
                        }
                    }
                }
            },
            class: {
                include: {
                    features: {
                        include: {
                            feature: true
                        }
                    }
                }
            },
            subclass: {
                include: {
                    features: {
                        include: {
                            feature: true
                        }
                    }
                }
            },
            background: true,
            skills: true,
            feats: { 
                include: { 
                    feat: true,
                    choices: {
                        include: {
                            choiceOption: true,
                        }
                    }
                } 
            },
            features: { include: { feature: true } },
            choiceOptions: true,
            raceChoiceOptions: true,
            spells: true,
            weapons: { include: { weapon: true } },
            armors: { include: { armor: true } },
            user: true,
        }
    });
    
    if (!pers) return null;

    // Check ownership
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (pers.userId !== user?.id) {
        // Allow viewing if we decide to share, but for now restrict
        // return null; 
        // Actually, for debugging/demo, let's allow it if it's just a fetch, 
        // but strictly speaking we should restrict.
        // The user asked for "current user's perses", so let's enforce ownership for the sheet too.
        if (pers.userId !== user?.id) return null;
    }

    return pers;
}

export type PersWithRelations = NonNullable<Awaited<ReturnType<typeof getPersById>>>;

export type FeatureSource = "CLASS" | "SUBCLASS" | "RACE" | "SUBRACE" | "BACKGROUND" | "FEAT" | "PERS" | "CHOICE" | "RACE_CHOICE";

export type CharacterFeatureGroupKey = "passive" | "actions" | "bonusActions" | "reactions";

export interface CharacterFeatureItem {
    key: string;
    name: string;
    description: string;
    displayTypes: FeatureDisplayType[];
    primaryType: FeatureDisplayType;
    source: FeatureSource;
    sourceName: string;
    usesRemaining?: number | null;
    usesPer?: number | null;
    restType?: RestType | null;
}

export type CharacterFeaturesGroupedResult = Record<CharacterFeatureGroupKey, CharacterFeatureItem[]>;

function normalizeDisplayTypes(input: unknown): FeatureDisplayType[] {
    if (Array.isArray(input)) {
        const values = input.filter(Boolean) as FeatureDisplayType[];
        return values.length > 0 ? values : [FeatureDisplayType.PASSIVE];
    }
    if (typeof input === "string" && input.length > 0) {
        return [input as FeatureDisplayType];
    }
    return [FeatureDisplayType.PASSIVE];
}

function getPrimaryDisplayType(displayTypes: FeatureDisplayType[]): FeatureDisplayType {
    const normalized = normalizeDisplayTypes(displayTypes);
    // Priority: ACTION > BONUSACTION > REACTION > PASSIVE
    if (normalized.includes(FeatureDisplayType.ACTION)) return FeatureDisplayType.ACTION;
    if (normalized.includes(FeatureDisplayType.BONUSACTION)) return FeatureDisplayType.BONUSACTION;
    if (normalized.includes(FeatureDisplayType.REACTION)) return FeatureDisplayType.REACTION;
    return FeatureDisplayType.PASSIVE;
}

function toPrimaryGroupKey(primaryType: FeatureDisplayType): CharacterFeatureGroupKey {
    switch (primaryType) {
        case FeatureDisplayType.ACTION:
            return "actions";
        case FeatureDisplayType.BONUSACTION:
            return "bonusActions";
        case FeatureDisplayType.REACTION:
            return "reactions";
        default:
            return "passive";
    }
}

export async function getCharacterFeaturesGrouped(persId: number): Promise<CharacterFeaturesGroupedResult | null> {
    const session = await auth();
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });
    if (!user) return null;

    const pers = await prisma.pers.findUnique({
        where: { persId },
        include: {
            features: { include: { feature: true } },
            class: {
                include: {
                    features: {
                        include: { feature: true },
                    },
                },
            },
            subclass: {
                include: {
                    features: {
                        include: { feature: true },
                    },
                },
            },
            background: true,
            race: {
                include: {
                    traits: {
                        include: {
                            feature: true,
                        },
                    },
                },
            },
            subrace: {
                include: {
                    traits: {
                        include: {
                            feature: true,
                        },
                    },
                },
            },
            feats: {
                include: {
                    feat: true,
                    choices: {
                        include: {
                            choiceOption: true,
                        },
                    },
                },
            },
            choiceOptions: true,
            raceChoiceOptions: true,
            user: true,
        },
    });

    if (!pers) return null;
    if (pers.userId !== user.id) return null;

    const buckets: CharacterFeaturesGroupedResult = {
        passive: [],
        actions: [],
        bonusActions: [],
        reactions: [],
    };

    const push = (item: Omit<CharacterFeatureItem, "primaryType" | "displayTypes"> & { displayTypes: FeatureDisplayType[] }) => {
        const displayTypes = normalizeDisplayTypes(item.displayTypes);
        const primaryType = getPrimaryDisplayType(displayTypes);
        const key = toPrimaryGroupKey(primaryType);
        buckets[key].push({
            ...item,
            displayTypes,
            primaryType,
        });
    };

    // 1) Explicit pers_feature (usually level-up granted)
    for (const pf of pers.features) {
        const f = pf.feature;
        push({
            key: `PERS:feature:${f.featureId}`,
            name: f.name,
            description: f.description,
            displayTypes: normalizeDisplayTypes(f.displayType),
            source: "PERS",
            sourceName: f.name,
            usesRemaining: (pf as any).usesRemaining ?? null,
            usesPer: (pf as any).usesPer ?? null,
            restType: (pf as any).restType ?? null,
        });
    }

    // 2) Class features up to current level
    const cls = pers.class;
    if (cls?.features) {
        for (const cf of cls.features.filter((x) => x.levelGranted <= pers.level)) {
            const f = cf.feature;
            push({
                key: `CLASS:${pers.classId}:feature:${f.featureId}`,
                name: f.name,
                description: f.description,
                displayTypes: normalizeDisplayTypes(f.displayType),
                source: "CLASS",
                sourceName: cls.name,
            });
        }
    }

    // 3) Subclass features up to current level
    const subcls = pers.subclass;
    if (subcls?.features) {
        for (const scf of subcls.features.filter((x) => x.levelGranted <= pers.level)) {
            const f = scf.feature;
            push({
                key: `SUBCLASS:${pers.subclassId}:feature:${f.featureId}`,
                name: f.name,
                description: f.description,
                displayTypes: normalizeDisplayTypes(f.displayType),
                source: "SUBCLASS",
                sourceName: subcls.name,
            });
        }
    }

    // 4) Race + subrace traits
    const race = pers.race;
    if (race) {
        for (const t of race.traits ?? []) {
            const f = t.feature;
            push({
                key: `RACE:${pers.raceId}:feature:${f.featureId}`,
                name: f.name,
                description: f.description,
                displayTypes: normalizeDisplayTypes(f.displayType),
                source: "RACE",
                sourceName: race.name,
            });
        }
    }

    const subrace = pers.subrace;
    if (subrace) {
        for (const t of subrace.traits ?? []) {
            const f = t.feature;
            push({
                key: `SUBRACE:${pers.subraceId}:feature:${f.featureId}`,
                name: f.name,
                description: f.description,
                displayTypes: normalizeDisplayTypes(f.displayType),
                source: "SUBRACE",
                sourceName: subrace.name,
            });
        }
    }

    // 5) Class/race choice options stored directly on pers
    for (const co of pers.choiceOptions ?? []) {
        const sourceName = co.groupName;
        push({
            key: `CHOICE:${co.groupName}:option:${co.choiceOptionId}`,
            name: co.optionName,
            description: `${co.groupName}: ${co.optionName}`,
            displayTypes: [FeatureDisplayType.PASSIVE],
            source: "CHOICE",
            sourceName,
        });
    }
    for (const rco of pers.raceChoiceOptions ?? []) {
        const sourceName = rco.choiceGroupName;
        push({
            key: `RACE_CHOICE:${rco.choiceGroupName}:option:${rco.optionId}`,
            name: rco.optionName,
            description: rco.description || `${rco.choiceGroupName}: ${rco.optionName}`,
            displayTypes: [FeatureDisplayType.PASSIVE],
            source: "RACE_CHOICE",
            sourceName,
        });
    }

    // 6) Feats + their selected feat choice options
    for (const pf of pers.feats ?? []) {
        const featName = pf.feat.name;
        const displayTypes = [FeatureDisplayType.PASSIVE];

        // If a feat has no explicit choices, still show it as a single item
        if (!pf.choices || pf.choices.length === 0) {
            push({
                key: `FEAT:${pf.featId}`,
                name: featName,
                description: pf.feat.description,
                displayTypes,
                source: "FEAT",
                sourceName: featName,
            });
            continue;
        }

        for (const choice of pf.choices) {
            if (!choice.choiceOption) continue;
            push({
                key: `FEAT:${pf.featId}:choice:${choice.choiceOptionId}`,
                name: choice.choiceOption.optionName,
                description: `${choice.choiceOption.groupName}: ${choice.choiceOption.optionName}`,
                displayTypes,
                source: "FEAT",
                sourceName: featName,
            });
        }
    }

    return buckets;
}

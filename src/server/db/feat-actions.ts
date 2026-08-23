import { prisma } from "@/lib/prisma";
import { Ruleset } from "@prisma/client";

export type PersFeatWithDetails = {
  persFeatId: number;
  persId: number;
  featId: number;
  feat: {
    featId: number;
    name: string;
    engName: string;
    shortDescription: string;
    description: string;
    category: string | null;
    source: string;
    ruleset: Ruleset;
    isRepeatable: boolean;
  };
  choices: Array<{
    persFeatChoiceId: number;
    choiceOptionId: number;
    choiceOption: {
      choiceOptionId: number;
      optionName: string;
      optionNameEng: string;
      groupName: string;
    };
  }>;
};

export async function findFeatById(featId: number) {
  return prisma.feat.findUnique({
    where: { featId },
    include: {
      featChoiceOptions: {
        include: {
          choiceOption: true,
        },
      },
    },
  });
}

export async function findPersFeat(persId: number, featId: number) {
  return prisma.persFeat.findUnique({
    where: {
      featId_persId: {
        persId,
        featId,
      },
    },
    include: {
      feat: true,
      choices: {
        include: {
          choiceOption: true,
        },
      },
    },
  });
}

export async function addPersFeat(
  persId: number,
  featId: number,
  choiceOptionIds?: number[]
) {
  const feat = await prisma.feat.findUnique({
    where: { featId },
    select: { featId: true, isRepeatable: true },
  });

  if (!feat) {
    throw new Error("Рису не знайдено");
  }

  // Create or upsert persFeat
  const persFeat = await prisma.persFeat.upsert({
    where: {
      featId_persId: {
        persId,
        featId,
      },
    },
    create: {
      persId,
      featId,
    },
    update: {},
  });

  // Save choice options if provided
  if (choiceOptionIds && choiceOptionIds.length > 0) {
    await prisma.persFeatChoice.createMany({
      data: choiceOptionIds.map((choiceOptionId) => ({
        persFeatId: persFeat.persFeatId,
        choiceOptionId,
      })),
      skipDuplicates: true,
    });
  }

  return persFeat;
}

export async function removePersFeat(persId: number, featId: number) {
  return prisma.persFeat.deleteMany({
    where: {
      persId,
      featId,
    },
  });
}

export async function removePersFeatById(persFeatId: number, persId: number) {
  return prisma.persFeat.deleteMany({
    where: {
      persFeatId,
      persId,
    },
  });
}

export async function getPersFeats(persId: number): Promise<PersFeatWithDetails[]> {
  const records = await prisma.persFeat.findMany({
    where: { persId },
    include: {
      feat: true,
      choices: {
        include: {
          choiceOption: true,
        },
      },
    },
  });

  return records.map((r) => ({
    persFeatId: r.persFeatId,
    persId: r.persId,
    featId: r.featId,
    feat: {
      featId: r.feat.featId,
      name: String(r.feat.name),
      engName: r.feat.engName,
      shortDescription: r.feat.shortDescription,
      description: r.feat.description,
      category: r.feat.category ? String(r.feat.category) : null,
      source: String(r.feat.source),
      ruleset: r.feat.ruleset,
      isRepeatable: r.feat.isRepeatable,
    },
    choices: r.choices.map((c) => ({
      persFeatChoiceId: c.persFeatChoiceId,
      choiceOptionId: c.choiceOptionId,
      choiceOption: {
        choiceOptionId: c.choiceOption.choiceOptionId,
        optionName: c.choiceOption.optionName,
        optionNameEng: c.choiceOption.optionNameEng,
        groupName: c.choiceOption.groupName,
      },
    })),
  }));
}

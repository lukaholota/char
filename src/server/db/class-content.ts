import { prisma } from "@/lib/prisma";
import { findLegacySubclass2024 } from "@/rules/legacy-subclasses-2024";

export type ClassSubclassFeature = {
  subclassFeatureId: number;
  levelGranted: number;
  feature: {
    featureId: number;
    name: string;
    description: string;
  };
};

export type ClassSubclass = {
  subclassId: number;
  name: string;
  description: string | null;
  languages: string[];
  languagesToChooseCount: number;
  toolProficiencies: string[];
  toolToChooseCount: number | null;
  primaryCastingStat: string | null;
  spellcastingType: string;
  legacySource: string | null;
  features: ClassSubclassFeature[];
};

export async function loadClassSubclasses(classId: number): Promise<ClassSubclass[]> {
  const rows = await prisma.subclass.findMany({
    where: { classId },
    select: {
      class: { select: { name: true } },
      subclassId: true,
      name: true,
      description: true,
      languages: true,
      languagesToChooseCount: true,
      toolProficiencies: true,
      toolToChooseCount: true,
      primaryCastingStat: true,
      spellcastingType: true,
      features: {
        select: {
          subclassFeatureId: true,
          levelGranted: true,
          feature: { select: { featureId: true, name: true, description: true } },
        },
      },
    },
    orderBy: [{ subclassId: "asc" }],
  });
  return rows.map(({ class: characterClass, ...subclass }) => ({
    ...subclass,
    legacySource: findLegacySubclass2024(characterClass.name, subclass.name)?.source ?? null,
  }));
}

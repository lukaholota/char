import { readFileSync } from "fs";
import { join } from "path";
import type { Classes, PrismaClient, Races, Subclasses, Subraces, Variants } from "@prisma/client";

export type CatalogProseKind = "classes" | "races" | "subraces" | "variants" | "subclasses";

export type CatalogProse2014 = {
  key: string;
  engName: string;
  source: string;
  sourceSections: string[];
  description: string;
};

type StoredProse = { name: string; description: string | null };

type ProseStore = {
  findStored: (prisma: PrismaClient, keys: string[]) => Promise<StoredProse[]>;
  writeDescription: (prisma: PrismaClient, key: string, description: string) => Promise<unknown>;
};

const RULESET = "RULES_2014";

export const CATALOG_PROSE_KINDS: CatalogProseKind[] = ["classes", "races", "subraces", "variants", "subclasses"];

/// Клас, раса й підраса мають унікальний ключ `name + ruleset` і колонку `description` (KR33.3),
/// тож різниться лише делегат Prisma. У `race_variant` унікального ключа немає, тому запис —
/// `updateMany` за тією самою парою. Підклас унікальний за `classId + name`, а назва підкласу 2014
/// не повторюється між класами, тож і йому досить `updateMany` за назвою й редакцією.
const PROSE_STORES: Record<CatalogProseKind, ProseStore> = {
  classes: {
    findStored: (prisma, keys) =>
      prisma.class.findMany({ where: { ruleset: RULESET, name: { in: keys as Classes[] } }, select: { name: true, description: true } }),
    writeDescription: (prisma, key, description) =>
      prisma.class.update({ where: { name_ruleset: { name: key as Classes, ruleset: RULESET } }, data: { description } }),
  },
  races: {
    findStored: (prisma, keys) =>
      prisma.race.findMany({ where: { ruleset: RULESET, name: { in: keys as Races[] } }, select: { name: true, description: true } }),
    writeDescription: (prisma, key, description) =>
      prisma.race.update({ where: { name_ruleset: { name: key as Races, ruleset: RULESET } }, data: { description } }),
  },
  subraces: {
    findStored: (prisma, keys) =>
      prisma.subrace.findMany({ where: { ruleset: RULESET, name: { in: keys as Subraces[] } }, select: { name: true, description: true } }),
    writeDescription: (prisma, key, description) =>
      prisma.subrace.update({ where: { name_ruleset: { name: key as Subraces, ruleset: RULESET } }, data: { description } }),
  },
  variants: {
    findStored: (prisma, keys) =>
      prisma.raceVariant.findMany({ where: { ruleset: RULESET, name: { in: keys as Variants[] } }, select: { name: true, description: true } }),
    writeDescription: (prisma, key, description) =>
      prisma.raceVariant.updateMany({ where: { name: key as Variants, ruleset: RULESET }, data: { description } }),
  },
  subclasses: {
    findStored: (prisma, keys) =>
      prisma.subclass.findMany({ where: { ruleset: RULESET, name: { in: keys as Subclasses[] } }, select: { name: true, description: true } }),
    writeDescription: (prisma, key, description) =>
      prisma.subclass.updateMany({ where: { name: key as Subclasses, ruleset: RULESET }, data: { description } }),
  },
};

export function readCatalogProse2014(kind: CatalogProseKind): CatalogProse2014[] {
  const path = join(process.cwd(), "data/2014/catalog-prose", `${kind}.json`);
  return JSON.parse(readFileSync(path, "utf-8")) as CatalogProse2014[];
}

export async function findCatalogProseDrift(prisma: PrismaClient, kind: CatalogProseKind): Promise<CatalogProse2014[]> {
  const prose = readCatalogProse2014(kind);
  const stored = await PROSE_STORES[kind].findStored(prisma, prose.map((entry) => entry.key));

  const missing = prose.filter((entry) => !stored.some((row) => row.name === entry.key));
  if (missing.length > 0) {
    throw new Error(`${kind} 2014 немає в базі: ${missing.map((entry) => entry.key).join(", ")}`);
  }

  return prose.filter((entry) => stored.find((row) => row.name === entry.key)?.description !== entry.description);
}

export async function syncCatalogProse2014(
  prisma: PrismaClient,
  kind: CatalogProseKind,
  drift: CatalogProse2014[],
): Promise<void> {
  for (const entry of drift) {
    await PROSE_STORES[kind].writeDescription(prisma, entry.key, entry.description);
  }
}

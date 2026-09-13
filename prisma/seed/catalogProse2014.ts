import { readFileSync } from "fs";
import { join } from "path";
import type { Classes, PrismaClient } from "@prisma/client";

export type ClassProse2014 = {
  key: Classes;
  engName: string;
  source: string;
  sourceSections: string[];
  description: string;
};

export const CLASS_PROSE_2014_PATH = "data/2014/catalog-prose/classes.json";

export function readClassProse2014(): ClassProse2014[] {
  return JSON.parse(readFileSync(join(process.cwd(), CLASS_PROSE_2014_PATH), "utf-8")) as ClassProse2014[];
}

export async function findClassProseDrift(prisma: PrismaClient): Promise<ClassProse2014[]> {
  const prose = readClassProse2014();
  const stored = await prisma.class.findMany({
    where: { ruleset: "RULES_2014", name: { in: prose.map((entry) => entry.key) } },
    select: { name: true, description: true },
  });

  const missing = prose.filter((entry) => !stored.some((row) => row.name === entry.key));
  if (missing.length > 0) {
    throw new Error(`Класів 2014 немає в базі: ${missing.map((entry) => entry.key).join(", ")}`);
  }

  return prose.filter((entry) => stored.find((row) => row.name === entry.key)?.description !== entry.description);
}

export async function syncClassProse2014(prisma: PrismaClient, drift: ClassProse2014[]): Promise<void> {
  for (const entry of drift) {
    await prisma.class.update({
      where: { name_ruleset: { name: entry.key, ruleset: "RULES_2014" } },
      data: { description: entry.description },
    });
  }
}

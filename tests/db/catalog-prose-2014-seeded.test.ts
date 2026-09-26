import { afterAll, expect, it } from "vitest";
import type { Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CatalogProseKind, readCatalogProse2014 } from "../../prisma/seed/catalogProse2014";
import { BLOOD_HUNTER_CLASS_NAMES } from "../../prisma/seed/bloodHunter";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

const byName = (left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name);

/// Мисливець за кровʼю — власний носій O45, його звіряє blood-hunter-carrier.
async function findDescribedRows(kind: Exclude<CatalogProseKind, "subclasses">) {
  const query = { where: { ruleset: "RULES_2014" as const, description: { not: null } }, select: { name: true, description: true } };
  if (kind === "classes") return prisma.class.findMany({ ...query, where: { ...query.where, name: { notIn: [...BLOOD_HUNTER_CLASS_NAMES] } } });
  if (kind === "races") return prisma.race.findMany(query);
  if (kind === "subraces") return prisma.subrace.findMany(query);
  return prisma.raceVariant.findMany(query);
}

function readProseRows(kind: CatalogProseKind) {
  return readCatalogProse2014(kind).map((entry) => ({ name: entry.key, description: entry.description }));
}

it.each(["classes", "races", "subraces", "variants"] as const)("KR33.6 — опис %s 2014 у базі дорівнює файлу, і зайвих описів немає", async (kind) => {
  const stored = await findDescribedRows(kind);

  expect(stored.sort(byName)).toEqual(readProseRows(kind).sort(byName));
});

/// Самописні описи ще не звірених підкласів лежать у базі поруч, тож «зайвих» тут не буває —
/// звіряються лише ті, що вже переїхали у файл.
it("KR33.7 — опис підкласу 2014 у базі дорівнює файлу", async () => {
  const prose = readProseRows("subclasses");
  const stored = await prisma.subclass.findMany({
    where: { ruleset: "RULES_2014", name: { in: prose.map((entry) => entry.name as Subclasses) } },
    select: { name: true, description: true },
  });

  expect(stored.sort(byName)).toEqual(prose.sort(byName));
});

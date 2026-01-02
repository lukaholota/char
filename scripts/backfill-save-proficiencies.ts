import dotenv from "dotenv";
import path from "path";
import { Ability } from "@prisma/client";

// tsx scripts do not automatically load Next.js env files.
// Ensure DATABASE_URL is available before Prisma client is instantiated.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function uniqAbilities(values: Array<Ability | null | undefined>): Ability[] {
  const out: Ability[] = [];
  const seen = new Set<Ability>();
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Create .env/.env.local or export DATABASE_URL before running this script.");
    process.exitCode = 1;
    return;
  }

  const { prisma } = await import("@/lib/prisma");

  const perses = await prisma.pers.findMany({
    select: {
      persId: true,
      additionalSaveProficiencies: true,
      class: { select: { savingThrows: true } },
    },
  });

  let updated = 0;

  for (const p of perses) {
    const existing = Array.isArray(p.additionalSaveProficiencies) ? p.additionalSaveProficiencies : [];
    const fromClass = Array.isArray(p.class?.savingThrows) ? p.class.savingThrows : [];

    // New desired source-of-truth: store everything in additionalSaveProficiencies.
    const next = uniqAbilities([...(existing ?? []), ...(fromClass ?? [])]);

    const sameLength = next.length === existing.length;
    const sameItems = sameLength && next.every((a) => existing.includes(a));
    if (sameItems) continue;

    await prisma.pers.update({
      where: { persId: p.persId },
      data: { additionalSaveProficiencies: next },
    });

    updated++;
  }

  console.log(`Done. Updated ${updated} character(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

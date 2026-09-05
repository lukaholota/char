/**
 * Скільки знятих форм `radiant` лишилося в базі, на яку вказує `.env.test`.
 *
 *   bunx tsx scripts/terms/verify-radiant-db.ts
 *
 * Діф по каталогах (`bun run diff:radiant`) бачить лише те, що вже витягнуто в JSON,
 * а сід пише в базу — тож після `seed:radiant:test` перевіряти треба саме тут.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

async function main() {
  const url = dotenv.config({ path: ".env.test", quiet: true }).parsed?.DATABASE_URL as string;
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const RE = /Світлом|[Пп]роменист/;
  const count = (rows: (string | null)[]) => rows.filter((r) => r && RE.test(r)).length;
  const spells = await prisma.spell.findMany({ select: { description: true } });
  const items = await prisma.magicItem.findMany({ select: { description: true, shortDescription: true } });
  const feats = await prisma.feature.findMany({ select: { description: true, name: true } });
  const subs = await prisma.subclass.findMany({ select: { description: true } });
  const inf = await prisma.infusion.findMany({ select: { name: true } });
  const spellRows = await prisma.spell.findMany({ select: { engName: true, ruleset: true, description: true } });
  for (const s of spellRows) if (RE.test(s.description)) console.log("  SPELL", s.ruleset, s.engName);
  const featRows = await prisma.feature.findMany({ select: { engName: true, name: true, description: true } });
  for (const f of featRows) if (RE.test(f.description) || RE.test(f.name)) console.log("  FEATURE", f.engName);
  console.log("spells       ", count(spells.map((s) => s.description)));
  console.log("magicItem    ", count(items.flatMap((i) => [i.description, i.shortDescription])));
  console.log("feature      ", count(feats.flatMap((f) => [f.description, f.name])));
  console.log("subclass     ", count(subs.map((s) => s.description)));
  console.log("infusion     ", count(inf.map((i) => i.name)));
  await prisma.$disconnect(); await pool.end();
}
main();

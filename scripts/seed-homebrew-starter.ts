/**
 * Стартові записи хоумбрю від акаунта власника → база. Без --apply лише показує план.
 *
 *   bun tsx scripts/seed-homebrew-starter.ts --target test [--apply]
 *   bun tsx scripts/seed-homebrew-starter.ts --target prod [--apply]
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import { PrismaClient, type Classes } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { buildCreatureStatBlock, parseHomebrewCreatureInput, parseHomebrewSpellInput, toStoredRuleset } from "../src/lib/logic/homebrew-input";
import { storeSquareImage } from "../src/server/media/image-upload";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString, type SeedTargetName } from "./lib/seed-target";

const DATA_DIR = "data/homebrew-starter";
const OWNER_EMAIL = "lukagolota1@gmail.com";

type StarterSpell = Record<string, unknown> & { name: string; ruleset: string };
type StarterCreature = Record<string, unknown> & { name: string; image?: string; ruleset: string };
type StarterData = { spells: StarterSpell[]; creatures: StarterCreature[] };

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-homebrew-starter.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
dotenv.config({ path: ".env.local", quiet: true });
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`🍺 Стартовий хоумбрю → "${readDatabaseName(connectionString)}" (--target ${target})${isApplying ? "" : " — показ, без запису"}\n`);
  const data = readStarterData();
  const authorUserId = await findAuthorUserId(target);
  const existing = await listExistingEntries(authorUserId);

  // Каталог показує новіші вище, тож пишемо з кінця файлу, щоб порядок на сайті збігся з файлом.
  for (const spell of [...data.spells].reverse()) await seedSpell(spell, authorUserId, existing);
  for (const creature of [...data.creatures].reverse()) await seedCreature(creature, authorUserId, existing);
}

function readStarterData(): StarterData {
  const readList = (file: string) => JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8"));
  return {
    spells: [...readList("spells.json"), ...readList("spells-2024.json")],
    creatures: [...readList("creatures.json"), ...readList("creatures-2024.json")],
  };
}

async function findAuthorUserId(seedTarget: SeedTargetName): Promise<number> {
  const user = await prisma.user.findUnique({ where: { email: OWNER_EMAIL }, select: { id: true } });
  if (user) return user.id;
  if (seedTarget === "prod") throw new Error(`На проді немає користувача ${OWNER_EMAIL}`);
  if (!isApplying) return 0;
  const created = await prisma.user.create({ data: { email: OWNER_EMAIL, name: "Luka Holota" }, select: { id: true } });
  return created.id;
}

type ExistingEntry = { homebrewEntryId: number; imageKey: string | null };

/// Та сама назва живе в обох редакціях окремим записом, тож ключ несе ще й редакцію.
async function listExistingEntries(authorUserId: number): Promise<Map<string, ExistingEntry>> {
  const entries = await prisma.homebrewEntry.findMany({
    where: { authorUserId, deletedAt: null },
    select: { homebrewEntryId: true, kind: true, name: true, ruleset: true, creature: { select: { statBlock: true } } },
  });
  return new Map(
    entries.map((entry) => [
      buildEntryKey(entry.kind, entry.ruleset ?? "ANY", entry.name),
      { homebrewEntryId: entry.homebrewEntryId, imageKey: readImageKey(entry.creature?.statBlock) },
    ])
  );
}

function readImageKey(statBlock: unknown): string | null {
  const key = (statBlock as { imageKey?: unknown } | null | undefined)?.imageKey;
  return typeof key === "string" ? key : null;
}

function buildEntryKey(kind: string, ruleset: string, name: string): string {
  return `${kind}:${ruleset}:${name}`;
}

async function seedSpell(spell: StarterSpell, authorUserId: number, existing: Map<string, ExistingEntry>) {
  const parsed = parseHomebrewSpellInput(spell);
  if ("errors" in parsed) throw new Error(`Заклинання «${spell.name}»: ${JSON.stringify(parsed.errors)}`);
  const seeded = existing.get(buildEntryKey("SPELL", spell.ruleset, spell.name));
  const { ruleset, name, classes, ...fields } = parsed.data;
  const spellData = { ...fields, engName: fields.engName || null, classes: classes as Classes[] };

  if (!isApplying) return reportPlan("SPELL", spell, seeded !== undefined);
  if (seeded) {
    await prisma.homebrewEntry.update({ where: { homebrewEntryId: seeded.homebrewEntryId }, data: { updatedAt: new Date(), spell: { update: spellData } } });
    return reportPlan("SPELL", spell, true);
  }
  await prisma.homebrewEntry.create({
    data: { kind: "SPELL", name, ruleset: toStoredRuleset(ruleset), authorUserId, spell: { create: spellData } },
  });
  reportPlan("SPELL", spell, false);
}

async function seedCreature(creature: StarterCreature, authorUserId: number, existing: Map<string, ExistingEntry>) {
  const parsed = parseHomebrewCreatureInput(creature);
  if ("errors" in parsed) throw new Error(`Істота «${creature.name}»: ${JSON.stringify(parsed.errors)}`);
  const seeded = existing.get(buildEntryKey("CREATURE", creature.ruleset, creature.name));
  if (!isApplying) return reportPlan("CREATURE", creature, seeded !== undefined);

  // Картинка вантажиться лише раз: записаний ключ переживає повторний сід, бо файл той самий.
  const imageKey = seeded?.imageKey ?? (await uploadImage(creature));
  const { data } = parsed;
  const creatureData = { engName: data.engName || null, size: data.size, type: data.type, challenge: data.challenge, statBlock: { ...buildCreatureStatBlock(data), imageKey } };

  if (seeded) {
    await prisma.homebrewEntry.update({ where: { homebrewEntryId: seeded.homebrewEntryId }, data: { updatedAt: new Date(), creature: { update: creatureData } } });
    return reportPlan("CREATURE", creature, true);
  }
  await prisma.homebrewEntry.create({
    data: { kind: "CREATURE", name: data.name, ruleset: toStoredRuleset(data.ruleset), authorUserId, creature: { create: creatureData } },
  });
  reportPlan("CREATURE", creature, false);
}

/// Істота без файлу картинки сідається без неї — лист і картка це переживають, а художник дожене.
async function uploadImage(creature: StarterCreature): Promise<string | null> {
  if (!creature.image) return null;
  const stored = await storeSquareImage(new Blob([readFileSync(path.join(DATA_DIR, creature.image))]), "homebrew/creatures");
  if ("error" in stored) throw new Error(`Картинка «${creature.name}»: ${stored.error}`);
  return stored.key;
}

function reportPlan(kind: "SPELL" | "CREATURE", entry: { name: string; ruleset: string }, exists: boolean): void {
  const action = exists ? (isApplying ? "  ~  оновлено" : "  ~  оновиться") : isApplying ? "  +  додано" : "  +  додасться";
  const edition = entry.ruleset === "ANY" ? "обидві редакції" : entry.ruleset.replace("RULES_", "");
  console.log(`${action}  ${kind === "SPELL" ? "заклинання" : "істота"} «${entry.name}» (${edition})`);
}

main()
  .catch((error) => {
    console.error("FATAL:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

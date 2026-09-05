import { Prisma, PrismaClient, Source } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const RULESET = "RULES_2014" as const;
const BATCH_PATHS = [
  "data/2014/new-spells/batch-01.json",
  "data/2014/new-spells/batch-02.json",
];

const sharedSpellSchema = z.object({
  engName: z.string().min(1),
  source: z.string().min(1),
  pinnedSource: z.string().min(1),
  page: z.number().int().positive(),
});

/// `classes` дозволено порожнім: `spells/sources.json` пінованого корпусу не подає списку класів
/// для частини книг (GGR — жодного рядка), і вигаданий клас був би гіршим за його відсутність.
/// Порожній перелік звіряє content gate — він вимагає, щоб і в корпусі класів не було.
const readySpellSchema = sharedSpellSchema.extend({
  status: z.literal("ready"),
  name: z.string().min(1),
  level: z.number().int().min(0).max(9),
  school: z.string().min(1),
  castingTime: z.string().min(1),
  range: z.string().min(1),
  components: z.string(),
  duration: z.string().min(1),
  hasRitual: z.enum(["так", "ні"]),
  hasConcentration: z.enum(["так", "ні"]),
  classes: z.array(z.string().min(1)),
  description: z.string().min(20),
});

const blockedSpellSchema = sharedSpellSchema.extend({
  status: z.literal("blocked-term"),
  blocker: z.string().min(1),
});

const batchSchema = z.object({
  batch: z.number().int().positive(),
  sourceRevision: z.literal("e5f3e77b303a92df10487207857200245e71957c"),
  spells: z.array(z.discriminatedUnion("status", [readySpellSchema, blockedSpellSchema])).length(13),
});

export type NewSpells2014Batch = z.infer<typeof batchSchema>;
export type NewSpell2014 = z.infer<typeof readySpellSchema>;
export type DeferredSpell2014 = z.infer<typeof blockedSpellSchema>;

export type NewSpells2014Outcome = {
  imported: string[];
  deferred: DeferredSpell2014[];
};

export function readNewSpells2014Batches(): NewSpells2014Batch[] {
  return BATCH_PATHS.map((path, index) => readBatch(path, index + 1));
}

export function readNewSpells2014Spells() {
  return readNewSpells2014Batches().flatMap((batch) => batch.spells);
}

export function readNewSpells2014Ready(): NewSpell2014[] {
  return readNewSpells2014Spells().filter(isReady);
}

export function readNewSpells2014Deferred(): DeferredSpell2014[] {
  return readNewSpells2014Spells().filter(isDeferred);
}

function readBatch(path: string, expectedNumber: number): NewSpells2014Batch {
  const batch = batchSchema.parse(JSON.parse(readFileSync(join(process.cwd(), path), "utf-8")));
  if (batch.batch !== expectedNumber) {
    throw new Error(`${path}: партія ${batch.batch}, а очікували ${expectedNumber}`);
  }
  return batch;
}

function isReady(spell: NewSpell2014 | DeferredSpell2014): spell is NewSpell2014 {
  return spell.status === "ready";
}

function isDeferred(spell: NewSpell2014 | DeferredSpell2014): spell is DeferredSpell2014 {
  return spell.status === "blocked-term";
}

export async function seedNewSpells2014(
  prisma: PrismaClient,
): Promise<NewSpells2014Outcome> {
  const ready = readNewSpells2014Ready();
  const sources = ready.map((spell) => resolveSource(spell.source));
  const imported = await prisma.$transaction((transaction) =>
    seedReadySpells(transaction, ready, sources),
  );

  return { imported, deferred: readNewSpells2014Deferred() };
}

function resolveSource(source: string): Source {
  const resolved = (Source as Record<string, string>)[source];
  if (!resolved) {
    throw new Error(`Source.${source} відсутній: власник має застосувати SQL KR17.3 і виконати db:pull`);
  }
  return resolved as Source;
}

async function seedReadySpells(
  prisma: Prisma.TransactionClient,
  spells: NewSpell2014[],
  sources: Source[],
): Promise<string[]> {
  for (const [index, spell] of spells.entries()) {
    await upsertSpell(prisma, spell, sources[index]);
  }
  return spells.map((spell) => spell.engName);
}

async function upsertSpell(
  prisma: Prisma.TransactionClient,
  spell: NewSpell2014,
  source: Source,
): Promise<void> {
  const saved = await prisma.spell.upsert({
    where: { engName_ruleset: { engName: spell.engName, ruleset: RULESET } },
    update: buildSpellPayload(spell, source),
    create: buildSpellPayload(spell, source),
    select: { spellId: true },
  });

  await prisma.spellClasses.deleteMany({ where: { spellId: saved.spellId } });
  await prisma.spellClasses.createMany({
    data: spell.classes.map((className) => ({ spellId: saved.spellId, className, ruleset: RULESET })),
  });
}

function buildSpellPayload(spell: NewSpell2014, source: Source) {
  return {
    name: spell.name,
    engName: spell.engName,
    level: spell.level,
    school: spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    components: spell.components,
    duration: spell.duration,
    hasRitual: spell.hasRitual,
    hasConcentration: spell.hasConcentration,
    description: spell.description,
    ruleset: RULESET,
    source,
  };
}

/**
 * Generate static invocations.json from the database (2014 only).
 * Run: npx tsx scripts/generate-invocations.ts
 */

import { PrismaClient, Ruleset } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/invocations.json');
export const ACTIVE_RULESET: Ruleset = 'RULES_2014';

// Invocations have no model of their own — they are choice options of this group.
const INVOCATION_GROUP_NAME = 'Потойбічні виклики';
const PACT_GROUP_NAME = 'Дар пакту';
const INVOCATION_SOURCE = 'PHB_2014';

export type GeneratedInvocation = {
  id: number;
  name: string;
  nameUa: string;
  engName: string;
  minLevel: number | null;
  pactRequirement: string | null;
  prerequisite: string | null;
  description: string;
  shortDescription: string;
  ruleset: Ruleset;
  source: string;
};

type InvocationFeature = {
  name: string;
  description: string;
  shortDescription: string | null;
};

type InvocationRow = {
  choiceOptionId: number;
  optionNameEng: string;
  prerequisites: unknown;
  features: { feature: InvocationFeature }[];
};

type InvocationRequirements = {
  level: number | null;
  pact: string | null;
};

function readRequirements(raw: unknown): InvocationRequirements {
  if (!raw || typeof raw !== 'object') return { level: null, pact: null };
  const parsed = raw as { level?: unknown; pact?: unknown };
  return {
    level: typeof parsed.level === 'number' ? parsed.level : null,
    pact: typeof parsed.pact === 'string' ? parsed.pact : null,
  };
}

function describeRequirements({ level, pact }: InvocationRequirements, pactNames: Map<string, string>): string | null {
  const parts: string[] = [];
  if (level !== null) parts.push(`Рівень ${level}+`);
  if (pact !== null) parts.push(`Дар: ${pactNames.get(pact)} [${pact}]`);
  return parts.length > 0 ? parts.join(', ') : null;
}

function findFeature(row: InvocationRow): InvocationFeature | undefined {
  return row.features[0]?.feature;
}

function buildInvocation(row: InvocationRow, index: number, pactNames: Map<string, string>): GeneratedInvocation {
  const feature = findFeature(row);
  if (!feature) throw new Error(`Invocation ${row.optionNameEng} has no linked feature`);

  const requirements = readRequirements(row.prerequisites);

  return {
    id: index + 1,
    name: `${feature.name} [${row.optionNameEng}]`,
    nameUa: feature.name,
    engName: row.optionNameEng,
    minLevel: requirements.level,
    pactRequirement: requirements.pact,
    prerequisite: describeRequirements(requirements, pactNames),
    description: feature.description,
    shortDescription: feature.shortDescription ?? '',
    ruleset: ACTIVE_RULESET,
    source: INVOCATION_SOURCE,
  };
}

function findRowsWithoutUkrainianName(rows: InvocationRow[]): string[] {
  return rows.filter((row) => !findFeature(row)?.name).map((row) => row.optionNameEng);
}

function findUntranslatedPacts(rows: InvocationRow[], pactNames: Map<string, string>): string[] {
  const pacts = rows.map((row) => readRequirements(row.prerequisites).pact);
  return [...new Set(pacts.filter((pact): pact is string => pact !== null && !pactNames.has(pact)))];
}

// The pact name a prerequisite needs lives on the pact's own choice option, one group over.
async function findPactNames(prisma: PrismaClient): Promise<Map<string, string>> {
  const pacts = await prisma.choiceOption.findMany({
    where: { groupName: PACT_GROUP_NAME, ruleset: ACTIVE_RULESET },
    include: { features: { include: { feature: true } } },
  });

  return new Map(
    pacts
      .filter((pact) => pact.features[0]?.feature.name)
      .map((pact) => [pact.optionNameEng, pact.features[0].feature.name])
  );
}

async function main() {
  console.log('🜁 Generating invocations.json from database...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const rows: InvocationRow[] = await prisma.choiceOption.findMany({
      where: { groupName: INVOCATION_GROUP_NAME, ruleset: ACTIVE_RULESET },
      include: { features: { include: { feature: true } } },
      orderBy: [{ choiceOptionId: 'asc' }],
    });

    if (rows.length === 0) {
      throw new Error(`No ${ACTIVE_RULESET} invocations in the database — refusing to write an empty catalog`);
    }

    const pactNames = await findPactNames(prisma);

    const untranslated = findRowsWithoutUkrainianName(rows);
    if (untranslated.length > 0) {
      throw new Error(`No linked feature name for: ${untranslated.join(', ')} — every invocation takes its Ukrainian name from its feature`);
    }

    const untranslatedPacts = findUntranslatedPacts(rows, pactNames);
    if (untranslatedPacts.length > 0) {
      throw new Error(`No Ukrainian pact name for: ${untranslatedPacts.join(', ')} — the '${PACT_GROUP_NAME}' choice options must carry a linked feature`);
    }

    const data = rows.map((row, index) => buildInvocation(row, index, pactNames));

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Generated ${data.length} invocations to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Failed to generate invocations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

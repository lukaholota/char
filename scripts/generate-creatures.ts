/**
 * Generate static creatures.json from Prisma database
 * Run: npx tsx scripts/generate-creatures.ts
 */

import { PrismaClient, Ruleset } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { keepFilled } from './lib/keep-filled';

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/creatures.json');

export type GeneratedCreature = {
  creatureId: number;
  name: string;
  nameEng: string;
  size: string;
  type: string;
  alignment: string;
  source: string;
  ac: string;
  hp: string;
  speed: string;
  strength: string;
  dexterity: string;
  constitution: string;
  intelligence: string;
  wisdom: string;
  charisma: string;
  skills: string;
  senses: string;
  languages: string;
  challenge: string;
  damageImmunity: string;
  damageResistance: string;
  conditionImmunity: string;
  savingThrows: string;
  specialAbilities: string;
  actions: string;
  reactions: string;
  legendaryActions: string;
  proficiencyBonus: string;
  description: string;
  lairActions: string;
  lairInfo: string;
  regionEffects: string;
  xp: string;
  ruleset: Ruleset;
  /// Added for the 2024 import (KR12.1), applied to the DB by
  /// db/changes/2026-08-17-kr12.1-creature-2024-columns.sql. Optional because the inherited
  /// 2014 catalog predates them and rows leave them null.
  initiative?: string;
  gear?: string;
  bonusActions?: string;
  damageVulnerability?: string;
  xpInLair?: string;
  imageUrl?: string;
};

async function main() {
  console.log('🐉 Generating creatures.json...');

  let data: GeneratedCreature[] = [];

  const connString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (connString) {
    try {
      const pool = new Pool({ connectionString: connString });
      const adapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter });

      const creatures = await prisma.creature.findMany({
        where: { ruleset: "RULES_2014" },
        orderBy: [{ name: 'asc' }],
      });

      data = creatures.map((c) => ({
        creatureId: c.creatureId,
        name: c.name || "",
        nameEng: c.nameEng || "",
        size: c.size || "",
        type: c.type || "",
        alignment: c.alignment || "",
        source: String(c.source || "MM"),
        ac: c.ac || "",
        hp: c.hp || "",
        speed: c.speed || "",
        strength: c.strength || "10 (+0)",
        dexterity: c.dexterity || "10 (+0)",
        constitution: c.constitution || "10 (+0)",
        intelligence: c.intelligence || "10 (+0)",
        wisdom: c.wisdom || "10 (+0)",
        charisma: c.charisma || "10 (+0)",
        skills: c.skills || "",
        senses: c.senses || "",
        languages: c.languages || "",
        challenge: c.challenge || "-",
        damageImmunity: c.damageImmunity || "",
        damageResistance: c.damageResistance || "",
        conditionImmunity: c.conditionImmunity || "",
        savingThrows: c.savingThrows || "",
        specialAbilities: c.specialAbilities || "",
        actions: c.actions || "",
        reactions: c.reactions || "",
        legendaryActions: c.legendaryActions || "",
        proficiencyBonus: c.proficiencyBonus || "",
        description: c.description || "",
        lairActions: c.lairActions || "",
        lairInfo: c.lairInfo || "",
        regionEffects: c.regionEffects || "",
        xp: c.xp || "-",
        ruleset: "RULES_2014" as Ruleset,
        ...keepFilled({
          initiative: c.initiative,
          gear: c.gear,
          bonusActions: c.bonusActions,
          damageVulnerability: c.damageVulnerability,
          xpInLair: c.xpInLair,
          imageUrl: c.imageUrl,
        }),
      }));

      await prisma.$disconnect();
      await pool.end();
    } catch (e) {
      console.warn('⚠️ Could not fetch creatures from database:', e);
    }
  }

  // Ensure directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  // Write JSON file
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Generated ${data.length} creatures to ${OUTPUT_PATH}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

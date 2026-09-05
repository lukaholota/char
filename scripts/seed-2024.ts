/**
 * KR6.3 Step 3 — Master 2024 Seed Script
 *
 * Runs all 2024 seeders against the configured database in dependency order:
 * 1. Feats 2024 (75)
 * 2. Backgrounds 2024 (16 new)
 * 3. Update 15 existing *_2024 backgrounds in-place (background_id preserved)
 * 4. Species / Races 2024 (10)
 * 5. Classes 2024 (13)
 * 6. Subclasses 2024 (48)
 * 7. Weapons 2024 (38)
 * 8. Spells 2024 (391)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedFeats2024 } from "../prisma/seed/featSeed2024";
import { seedBackgrounds2024 } from "../prisma/seed/backgroundSeed2024";
import { update15ExistingBackgrounds2024 } from "../prisma/seed/update15ExistingBackgrounds2024";
import { seedRaces2024 } from "../prisma/seed/raceSeed2024";
import { seedClasses2024 } from "../prisma/seed/classSeed2024";
import { seedSubclasses2024 } from "../prisma/seed/subclassSeed2024";
import { seedWeapons2024 } from "../prisma/seed/weaponSeed2024";
import { seedSpells2024 } from "../prisma/seed/spellSeed2024";
import { seedClassEquipment2024 } from "../prisma/seed/classEquipment2024";
import { seedMetamagic2024 } from "../prisma/seed/metamagic2024";

import * as dotenv from "dotenv";

const TARGETS = {
  test: { envFile: ".env.test", expectedSuffix: "_test" },
  prod: { envFile: ".env", expectedSuffix: "spells" },
} as const;

type TargetName = keyof typeof TARGETS;

function readTargetName(argv: string[]): TargetName {
  const flagIndex = argv.indexOf("--target");
  const name = flagIndex === -1 ? undefined : argv[flagIndex + 1];

  if (name !== "test" && name !== "prod") {
    throw new Error(
      "Сідер пише в базу, тому цільову базу треба назвати явно — дефолту немає.\n" +
        "  bun run seed:2024:test   → .env.test, клон spells_test\n" +
        "  bun run seed:2024:prod   → .env, робоча база spells\n" +
        "Клон піднімається так: ./scripts/db-clone.sh spells_test",
    );
  }

  return name;
}

function resolveConnectionString(target: TargetName): string {
  const { envFile, expectedSuffix } = TARGETS[target];
  const parsed = dotenv.config({ path: envFile, quiet: true });

  if (parsed.error) {
    throw new Error(`Не читається ${envFile}: ${parsed.error.message}`);
  }

  const url = parsed.parsed?.DATABASE_URL;
  if (!url) {
    throw new Error(`У ${envFile} немає DATABASE_URL.`);
  }

  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith(expectedSuffix)) {
    throw new Error(
      `--target ${target} очікує базу на "${expectedSuffix}", а ${envFile} веде в "${dbName}". Зупинено.`,
    );
  }

  return url;
}

const target = readTargetName(process.argv);
const connectionString = resolveConnectionString(target);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SEEDERS = {
  feats: seedFeats2024,
  backgrounds: seedBackgrounds2024,
  "backgrounds-existing": update15ExistingBackgrounds2024,
  races: seedRaces2024,
  classes: seedClasses2024,
  subclasses: seedSubclasses2024,
  metamagic: seedMetamagic2024,
  weapons: seedWeapons2024,
  spells: seedSpells2024,
  // Останнім: рядки посилаються на класи й зброю, засіяні вище, і на набори
  // спорядження 2024 зі scripts/seed-equipment-packs.ts.
  "class-equipment": seedClassEquipment2024,
} as const;

/** Правка в одному файлі даних не варта повного пересіву 391 заклинання й 48 підкласів. */
function readSelectedSeeders(argv: string[]): Array<keyof typeof SEEDERS> {
  const flagIndex = argv.indexOf("--only");
  if (flagIndex === -1) return Object.keys(SEEDERS) as Array<keyof typeof SEEDERS>;

  const selected = (argv[flagIndex + 1] ?? "").split(",").map((name) => name.trim()).filter(Boolean);
  const unknown = selected.filter((name) => !(name in SEEDERS));
  if (!selected.length || unknown.length) {
    throw new Error(
      `--only приймає перелік через кому з: ${Object.keys(SEEDERS).join(", ")}.` +
        (unknown.length ? ` Невідоме: ${unknown.join(", ")}.` : ""),
    );
  }

  return selected as Array<keyof typeof SEEDERS>;
}

async function main() {
  const dbName = new URL(connectionString).pathname.replace(/^\//, "");
  const selected = readSelectedSeeders(process.argv);
  console.log(
    `🚀 Starting KR6.3 2024 Content Seeding for database "${dbName}" (--target ${target}, ${selected.join(", ")})…\n`,
  );

  const startTime = Date.now();

  for (const name of selected) await SEEDERS[name](prisma);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 All 2024 content seeded successfully in ${durationSec}s!`);
}

main()
  .catch((e) => {
    console.error("FATAL Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

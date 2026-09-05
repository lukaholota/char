/**
 * KR18.5 — ремонт персонажів 2024, створених до появи рівневих рис виду.
 *
 * До цього KR риса виду не мала рівня, тож персонаж отримував усі риси на 1-му і **жодного**
 * заклинання родоводу 3-го й 5-го рівня — його нікому було видати. Підвищення рівня тепер
 * добирає пропущене саме, але персонаж, який уже стоїть на 5-му й нікуди не росте, лишиться
 * без своїх заклинань назавжди. Цей прогін закриває таких.
 *
 * Нічого не забирає: риса, видана зарано, лишається — це дані гравця, і на 5-му рівні вона
 * все одно належить персонажу. Дописуються лише відсутні рядки.
 *
 * І дивиться прогін **лише на рівневі гранти** — риси з `level > 1` і заклинання родоводу 3-го
 * й 5-го рівня. Риси 1-го рівня він не чіпає навмисно: їх могло не бути з причин, до яких цей
 * KR не має стосунку (гравець прибрав рису менеджером рис), і «добір» відновив би те, що
 * людина видалила свідомо.
 *
 *   bun tsx scripts/repair-2024-species-level-grants.ts --target test          # сухий прогін
 *   bun tsx scripts/repair-2024-species-level-grants.ts --target test --apply
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { buildSpeciesPersSpellRows, findMissingSpeciesGrants } from "../src/server/db/species-level-grants";

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
      "Прогін пише в базу, тому ціль треба назвати явно — дефолту немає.\n" +
        "  --target test   → .env.test, клон spells_test\n" +
        "  --target prod   → .env, робоча база spells",
    );
  }

  return name;
}

function resolveConnectionString(target: TargetName): string {
  const { envFile, expectedSuffix } = TARGETS[target];
  const parsed = dotenv.config({ path: envFile, quiet: true });

  if (parsed.error) throw new Error(`Не читається ${envFile}: ${parsed.error.message}`);

  const url = parsed.parsed?.DATABASE_URL;
  if (!url) throw new Error(`У ${envFile} немає DATABASE_URL.`);

  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith(expectedSuffix)) {
    throw new Error(`--target ${target} очікує базу на "${expectedSuffix}", а ${envFile} веде в "${dbName}". Зупинено.`);
  }

  return url;
}

const target = readTargetName(process.argv);
const shouldApply = process.argv.includes("--apply");
const connectionString = resolveConnectionString(target);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const featureSelect = {
  select: { engName: true, name: true, givesSpells: { select: { spellId: true } } },
} as const;

async function loadCharacters2024() {
  return prisma.pers.findMany({
    where: { ruleset: "RULES_2024" },
    select: {
      persId: true,
      name: true,
      level: true,
      ruleset: true,
      features: { select: { featureId: true } },
      persSpells: { select: { spellId: true } },
      race: { select: { traits: { select: { featureId: true, level: true, feature: featureSelect } } } },
      raceChoiceOptions: {
        select: {
          optionName: true,
          spellcastingAbility: true,
          traitFeature: { select: { engName: true, name: true } },
          traits: { select: { feature: featureSelect } },
          spells: { select: { spellId: true, characterLevel: true } },
        },
      },
    },
  });
}

async function main() {
  const dbName = new URL(connectionString).pathname.replace(/^\//, "");
  const mode = shouldApply ? "ЗАПИС" : "сухий прогін";
  console.log(`🔧 KR18.5 — ремонт рівневих грантів виду, база "${dbName}" (${mode})\n`);

  const characters = await loadCharacters2024();
  let repaired = 0;

  for (const pers of characters) {
    const found = findMissingSpeciesGrants({
      ruleset: pers.ruleset,
      characterLevel: pers.level,
      raceTraits: pers.race.traits.filter((trait) => trait.level > 1),
      raceChoiceOptions: pers.raceChoiceOptions,
      ownedFeatureIds: pers.features.map((feature) => feature.featureId),
      ownedSpellIds: pers.persSpells.map((spell) => spell.spellId),
    });
    const leveledSpellIds = new Set(
      pers.raceChoiceOptions.flatMap((option) => option.spells.map((spell) => spell.spellId)),
    );
    const missing = { traits: found.traits, spells: found.spells.filter((spell) => leveledSpellIds.has(spell.spellId)) };

    if (!missing.traits.length && !missing.spells.length) continue;
    repaired += 1;

    const traitNames = missing.traits.map((trait) => trait.feature.engName);
    console.log(`  #${pers.persId} «${pers.name}» рівень ${pers.level}`);
    if (traitNames.length) console.log(`      + риси: ${traitNames.join(", ")}`);
    if (missing.spells.length) console.log(`      + заклинань: ${missing.spells.length}`);

    if (!shouldApply) continue;

    await prisma.$transaction(async (tx) => {
      if (missing.traits.length) {
        await tx.persFeature.createMany({
          data: missing.traits.map((trait) => ({ persId: pers.persId, featureId: trait.featureId })),
          skipDuplicates: true,
        });
      }
      if (missing.spells.length) {
        await tx.persSpell.createMany({
          data: buildSpeciesPersSpellRows(pers.persId, missing.spells, pers.level),
          skipDuplicates: true,
        });
      }
    });
  }

  console.log(`\n${repaired} із ${characters.length} персонажів 2024 потребують добору.`);
  if (!shouldApply && repaired) console.log("Нічого не записано — додайте --apply.");
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

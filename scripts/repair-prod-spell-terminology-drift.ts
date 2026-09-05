import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readSeedTargetName, resolveSeedConnectionString, readDatabaseName } from "./lib/seed-target";

const RULESET = "RULES_2014" as const;
const REPAIR_PATH = "data/2014/corrections/prod-drift-repair-2026-09-02.json";
const APOSTROPHE = "ʼ";

type SpellDescriptionRepair = { engName: string; why: string; from: string; to: string };
type PlannedRepair = { engName: string; spellId: number; to: string; isAlreadyRepaired: boolean };

async function main(): Promise<void> {
  const isApplying = process.argv.includes("--apply");
  const target = readSeedTargetName(process.argv, "bun run repair:spell-terminology-drift");
  const connectionString = resolveSeedConnectionString(target);
  const databaseName = readDatabaseName(connectionString);
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log(`🩹 Латка розбіжності термінології 2014 у базі "${databaseName}"`);
    console.log(isApplying ? "   режим: ЗАПИС (--apply)\n" : "   режим: лише перевірка; запис — з --apply\n");

    const planned = await planRepairs(prisma);
    const pending = planned.filter((repair) => !repair.isAlreadyRepaired);
    for (const repair of planned) {
      console.log(`  ${repair.isAlreadyRepaired ? "·" : "→"} ${repair.engName}`);
    }
    console.log(`\n  уже полагоджено: ${planned.length - pending.length}, до запису: ${pending.length}`);

    if (!isApplying || pending.length === 0) {
      console.log(isApplying ? "\n✅ Лагодити нічого." : "\n✅ Перевірка пройшла. Запуск із --apply запише.");
      return;
    }

    await prisma.$transaction(
      pending.map((repair) =>
        prisma.spell.update({ where: { spellId: repair.spellId }, data: { description: repair.to } })
      )
    );
    console.log(`\n✅ Записано ${pending.length} описів. Далі: bun run seed:spell-terminology:${target}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

function normalizeApostrophes(text: string): string {
  return text.replace(/['’‘`´]/gu, APOSTROPHE);
}

function readRepairs(): SpellDescriptionRepair[] {
  const raw = readFileSync(join(process.cwd(), REPAIR_PATH), "utf-8");
  const parsed = JSON.parse(raw) as { repairs?: unknown };
  if (!Array.isArray(parsed.repairs)) throw new Error(`${REPAIR_PATH}: очікували масив repairs`);
  return parsed.repairs as SpellDescriptionRepair[];
}

/// Латка звіряє ПОВНИЙ опис, а не фрагмент: вона знімалася з живої бази 2026-09-02, і будь-яка
/// правка описів після того знімка робить її недійсною. Розбіжність тут — привід переміряти,
/// а не дописати ще одну пару.
async function planRepairs(prisma: PrismaClient): Promise<PlannedRepair[]> {
  const planned: PlannedRepair[] = [];
  const failures: string[] = [];

  for (const repair of readRepairs()) {
    const spell = await prisma.spell.findUnique({
      where: { engName_ruleset: { engName: repair.engName, ruleset: RULESET } },
      select: { spellId: true, description: true },
    });
    if (!spell) {
      failures.push(`Заклинання «${repair.engName}» немає в каталозі ${RULESET}`);
      continue;
    }

    const live = normalizeApostrophes(spell.description);
    const to = normalizeApostrophes(repair.to);
    if (live === to) {
      planned.push({ engName: repair.engName, spellId: spell.spellId, to, isAlreadyRepaired: true });
      continue;
    }
    if (live !== normalizeApostrophes(repair.from)) {
      failures.push(`${repair.engName}: опис у базі не збігається ні зі знімком 2026-09-02, ні з цільовим текстом`);
      continue;
    }
    planned.push({ engName: repair.engName, spellId: spell.spellId, to, isAlreadyRepaired: false });
  }

  if (failures.length > 0) {
    throw new Error(
      `Латка не лягає на цю базу — ${failures.length} записів. Не записано нічого.\n` + failures.join("\n")
    );
  }
  return planned;
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});

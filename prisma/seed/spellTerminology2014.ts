import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RULESET = "RULES_2014" as const;
const TERMINOLOGY_PATHS = [
  "data/2014/corrections/spell-terminology-batch01.json",
  "data/2014/corrections/spell-terminology-batch02.json",
  "data/2014/corrections/spell-terminology-batch03.json",
  "data/2014/corrections/spell-terminology-batch04.json",
  "data/2014/corrections/spell-terminology-batch05.json",
  "data/2014/corrections/spell-terminology-batch06.json",
  "data/2014/corrections/spell-terminology-batch07.json",
  "data/2014/corrections/spell-terminology-batch08.json",
  "data/2014/corrections/spell-terminology-batch09.json",
  "data/2014/corrections/spell-terminology-batch10.json",
  "data/2014/corrections/spell-terminology-batch11.json",
  "data/2014/corrections/spell-terminology-batch12.json",
  "data/2014/corrections/spell-terminology-batch13.json",
  "data/2014/corrections/spell-terminology-batch14.json",
  "data/2014/corrections/spell-terminology-batch15.json",
  "data/2014/corrections/spell-terminology-batch16.json",
  "data/2014/corrections/spell-terminology-batch17.json",
  "data/2014/corrections/spell-terminology-batch18.json",
  "data/2014/corrections/spell-terminology-batch19.json",
];

/// Рішення власника 2026-08-30: український апостроф — ʼ (U+02BC), «соловʼїна».
/// Каталог тримав дві інші форми, тому кожен опис, якого торкається партія, зводиться до
/// канонічної; шаблони пар теж, інакше вони перестали б збігатися після першого прогону.
const APOSTROPHE = "ʼ";

function normalizeApostrophes(text: string): string {
  return text.replace(/['’‘`´]/gu, APOSTROPHE);
}

export type SpellTerminologyCorrection = {
  engName: string;
  why: string;
  replaceInDescription: [string, string][];
};

export function readSpellTerminology2014(): SpellTerminologyCorrection[] {
  return TERMINOLOGY_PATHS.flatMap(readTerminologyBatch);
}

function readTerminologyBatch(path: string): SpellTerminologyCorrection[] {
  const raw = readFileSync(join(process.cwd(), path), "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || !("corrections" in parsed)) {
    throw new Error(`${path}: очікували обʼєкт із ключем corrections`);
  }

  const corrections = (parsed as { corrections: unknown }).corrections;
  if (!Array.isArray(corrections)) {
    throw new Error(`${path}: corrections має бути масивом`);
  }
  return corrections as SpellTerminologyCorrection[];
}

export function applySpellTerminologyDescription(
  engName: string,
  description: string,
  replacements: [string, string][]
): string {
  return replacements.reduce((current, [from, to]) => {
    const wanted = normalizeApostrophes(from);
    const replacement = normalizeApostrophes(to);
    if (current.includes(wanted)) return current.split(wanted).join(replacement);
    if (current.includes(replacement)) return current;
    throw new Error(`${engName}: в описі немає ні «${from}», ні «${to}»`);
  }, normalizeApostrophes(description));
}

type PlannedDescription = {
  engName: string;
  spellId: number;
  description: string;
  isChanged: boolean;
};

/// Сідер спершу зводить усі описи в памʼяті й лише потім пише. Партії 1–2 поїхали в робочу
/// базу ще до того, як пізніші партії переписали `to` дванадцяти пар, і прогін 2026-09-02
/// впав на сьомому записі — але шість попередніх уже лежали в базі. Позаписовий запис робить
/// із будь-якої розбіжності напівзастосований каталог, тому його тут більше немає.
/// Прісмові дефолтні 5 секунд розраховані на локальну базу. Прогін у прод 2026-09-02 упав
/// на `P2028` через 5180 мс: там 370 описів, і кожен — окремий круг до сервера через
/// SSH-тунель. Атомарність при цьому не обговорюється (див. коментар вище), тому транзакція
/// стає інтерактивною з явним лімітом, а не розпадається на окремі записи.
const TRANSACTION_TIMEOUT_MS = 300_000;
const TRANSACTION_MAX_WAIT_MS = 30_000;

export async function seedSpellTerminology2014(prisma: PrismaClient): Promise<string[]> {
  const planned = await planSpellTerminology2014(prisma);
  const changed = planned.filter((plan) => plan.isChanged);

  if (changed.length > 0) {
    await prisma.$transaction(
      async (tx) => {
        for (const plan of changed) {
          await tx.spell.update({ where: { spellId: plan.spellId }, data: { description: plan.description } });
        }
      },
      { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_MAX_WAIT_MS }
    );
  }

  return planned.map((plan) => plan.engName);
}

async function planSpellTerminology2014(prisma: PrismaClient): Promise<PlannedDescription[]> {
  const planned: PlannedDescription[] = [];
  const failures: string[] = [];

  for (const correction of readSpellTerminology2014()) {
    const spell = await prisma.spell.findUnique({
      where: { engName_ruleset: { engName: correction.engName, ruleset: RULESET } },
      select: { spellId: true, description: true },
    });
    if (!spell) {
      failures.push(`Заклинання «${correction.engName}» немає в каталозі ${RULESET}`);
      continue;
    }

    try {
      const description = applySpellTerminologyDescription(
        correction.engName,
        spell.description,
        correction.replaceInDescription
      );
      planned.push({
        engName: correction.engName,
        spellId: spell.spellId,
        description,
        isChanged: description !== spell.description,
      });
    } catch (error) {
      failures.push((error as Error).message);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Термінологія 2014: ${failures.length} корекцій не лягають на цю базу. Не записано нічого.\n` +
        failures.join("\n")
    );
  }
  return planned;
}

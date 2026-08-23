/// Прогін звірки прози (KR17.1) по всьому каталогу 2024: `npx tsx scripts/5etools/compare-spell-prose.ts`.
/// Пише поіменний звіт; законні розбіжності живуть у `KNOWN_TEXT_GAPS_2024` тесту, а не тут.

import { writeFileSync } from "fs";
import { join } from "path";
import { readFileSync } from "fs";
import { MIRROR_REVISION } from "./mirror";
import { findLooseNameKey, readSpells, SourceSpell } from "./schema";
import {
  collectSourceProseFacts,
  collectUkrainianProseFacts,
  compareProseFacts,
  ProseFactMismatch,
  UNRATIFIED_SOURCE_TERMS,
} from "./prose-facts";

type CatalogRow = { engName: string; name: string; description: string };

type Divergence = { engName: string; nameUkr: string; mismatches: ProseFactMismatch[] };

const CATALOG_PATH = "data/2024/normalized/spells.json";

function compareSpellProse(): void {
  const catalog = readCatalog();
  const bySource = indexSourceSpells(readSpells());

  const divergences: Divergence[] = [];
  const unmatched: string[] = [];

  for (const row of catalog) {
    const counterpart = bySource.get(findLooseNameKey(row.engName));
    if (!counterpart) {
      unmatched.push(row.engName);
      continue;
    }

    const mismatches = compareProseFacts(
      collectUkrainianProseFacts(row.description, row.engName),
      collectSourceProseFacts(counterpart, row.engName)
    );

    if (mismatches.length > 0) {
      divergences.push({ engName: row.engName, nameUkr: row.name, mismatches });
    }
  }

  writeReport(catalog.length, divergences, unmatched);
}

function readCatalog(): CatalogRow[] {
  return JSON.parse(readFileSync(join(process.cwd(), CATALOG_PATH), "utf-8")) as CatalogRow[];
}

function indexSourceSpells(spells: SourceSpell[]): Map<string, SourceSpell> {
  const index = new Map<string, SourceSpell>();
  for (const spell of spells) {
    if (spell.edition !== "RULES_2024") continue;
    const key = findLooseNameKey(spell.nameEng);
    if (!index.has(key)) index.set(key, spell);
  }
  return index;
}

function writeReport(total: number, divergences: Divergence[], unmatched: string[]): void {
  const path =
    readFlag("out") ?? join(process.cwd(), "data", "5etools", "divergence-prose-2024.md");

  const sections = [
    describeHeader(total, divergences, unmatched),
    describeKindCounts(divergences),
    describeUnratifiedTerms(),
    describeDiverging(divergences),
    describeUnmatched(unmatched),
  ];

  writeFileSync(path, `${sections.filter((part) => part !== "").join("\n\n")}\n`, "utf-8");
  console.log(
    `✅ проза 2024: звірено ${total - unmatched.length}, розійшлося ${divergences.length} → ${path}`
  );
}

function describeHeader(total: number, divergences: Divergence[], unmatched: string[]): string {
  const facts = divergences.reduce((sum, row) => sum + row.mismatches.length, 0);

  return [
    "# Розбіжності прози 2024 проти XPHB",
    "",
    "Згенеровано `npx tsx scripts/5etools/compare-spell-prose.ts`.",
    `Джерело — пінута ревізія \`${MIRROR_REVISION}\`. Каталог — \`${CATALOG_PATH}\`.`,
    "",
    "Звіряються ознаки, що переживають переклад: числа з одиницями, кубики, стани, типи дій,",
    "характеристика ряткидка, типи шкоди. Це **не** доводить, що переклад правильний — лише",
    "що в тексті ті самі величини, що в оригіналі, і немає зайвих.",
    "",
    `- У каталозі: **${total}**`,
    `- Звірено: **${total - unmatched.length}**`,
    `- Розійшлося щонайменше в одній ознаці: **${divergences.length}**`,
    `- Розбіжних ознак усього: **${facts}**`,
    `- Без відповідника в XPHB: **${unmatched.length}**`,
  ].join("\n");
}

function describeKindCounts(divergences: Divergence[]): string {
  const counts = new Map<string, number>();
  for (const row of divergences) {
    for (const mismatch of row.mismatches) {
      const key = `\`${mismatch.kind}\` — ${mismatch.side}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [
    "## За ознаками",
    "",
    "| Ознака | Розбіжностей |",
    "|---|---:|",
    ...[...counts.entries()].sort(([, a], [, b]) => b - a).map(([key, n]) => `| ${key} | ${n} |`),
  ].join("\n");
}

function describeUnratifiedTerms(): string {
  const entries = Object.entries(UNRATIFIED_SOURCE_TERMS);
  if (entries.length === 0) return "";

  return [
    "## Терміни XPHB, яких словник ще не називає",
    "",
    "Їхні ознаки не звіряються з жодного боку — інакше вони давали б розбіжність, якої",
    "перекладач не може закрити, не вигадавши термін.",
    "",
    "| Термін | Чому |",
    "|---|---|",
    ...entries.map(([term, reason]) => `| \`${term}\` | ${reason} |`),
  ].join("\n");
}

function describeDiverging(divergences: Divergence[]): string {
  return [
    "## Поіменно",
    "",
    "| Заклинання | Ознака | Значення | Бік |",
    "|---|---|---|---|",
    ...divergences.flatMap((row) =>
      row.mismatches.map(
        (mismatch, position) =>
          `| ${position === 0 ? `\`${row.engName}\`` : ""} | \`${mismatch.kind}\` | ` +
          `${mismatch.value} | ${mismatch.side} |`
      )
    ),
  ].join("\n");
}

function describeUnmatched(unmatched: string[]): string {
  if (unmatched.length === 0) return "**Без відповідника в XPHB:** жодного.";

  return [
    "## Без відповідника в XPHB",
    "",
    ...unmatched.map((engName) => `- \`${engName}\``),
  ].join("\n");
}

function readFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

try {
  compareSpellProse();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

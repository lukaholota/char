/**
 * Діф на перегляд: що саме доведеться переписати, щоб `radiant` став «променевим».
 *
 *   bunx tsx scripts/terms/build-radiant-diff.ts
 *
 * Нічого не змінює. Друкує кожне входження цілим реченням, бо партія читає й переписує
 * речення, а не токен — заміна рядком тут заборонена (рішення власника 2026-08-28,
 * docs/o17-spells-canon/kr17.5-terms-sweep.md).
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRadiantOccurrences, type RadiantOccurrence } from "./radiant-occurrences";

const OUTPUT_PATH = join(process.cwd(), "docs/o17-spells-canon/kr17.5-radiant-diff.md");

function main(): void {
  const occurrences = findRadiantOccurrences();
  writeFileSync(OUTPUT_PATH, buildReport(occurrences), "utf-8");

  const records = new Set(occurrences.map((o) => `${o.carrier}::${o.record}`)).size;
  console.log(
    `✅ ${occurrences.length} входжень у ${records} записах → ${OUTPUT_PATH}\n` +
      `   із них у механічних полях статблока: ${occurrences.filter((o) => o.isStatblockField).length}`
  );
}

function buildReport(occurrences: RadiantOccurrence[]): string {
  const lines = [
    "# KR17.5 — діф `radiant`, згенерований",
    "",
    "Похідний файл: `bunx tsx scripts/terms/build-radiant-diff.ts`. Руками не правити.",
    "Кожен рядок — **речення**, яке партія читає й переписує цілком.",
    "",
    ...buildSummary(occurrences),
  ];

  for (const [carrier, group] of groupBy(occurrences, (o) => o.carrier)) {
    lines.push("", `## ${carrier}`, "");
    for (const [record, rows] of groupBy(group, (o) => o.record)) {
      lines.push(`### ${record}`, "");
      for (const row of rows) {
        const marker = row.isStatblockField ? " · **механічне поле**" : "";
        lines.push(`- \`${row.field}\`${marker} — «${row.form}»`, `  > ${row.sentence}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildSummary(occurrences: RadiantOccurrence[]): string[] {
  const rows = [...groupBy(occurrences, (o) => o.carrier)].map(
    ([carrier, group]) =>
      `| \`${carrier}\` | ${new Set(group.map((o) => o.record)).size} | ${group.length} |`
  );
  return [
    "| Носій | Записів | Входжень |",
    "|---|---:|---:|",
    ...rows,
    `| **разом** | | **${occurrences.length}** |`,
  ];
}

function groupBy<T>(items: T[], readKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = readKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return grouped;
}

main();

/**
 * Читає .vitest/file-durations.json від tests/reporters/file-durations.ts і тримає стандарт
 * швидкості інтеграційних тестів (Р45): друкує найповільніші файли після кожного прогону й
 * червоніє, коли файл переступив планку.
 * Планка навмисно втричі вища за найдовший файл після шардування — ловить лише
 * «один файл будує пʼятнадцять персонажів», а не машину під навантаженням.
 *
 *   bun tsx scripts/check-test-file-durations.ts .vitest/file-durations.json
 *   TEST_FILE_LIMIT_SECONDS=60 bun tsx scripts/check-test-file-durations.ts <звіт>
 */
import { readFileSync } from "node:fs";

type FileDuration = { file: string; seconds: number };

const SHOWN_FILES = 5;

const reportPath = process.argv[2];
if (!reportPath) {
  console.error("вкажи шлях до JSON-звіту vitest");
  process.exit(2);
}

const limitSeconds = Number(process.env.TEST_FILE_LIMIT_SECONDS ?? 90);
const durations = readFileDurations(reportPath);
printSlowest(durations);
failOnOverLimit(durations, limitSeconds);

function readFileDurations(path: string): FileDuration[] {
  const rows = JSON.parse(readFileSync(path, "utf8")) as FileDuration[];
  return [...rows].sort((left, right) => right.seconds - left.seconds);
}

function printSlowest(durations: FileDuration[]): void {
  console.log(`\nНайповільніші файли (${durations.length} усього):`);
  for (const { file, seconds } of durations.slice(0, SHOWN_FILES)) {
    console.log(`  ${seconds.toFixed(1).padStart(6)} с  ${file}`);
  }
}

function failOnOverLimit(durations: FileDuration[], limit: number): void {
  const over = durations.filter(({ seconds }) => seconds > limit);
  if (over.length === 0) return;
  console.error(`\n✖ ${over.length} файл(ів) довше за ${limit} с — розріж по фікстурах, як tests/rules-2024/multiclass-fifteen.shard-*.test.ts:`);
  for (const { file, seconds } of over) console.error(`  ${seconds.toFixed(1)} с  ${file}`);
  process.exit(1);
}

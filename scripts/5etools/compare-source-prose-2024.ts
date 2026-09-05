import { writeFileSync } from "fs";
import { join } from "path";

import { MIRROR_REVISION } from "./mirror";
import { buildSourceProseAudit, SourceProseAudit } from "./source-prose-audit";

const DEFAULT_REPORT_PATH = join(
  process.cwd(),
  "data",
  "5etools",
  "source-prose-audit-2024.md"
);

function compareSourceProse2024(): void {
  const audit = buildSourceProseAudit();
  const reportPath = readFlag("out") ?? DEFAULT_REPORT_PATH;
  writeFileSync(reportPath, renderReport(audit), "utf-8");
  console.log(
    `✅ source prose 2024: ${audit.total} total; ${audit.withCounterpart2014} з відповідником; ` +
      `${audit.differsFrom2014} відмінних; ${audit.newIn2024} нових; ` +
      `${audit.sourceIdentical} тотожних; ${audit.manualQueue} у ручній черзі → ${reportPath}`
  );
}

function renderReport(audit: SourceProseAudit): string {
  return [
    "# Повний source-to-source аудит прози XPHB",
    "",
    "Згенеровано `bun run compare:source-prose:2024`.",
    `Джерело — пінута ревізія \`${MIRROR_REVISION}\`. Universe — лише ` +
      "`data/5etools/raw/spells/spells-xphb.json`.",
    "Порівняно повні `entries` + `entriesHigherLevel` після зняття технічної 5etools-розмітки",
    "та нормалізації пробілів, апострофів і регістру. Порогів і score немає.",
    "",
    `- Усього XPHB: **${audit.total}**`,
    `- З відповідником 2014: **${audit.withCounterpart2014}**`,
    `- Відмінна проза: **${audit.differsFrom2014}**`,
    `- Нове / без відповідника: **${audit.newIn2024}**`,
    `- Source-identical: **${audit.sourceIdentical}**`,
    `- Ручна черга: **${audit.manualQueue}**`,
    "",
    "## Поіменно",
    "",
    "| Заклинання | Classification | SHA-256 2014 | SHA-256 XPHB |",
    "|---|---|---|---|",
    ...audit.rows.map(
      (row) =>
        `| \`${row.engName}\` | \`${row.classification}\` | ` +
        `${row.source2014Hash ? `\`${row.source2014Hash}\`` : "— немає відповідника —"} | ` +
        `\`${row.source2024Hash}\` |`
    ),
    "",
  ].join("\n");
}

function readFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

try {
  compareSourceProse2024();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

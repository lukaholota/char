import {
  collectSpellRegistry,
  linkCarrier,
  listCarriers,
  writeAmbiguousNamesFile,
  type CarrierReport,
} from "./spell-links/spell-mentions";

/// Проставляч посилань на заклинання по маркеру `[EngName]` у джерелах контенту (KR25.3).
///
///   bunx tsx scripts/link-spell-mentions.ts                      — звіт по всіх джерелах, без запису
///   bunx tsx scripts/link-spell-mentions.ts data/2024/rules-uk   — лише джерела під цим шляхом
///   bunx tsx scripts/link-spell-mentions.ts --write <шлях>       — записати
///   bunx tsx scripts/link-spell-mentions.ts --ambiguous          — переписати data/spell-links/ambiguous-names.json
///   bunx tsx scripts/link-spell-mentions.ts --ambiguous-too <шлях> — загортати й неоднозначні назви
///
/// `--ambiguous-too` — рішення власника П5: у контенті неоднозначна назва майже завжди означає
/// саме заклинання. Прапорець свідомий, бо ставити його можна лише після перегляду згадок очима;
/// переглянуті винятки лежать у data/spell-links/not-a-spell.json і він їх не чіпає.
///
/// Другий прогін нічого не міняє: загорнута згадка більше не рахується незвʼязаною.

const args = process.argv.slice(2);
const write = args.includes("--write");
const linkAmbiguous = args.includes("--ambiguous-too");
const filters = args.filter((arg) => !arg.startsWith("--"));
const registry = collectSpellRegistry();

if (args.includes("--ambiguous")) {
  writeAmbiguousNamesFile(registry);
  console.log(`неоднозначних назв записано: ${registry.ambiguous.size}`);
}

const carriers = listCarriers().filter((carrier) => filters.length === 0 || filters.some((prefix) => carrier.path.startsWith(prefix)));
const reports = carriers.map((carrier) => linkCarrier(carrier, registry, process.cwd(), write, linkAmbiguous));

function describe(report: CarrierReport): string {
  const state = report.unwritable ? `⛔ ${report.unwritable}` : report.written ? "✍︎ записано" : write ? "без змін" : "";
  return `${report.path.padEnd(58)} згадок ${String(report.mentions).padStart(4)}  було ${String(report.linked).padStart(4)}  загорнуто ${String(report.wrapped).padStart(4)}  неоднозначних ${String(report.ambiguous).padStart(3)}  у відмінку ${String(report.inflected.length).padStart(3)}  ${state}`;
}

for (const report of reports.filter((r) => r.mentions > 0)) console.log(describe(report));

const inflected = reports.flatMap((r) => r.inflected.map((i) => `${r.path}: …${i.before.replace(/\s+/g, " ")} [${i.engName}]`));
if (inflected.length) console.log(`\nНе загорнуто — назва перед маркером не збігається з каталогом (${inflected.length}):\n` + inflected.join("\n"));

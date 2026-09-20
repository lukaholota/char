import {
  linkRuleTermCarrier,
  readRuleTermExceptions,
  readTermForms,
  RULE_TERM_CARRIERS,
} from "./rule-term-links/rule-term-mentions";

/// Проставляч посилань на стани й дії в описах (KR34.3).
///
///   bunx tsx scripts/link-rule-term-mentions.ts                    — звіт по всіх носіях, без запису
///   bunx tsx scripts/link-rule-term-mentions.ts <шлях>             — лише носії під цим шляхом
///   bunx tsx scripts/link-rule-term-mentions.ts --list <шлях>      — кожне посилання з контекстом, для перегляду
///   bunx tsx scripts/link-rule-term-mentions.ts --write <шлях>     — записати
///
/// Другий прогін нічого не міняє: термін, уже звʼязаний в описі, вдруге не загортається.

const args = process.argv.slice(2);
const write = args.includes("--write");
const list = args.includes("--list");
const filters = args.filter((arg) => !arg.startsWith("--"));
const forms = readTermForms();
const exceptions = readRuleTermExceptions();

const carriers = RULE_TERM_CARRIERS.filter((carrier) => filters.length === 0 || filters.some((prefix) => carrier.path.startsWith(prefix)));

for (const carrier of carriers) {
  const report = linkRuleTermCarrier(carrier, forms, exceptions, process.cwd(), write);
  const state = report.unwritable ? `⛔ ${report.unwritable}` : report.written ? "✍︎ записано" : "";
  console.log(`${report.path.padEnd(48)} посилань ${String(report.wrapped.length).padStart(5)}  ${state}`);

  if (list) {
    for (const mention of report.wrapped) console.log(`    ${mention.original.padEnd(20)} «${mention.label}»  …${mention.context}…`);
  }
}

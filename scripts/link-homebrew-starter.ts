/**
 * Посилання на стани, дії та заклинання у стартових записах хоумбрю.
 * Носії — не каталожні, тож ідуть повз RULE_TERM_CARRIERS; редакцію бере сам запис.
 *
 *   bunx tsx scripts/link-homebrew-starter.ts            — показ
 *   bunx tsx scripts/link-homebrew-starter.ts --write    — запис
 */

import { readFileSync, writeFileSync } from "node:fs";
import { linkRuleTermsInText, readRuleTermExceptions, readTermForms } from "./rule-term-links/rule-term-mentions";
import { collectSpellRegistry, linkMentionsInText, type Edition } from "./spell-links/spell-mentions";

const FILES = [
  "data/homebrew-starter/creatures.json",
  "data/homebrew-starter/spells.json",
  "data/homebrew-starter/spells-2024.json",
  "data/homebrew-starter/creatures-2024.json",
];
const PROSE_FIELDS = ["description", "specialAbilities", "actions", "bonusActions", "reactions", "legendaryActions"] as const;

const isWriting = process.argv.includes("--write");
const forms = readTermForms();
const exceptions = readRuleTermExceptions();
const registry = collectSpellRegistry();

for (const file of FILES) linkFile(file);

function linkFile(file: string) {
  const entries = JSON.parse(readFileSync(file, "utf-8")) as Array<Record<string, unknown>>;
  const keepAsText = Object.keys(exceptions[file] ?? {});
  let wrapped = 0;

  for (const entry of entries) {
    const edition = readEdition(entry);
    const linkedInEntry = new Set<string>();
    for (const field of PROSE_FIELDS) {
      const text = entry[field];
      if (typeof text !== "string" || text === "") continue;
      const linked = linkOneText(text, edition, linkedInEntry, keepAsText);
      wrapped += linked.wrapped;
      entry[field] = linked.text;
    }
  }

  console.log(`${wrapped === 0 ? "  ·  без змін" : `  +  ${wrapped} посилань`}  ${file}`);
  if (isWriting && wrapped > 0) writeFileSync(file, `${JSON.stringify(entries, null, 1)}\n`, "utf-8");
}

function linkOneText(text: string, edition: Edition, linkedInEntry: Set<string>, keepAsText: string[]) {
  const ruleTerms = linkRuleTermsInText(text, edition, forms, { linkedElsewhere: linkedInEntry, keepAsText });
  for (const mention of ruleTerms.wrapped) linkedInEntry.add(mention.original);
  const spells = linkMentionsInText(ruleTerms.text, registry, { edition, linkAmbiguous: true });
  return { text: spells.text, wrapped: ruleTerms.wrapped.length + spells.report.wrapped };
}

function readEdition(entry: Record<string, unknown>): Edition {
  const ruleset = entry.ruleset;
  if (ruleset !== "RULES_2014" && ruleset !== "RULES_2024") throw new Error(`Запис «${String(entry.name)}» без редакції`);
  return ruleset;
}

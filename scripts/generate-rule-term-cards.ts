/**
 * Build src/lib/generated/rule-term-cards.json — term cards for the states and actions listed in
 * src/lib/refs/rule-term-links.json (KR34.2). Reads only generated rules catalogs and refs, no DB.
 * Run: npx tsx scripts/generate-rule-term-cards.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";

import { buildRuleTermCards } from "../src/lib/term-card";
import { collectTermSources } from "../src/lib/term-sources";

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/rule-term-cards.json");

const cards = buildRuleTermCards(collectTermSources());
writeFileSync(OUTPUT_PATH, `${JSON.stringify(cards, null, 2)}\n`);
console.log(`rule-term-cards.json: ${Object.keys(cards.RULES_2014).length} terms × 2 editions`);

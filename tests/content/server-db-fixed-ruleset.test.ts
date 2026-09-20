import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SERVER_DB_DIR = path.join(process.cwd(), "src/server/db");
const FIXED_RULESET_CONSTANT = /^const\s+(\w+)\s*:\s*Ruleset\s*=\s*["']RULES_20\d\d["']/m;

const KNOWN_FIXED_RULESET_CONSTANTS = [
  "creation-content.ts · ACTIVE_RULESET — лише запасне значення після data.ruleset і class.ruleset",
  "legacy-levelup-actions.ts · ACTIVE_RULESET — мертвий другий майстер підвищення (L08-levelup-machine-12)",
  "levelup-content.ts · DEFAULT_RULESET — лише запасне значення, коли персонажа не знайдено",
  "progression-content.ts · ACTIVE_RULESET — мертвий другий майстер підвищення (L08-levelup-machine-12)",
];

function collectFixedRulesetConstants(): string[] {
  return fs
    .readdirSync(SERVER_DB_DIR)
    .filter((file) => file.endsWith(".ts"))
    .sort()
    .flatMap((file) => {
      const match = fs.readFileSync(path.join(SERVER_DB_DIR, file), "utf-8").match(FIXED_RULESET_CONSTANT);
      return match ? [`${file} · ${match[1]}`] : [];
    });
}

describe("KR31.8 — src/server/db не фіксує редакцію константою на весь файл", () => {
  it("нова константа редакції не зʼявляється без запису причини", () => {
    const known = KNOWN_FIXED_RULESET_CONSTANTS.map((entry) => entry.split(" — ")[0]);

    expect(collectFixedRulesetConstants()).toEqual(known);
  });
});

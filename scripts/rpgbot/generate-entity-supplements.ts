import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

const sourceSchema = z.object({ file: z.string().min(1), book: z.enum(["VGM", "ERLW", "WDMM", "EGW", "VRGR", "MM", "DMG", "BMT", "IDRotF", "WBtW"]), page: z.number().int().positive() }).strict();
const creatureSchema = z.object({
  name: z.string().min(1), nameEng: z.string().min(1), source: z.string().min(1),
  size: z.string().min(1), type: z.string().min(1), ac: z.string().min(1), hp: z.string().min(1),
  strength: z.string().min(1), dexterity: z.string().min(1), constitution: z.string().min(1),
  intelligence: z.string().min(1), wisdom: z.string().min(1), charisma: z.string().min(1),
  challenge: z.string(), actions: z.string(), walkSpeed: z.number().nonnegative(),
}).passthrough();
const weaponSchema = z.object({
  name: z.string().min(1), nameUa: z.string().min(1), engName: z.string().min(1), source: z.string().min(1),
  damage: z.string().min(1), damageType: z.string().min(1), weaponType: z.string().min(1),
  properties: z.array(z.string()), description: z.string().min(1),
}).passthrough();
const supplements = z.object({
  ruleset: z.literal("RULES_2014"),
  creatures: z.array(z.object({ source: sourceSchema, entry: creatureSchema }).strict()),
  weapons: z.array(z.object({ source: sourceSchema, entry: weaponSchema }).strict()),
}).strict().parse(JSON.parse(await readFile("data/2014/optimization-entity-supplements.json", "utf8")));

await writeFile("src/lib/generated/optimization-entity-supplements-2014.json", `${JSON.stringify({
  creatures: supplements.creatures.map(({ entry }) => entry), weapons: supplements.weapons.map(({ entry }) => entry),
}, null, 2)}\n`);
console.log(`Saved ${supplements.creatures.length} creatures and ${supplements.weapons.length} weapons; no database access.`);

import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { sourceTranslations } from "../../src/lib/refs/translation";
import { collectSpellRegistry, linkMentionsInText } from "../spell-links/spell-mentions";
import { readClassFeatureSeedInputs } from "../../prisma/seed/classFeatureSeed";
import { readSubclassFeatureSeedInputs } from "../../prisma/seed/subclassFeatureSeed";
import { readRaceFeatureSeedInputs } from "../../prisma/seed/raceFeatureSeed";

const reviewedSchema = z.object({
  name: z.string().min(1), engName: z.string().min(1), description: z.string().min(1),
  catalog: z.enum(["classes", "races", "feats", "magic-items", "equipment"]), kind: z.enum(["feature", "feat", "magic-item", "equipment"]),
  details: z.array(z.object({ label: z.string(), value: z.string() }).strict()),
  source: z.object({ file: z.string().min(1), book: z.enum(["TCE", "BMT", "VGM", "MTF", "VRGR", "ERLW", "SCAG", "EGW", "DMG", "BGG", "DSotDQ", "PHB", "FTD", "SatO", "EEPC", "MPMM"]), page: z.number().int().positive() }).strict(),
}).strict();
const sourceKeys = { TCE: "TCOE", BMT: "BOMT", VGM: "VGTM", MTF: "MTOF", VRGR: "VRGTR", ERLW: "EBERRON", SCAG: "SCAG", EGW: "EGTW", DMG: "DMG", BGG: "BPGOTG", DSotDQ: "DRAGONLANCE", PHB: "PHB", FTD: "FTOD", SatO: "SatO", MPMM: "MPMM" } as const;
const reviewed = z.array(reviewedSchema).parse(JSON.parse(await readFile("data/rpgbot/feature-descriptions-2014.json", "utf8")));
const spells = collectSpellRegistry();
const descriptions = [...[...readClassFeatureSeedInputs(), ...readSubclassFeatureSeedInputs()].map((feature) => ({ ...feature, catalog: "classes" })),
  ...readRaceFeatureSeedInputs().map((feature) => ({ ...feature, catalog: "races" }))]
  .map(({ name, engName, description, catalog }) => ({ name, engName, description, catalog }))
  .filter((feature) => feature.description);
const entries = [...descriptions, ...reviewed.map(({ source, ...entry }) => ({ ...entry,
  description: linkMentionsInText(entry.description, spells, { edition: "RULES_2014", linkAmbiguous: true }).text,
  details: [...entry.details, { label: "Джерело", value: `${source.book === "EEPC" ? "Elemental Evil Player's Companion" : sourceTranslations[sourceKeys[source.book]]}, с. ${source.page}` }] }))];

await writeFile("src/lib/generated/optimization-feature-descriptions-2014.json", `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Saved ${descriptions.length} existing and ${reviewed.length} reviewed Ukrainian descriptions; no database access.`);

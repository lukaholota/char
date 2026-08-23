import { writeFileSync } from "fs";
import { join } from "path";
import { allMonsters2014 } from "./data/monsters-2014-data";
import { buildImportedCreatures2014 } from "./aidedd/import-creatures-2014";

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/creatures.json");

const imported = buildImportedCreatures2014();
const importedIds = new Set(imported.map((creature) => creature.creatureId));

/// A legacy entry whose id appears in `imported` is one KR12.3 has reconciled against aidedd — the
/// stale hand-written statblock is dropped in favour of the freshly imported one at the same id.
const keptLegacy = allMonsters2014.filter((creature) => !importedIds.has(creature.creatureId));
const monsters2014List = [...keptLegacy, ...imported];

writeFileSync(OUTPUT_PATH, JSON.stringify(monsters2014List, null, 2), "utf-8");
console.log(
  `✅ ${monsters2014List.length} істот 2014 у ${OUTPUT_PATH} (${keptLegacy.length} успадкованих + ${imported.length} з aidedd)`
);

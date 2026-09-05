import { writeFileSync } from "fs";
import { join } from "path";
import { allMonsters2014 } from "./data/monsters-2014-data";
import { buildImportedCreatures2014 } from "./aidedd/import-creatures-2014";
import { buildImportedCreaturesFrom5etools } from "./5etools/creature-batches";
import { stampCreatureImages } from "./aidedd/creature-images";
import { failOnShrunkCatalog } from "./lib/fail-on-shrunk-catalog";
import { stampCreatureSpeeds } from "./lib/stamp-creature-speeds";

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/creatures.json");

/// Виміряно 2026-08-28 після KR16.3, перевиміряно 2026-09-02 після партії 20 (15 прадраконів).
/// Каталог у `.gitignore` і з git не відновлюється, а сюди колись писав ще й генератор із бази,
/// у якій 7 рядків проти 974 у каталозі (STATE.md, дефект №5).
const MINIMUM_EXPECTED_CREATURES_2014 = 974;

/// Два джерела імпорту, не одне: aidedd закрив те, що публікує, а 5etools — те, чого він не
/// публікує (KR16.3). Порядок має значення лише для успадкованих записів, які будь-який з
/// імпортів заміщає за тим самим `creatureId`.
const imported = [...buildImportedCreatures2014(), ...buildImportedCreaturesFrom5etools("RULES_2014")];
const importedIds = new Set(imported.map((creature) => creature.creatureId));

/// A legacy entry whose id appears in `imported` is one KR12.3 has reconciled against aidedd — the
/// stale hand-written statblock is dropped in favour of the freshly imported one at the same id.
const keptLegacy = allMonsters2014.filter((creature) => !importedIds.has(creature.creatureId));
const monsters2014List = stampCreatureSpeeds(stampCreatureImages([...keptLegacy, ...imported], "RULES_2014"));

failOnShrunkCatalog("істоти 2014", monsters2014List.length, MINIMUM_EXPECTED_CREATURES_2014);

writeFileSync(OUTPUT_PATH, JSON.stringify(monsters2014List, null, 2), "utf-8");
console.log(
  `✅ ${monsters2014List.length} істот 2014 у ${OUTPUT_PATH} (${keptLegacy.length} успадкованих + ${imported.length} імпортованих, ` +
    `${monsters2014List.filter((creature) => creature.imageUrl).length} із картинкою)`
);

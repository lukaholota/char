import { writeFileSync } from "fs";
import { join } from "path";
import { buildBastionFacilities, ParsedBastionFacility } from "./bastion-facilities";
import { MIRROR_REVISION } from "./mirror";

const OUTPUT_PATH = join(process.cwd(), "data/2024/normalized/bastion-facilities.json");

/// Той самий код, що `CORE_BASTION_SOURCE` у src/lib/bastionsData.ts. Не імпортується звідти
/// свідомо: той модуль читає ще не зібраний src/lib/generated/bastions.json, і на чистому
/// клоні імпорт замкнув би цикл «нормалізатор → каталог → нормалізатор».
const CORE_SOURCE = "DMG_2024";

type NormalizedBastionCatalog = {
  mirrorRevision: string;
  counts: { total: number; core: number; basic: number; byLevel: Record<string, number> };
  facilities: ParsedBastionFacility[];
};

function buildNormalizedCatalog(): void {
  const facilities = buildBastionFacilities();
  const catalog: NormalizedBastionCatalog = {
    mirrorRevision: MIRROR_REVISION,
    counts: countFacilities(facilities),
    facilities,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf-8");
  reportCatalog(catalog);
}

function countFacilities(facilities: ParsedBastionFacility[]): NormalizedBastionCatalog["counts"] {
  const core = facilities.filter((facility) => facility.source === CORE_SOURCE);
  const byLevel: Record<string, number> = {};
  for (const facility of core.filter((entry) => entry.facilityType === "special")) {
    const key = String(facility.level);
    byLevel[key] = (byLevel[key] ?? 0) + 1;
  }

  return {
    total: facilities.length,
    core: core.filter((facility) => facility.facilityType === "special").length,
    basic: core.filter((facility) => facility.facilityType === "basic").length,
    byLevel,
  };
}

function reportCatalog(catalog: NormalizedBastionCatalog): void {
  const { counts } = catalog;
  console.log(`Приміщень усього: ${counts.total}`);
  console.log(`Ядро DMG 2024: ${counts.core} спеціальних + ${counts.basic} базових`);
  console.log(
    `За рівнями: ${Object.entries(counts.byLevel)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([level, amount]) => `${level} → ${amount}`)
      .join(", ")}`
  );
  console.log(`Записано ${OUTPUT_PATH}`);
}

buildNormalizedCatalog();

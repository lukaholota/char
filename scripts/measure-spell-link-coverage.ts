import { collectSpellRegistry, formatCoverageTable, measureCarriers, measureSurfaces } from "./spell-links/spell-mentions";

/// Вимірювач покриття згадок заклинань посиланнями (KR25.3): та сама евристика, що й таблиця
/// README O25. Запуск: `bunx tsx scripts/measure-spell-link-coverage.ts`.

const registry = collectSpellRegistry();
console.log("Джерела (їх править проставляч):\n" + formatCoverageTable(measureCarriers(registry)));
console.log("\nПоверхні (генеровані каталоги — що бачить читач):\n" + formatCoverageTable(measureSurfaces(registry)));
console.log(`\nНеоднозначних назв (у звіт, не в автоправку): ${registry.ambiguous.size}`);

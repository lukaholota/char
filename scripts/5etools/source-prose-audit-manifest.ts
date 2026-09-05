import { createHash } from "crypto";

import { MIRROR_REVISION } from "./mirror";
import { findLooseNameKey } from "./schema";
import { SourceProseAudit } from "./source-prose-audit";
import { stripSpellAnchors } from "../../src/lib/spell-link";

export type SourceProseAuditStatus =
  | "pending"
  | "rule-change"
  | "editorial-only"
  | "new-in-2024"
  | "blocked-term";

export type SourceProseAuditManifestEntry = {
  batch: number;
  engName: string;
  source2014Hash: string | null;
  source2024Hash: string;
  status: SourceProseAuditStatus;
  descriptionHash: string | null;
  note: string;
};

export type SourceProseAuditManifest = {
  sourceRevision: string;
  completedBatches: number[];
  entries: SourceProseAuditManifestEntry[];
};

type CatalogDescription = { engName: string; description: string };

type ManifestContext = {
  auditByName: Map<string, SourceProseAudit["rows"][number]>;
  catalogByName: Map<string, CatalogDescription>;
  manualNames: string[];
  completedBatches: Set<number>;
};

const BATCH_SIZE = 25;
const VALID_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "rule-change",
  "editorial-only",
  "new-in-2024",
  "blocked-term",
]);

/// Пін бере прозу, а не розмітку: якір на заклинання ставить проставляч O25 і знімає він же,
/// а рецензент звіряв із першоджерелом текст. Без цього кожен прогін KR25.4–KR25.6 робив би
/// застарілими всі 391 хеш, нічого не змінивши в перекладі.
export function hashDescription(description: string): string {
  return createHash("sha256").update(stripSpellAnchors(description), "utf-8").digest("hex");
}

export function validateSourceProseManifest(
  manifest: SourceProseAuditManifest,
  audit: SourceProseAudit,
  catalog: CatalogDescription[]
): string[] {
  const context = buildManifestContext(manifest, audit, catalog);
  return [
    ...findManifestHeaderIssues(manifest),
    ...manifest.entries.flatMap((entry) => findEntryIssues(entry, context)),
    ...manifest.completedBatches.flatMap((batch) => findBatchIssues(batch, manifest, context)),
  ];
}

function buildManifestContext(
  manifest: SourceProseAuditManifest,
  audit: SourceProseAudit,
  catalog: CatalogDescription[]
): ManifestContext {
  return {
    auditByName: new Map(audit.rows.map((row) => [row.engName, row])),
    catalogByName: new Map(catalog.map((row) => [findLooseNameKey(row.engName), row])),
    manualNames: audit.rows
      .filter((row) => row.classification !== "source-identical")
      .map((row) => row.engName),
    completedBatches: new Set(manifest.completedBatches),
  };
}

function findManifestHeaderIssues(manifest: SourceProseAuditManifest): string[] {
  const revisionIssues =
    manifest.sourceRevision === MIRROR_REVISION
      ? []
      : [`sourceRevision: очікували ${MIRROR_REVISION}, маємо ${manifest.sourceRevision}`];
  const batchIssues = collectDuplicates(manifest.completedBatches).map(
    (batch) => `completedBatches: партія ${batch} повторюється`
  );
  const nameIssues = collectDuplicates(manifest.entries.map((entry) => entry.engName)).map(
    (engName) => `${engName}: імʼя повторюється в маніфесті`
  );
  return [...revisionIssues, ...batchIssues, ...nameIssues];
}

function findEntryIssues(entry: SourceProseAuditManifestEntry, context: ManifestContext): string[] {
  const source = context.auditByName.get(entry.engName);
  const catalogRow = context.catalogByName.get(findLooseNameKey(entry.engName));
  if (!source || source.classification === "source-identical") {
    return [`${entry.engName}: імʼя не належить ручній черзі KR17.6`];
  }
  if (!catalogRow) return [`${entry.engName}: немає в каталозі 2024`];

  return [
    ...findEntryFieldIssues(entry, source),
    ...findResolvedEntryIssues(entry, source.classification, catalogRow.description),
    ...findCompletionIssues(entry, context.completedBatches),
  ];
}

function findEntryFieldIssues(
  entry: SourceProseAuditManifestEntry,
  source: SourceProseAudit["rows"][number]
): string[] {
  return [
    ...(!VALID_STATUSES.has(entry.status)
      ? [`${entry.engName}: невідомий status «${entry.status}»`]
      : []),
    ...(entry.source2014Hash !== source.source2014Hash
      ? [`${entry.engName}: застарілий source hash 2014`]
      : []),
    ...(entry.source2024Hash !== source.source2024Hash
      ? [`${entry.engName}: застарілий source hash XPHB`]
      : []),
  ];
}

function findResolvedEntryIssues(
  entry: SourceProseAuditManifestEntry,
  sourceClassification: string,
  description: string
): string[] {
  if (entry.status === "pending" || entry.status === "blocked-term") {
    return entry.descriptionHash === null
      ? []
      : [`${entry.engName}: незавершений запис не повинен пінити description hash`];
  }

  return [
    ...(entry.note.trim() === "" ? [`${entry.engName}: бракує змістової примітки`] : []),
    ...(entry.descriptionHash !== hashDescription(description)
      ? [`${entry.engName}: застарілий description hash`]
      : []),
    ...findClassificationIssues(entry, sourceClassification),
  ];
}

function findClassificationIssues(
  entry: SourceProseAuditManifestEntry,
  sourceClassification: string
): string[] {
  if (sourceClassification === "new-in-2024" && entry.status !== "new-in-2024") {
    return [`${entry.engName}: запис без відповідника мусить мати status new-in-2024`];
  }
  if (sourceClassification !== "new-in-2024" && entry.status === "new-in-2024") {
    return [`${entry.engName}: status new-in-2024 має запис із відповідником 2014`];
  }
  return [];
}

function findCompletionIssues(
  entry: SourceProseAuditManifestEntry,
  completedBatches: Set<number>
): string[] {
  if (!completedBatches.has(entry.batch)) return [];
  if (entry.status === "pending") {
    return [`${entry.engName}: status pending у завершеній партії ${entry.batch}`];
  }
  if (entry.status === "blocked-term") {
    return [`${entry.engName}: blocked-term не завершує партію ${entry.batch}`];
  }
  return [];
}

function findBatchIssues(
  batch: number,
  manifest: SourceProseAuditManifest,
  context: ManifestContext
): string[] {
  const expected = context.manualNames.slice((batch - 1) * BATCH_SIZE, batch * BATCH_SIZE);
  const actual = manifest.entries
    .filter((entry) => entry.batch === batch)
    .map((entry) => entry.engName);
  return sameNames(actual, expected)
    ? []
    : [`партія ${batch}: склад не дорівнює стабільному зрізу ручної черги`];
}

function collectDuplicates<T>(values: T[]): T[] {
  const seen = new Set<T>();
  const duplicates = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function sameNames(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((name, index) => name === expected[index]);
}

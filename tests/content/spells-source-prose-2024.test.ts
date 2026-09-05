import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { buildSourceProseAudit } from "../../scripts/5etools/source-prose-audit";
import {
  hashDescription,
  SourceProseAuditManifest,
  SourceProseAuditManifestEntry,
  validateSourceProseManifest,
} from "../../scripts/5etools/source-prose-audit-manifest";
import { readSpellsFrom } from "../../scripts/5etools/schema";
import catalog2024 from "../../data/2024/normalized/spells.json";
import manifestJson from "../../data/2024/audit/spell-source-prose-2024.json";

const XPHB_PATH = join(process.cwd(), "data/5etools/raw/spells/spells-xphb.json");
const audit = buildSourceProseAudit();
const catalog = catalog2024 as { engName: string; description: string }[];
const manifest = manifestJson as SourceProseAuditManifest;

function readXphbNames(): string[] {
  const source = JSON.parse(readFileSync(XPHB_PATH, "utf-8")) as unknown;
  return readSpellsFrom(source, XPHB_PATH)
    .map((spell) => spell.nameEng)
    .sort((left, right) => left.localeCompare(right, "en"));
}

describe("KR17.6 — повний source-to-source аудит XPHB", () => {
  it("охоплює повний поіменний universe єдиного XPHB-файла", () => {
    const expectedNames = readXphbNames();
    const auditedNames = audit.rows.map((row) => row.engName);

    expect(expectedNames).toHaveLength(391);
    expect(auditedNames).toEqual(expectedNames);
  });

  it("пінить повний безпороговий розподіл", () => {
    expect(audit).toMatchObject({
      total: 391,
      withCounterpart2014: 381,
      differsFrom2014: 376,
      newIn2024: 10,
      sourceIdentical: 5,
      manualQueue: 386,
    });
  });
});

function buildValidEntry(): SourceProseAuditManifestEntry {
  const source = audit.rows.find((row) => row.engName === "Acid Splash");
  const catalogRow = catalog.find((row) => row.engName === "Acid Splash");
  if (!source || !catalogRow) throw new Error("Acid Splash: бракує тестового запису");

  return {
    batch: 1,
    engName: source.engName,
    source2014Hash: source.source2014Hash,
    source2024Hash: source.source2024Hash,
    status: "rule-change",
    descriptionHash: hashDescription(catalogRow.description),
    note: "Тестова змістова примітка.",
  };
}

function validate(entries: SourceProseAuditManifestEntry[], completedBatches: number[] = []): string[] {
  return validateSourceProseManifest(
    { sourceRevision: manifest.sourceRevision, completedBatches, entries },
    audit,
    catalog
  );
}

describe("KR17.6 — аудиторський маніфест", () => {
  it("поточний маніфест не має невідомих імен, drift або незавершених записів", () => {
    expect(validateSourceProseManifest(manifest, audit, catalog)).toEqual([]);
  });

  it("відхиляє невідомі й повторені імена", () => {
    const valid = buildValidEntry();
    const unknown = { ...valid, engName: "Вигадане заклинання" };

    expect(validate([unknown]).join("\n")).toMatch(/не належить ручній черзі/u);
    expect(validate([valid, valid]).join("\n")).toMatch(/імʼя повторюється/u);
  });

  it("відхиляє застарілі source і description hashes", () => {
    const valid = buildValidEntry();
    const stale = {
      ...valid,
      source2014Hash: "stale",
      source2024Hash: "stale",
      descriptionHash: "stale",
    };

    expect(validate([stale]).join("\n")).toMatch(
      /застарілий source hash 2014.*застарілий source hash XPHB.*застарілий description hash/su
    );
  });

  it("відхиляє pending у завершеній партії поіменно", () => {
    const pending = { ...buildValidEntry(), status: "pending" as const, descriptionHash: null };

    expect(validate([pending], [1]).join("\n")).toMatch(/Acid Splash: status pending/u);
  });
});

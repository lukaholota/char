/**
 * L07-spellcasting-12 — у мультикласі ліміт підготовлених окремий на кожен клас (SRD 2024,
 * character-creation.md:937; PHB 2014, «Multiclassing → Spells Known and Prepared»). Заклинання
 * належить класу за бейджем — тим самим, яким його пише вибір заклинань класу і рахує AddSpellDialog.
 */

export type PreparedLimitSource = {
  key: string;
  name: string;
  spellsLabel: string;
  spells: { kind: "fixed"; value: number } | { kind: "formula"; value?: number | null };
};

export type PreparedSpellRow = {
  level: number;
  isPrepared: boolean;
  badgeText: string | null | undefined;
  isExcludedFromPrepared: boolean;
};

export type PreparedSpellTally = {
  key: string;
  name: string;
  prepared: number;
  limit: number;
};

export type PreparedSpellTallies = {
  byClass: PreparedSpellTally[];
  unassigned: number;
};

const PREPARED_LIMIT_LABEL = "можна підготувати";

export function tallyPreparedSpellsByClass(sources: readonly PreparedLimitSource[], spells: readonly PreparedSpellRow[]): PreparedSpellTallies {
  const byClass = collectPreparedLimits(sources).map((limit) => ({ ...limit, prepared: 0 }));
  let unassigned = 0;

  for (const spell of spells.filter(isCountedAsPrepared)) {
    const tally = byClass.length === 1 ? byClass[0] : byClass.find((line) => isSameLabel(line.name, spell.badgeText));
    if (tally) tally.prepared += 1;
    else unassigned += 1;
  }

  return { byClass, unassigned };
}

export function findPreparedRemaining(tallies: PreparedSpellTallies, badgeText: string | null | undefined): number | null {
  const tally = tallies.byClass.length === 1 ? tallies.byClass[0] : tallies.byClass.find((line) => isSameLabel(line.name, badgeText));
  return tally ? tally.limit - tally.prepared : null;
}

function collectPreparedLimits(sources: readonly PreparedLimitSource[]): Omit<PreparedSpellTally, "prepared">[] {
  return sources.flatMap((source) => {
    if (!source.spellsLabel.toLocaleLowerCase("uk").includes(PREPARED_LIMIT_LABEL)) return [];
    const value = source.spells.value;
    if (typeof value !== "number" || !Number.isFinite(value)) return [];
    return [{ key: source.key, name: source.name, limit: Math.max(0, Math.trunc(value)) }];
  });
}

function isCountedAsPrepared(spell: PreparedSpellRow): boolean {
  return spell.level > 0 && spell.isPrepared && !spell.isExcludedFromPrepared;
}

function isSameLabel(className: string, badgeText: string | null | undefined): boolean {
  const badge = String(badgeText ?? "").trim().toLocaleLowerCase("uk");
  return badge.length > 0 && badge === className.trim().toLocaleLowerCase("uk");
}

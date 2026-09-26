"use client";

import type { RaceBranch, RaceData } from "@/lib/racesData";
import type { RaceBranchKind } from "@/lib/catalogs/reading-target";
import { buildTraitEntries } from "@/lib/catalogs/reading-entries";
import { BranchReader } from "@/components/catalogs/reading/BranchReader";
import { ReadingEntryList } from "@/components/catalogs/reading/ReadingEntryList";
import { BRANCH_KIND_LABELS } from "@/components/races/RaceDetailCard";

export function RaceBranchReader({
  race,
  kind,
  branch,
  featureKey,
  focusRequest,
  is2024,
  onBack,
  onClose,
}: {
  race: RaceData;
  kind: RaceBranchKind;
  branch: RaceBranch;
  featureKey: string | null;
  focusRequest: number;
  is2024: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <BranchReader
      name={branch.name}
      engName={branch.engName}
      sourceLabel={null}
      description={branch.description}
      labels={{ parentName: race.name, backLabel: is2024 ? "До виду" : "До раси", kindLabel: BRANCH_KIND_LABELS[kind] }}
      is2024={is2024}
      focusOnOpen={!featureKey}
      onBack={onBack}
      onClose={onClose}
    >
      <p className="mb-3 text-xs text-slate-400">
        Діє разом із базовими рисами: {race.name}.
      </p>
      <ReadingEntryList
        entries={buildTraitEntries(branch.traits)}
        targetKey={featureKey}
        focusRequest={focusRequest}
        is2024={is2024}
        isExpandedByDefault
      />
    </BranchReader>
  );
}

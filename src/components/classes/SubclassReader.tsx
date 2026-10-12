"use client";

import type { ClassData, SubclassData } from "@/lib/classesData";
import { SubclassAnalysisProvider } from "@/components/optimization/SubclassAnalysisContext";
import { SubclassAnalysis } from "@/components/optimization/SubclassAnalysis";
import { catalogSubclassEntity } from "@/lib/optimization/bindings";
import { buildFeatureEntries } from "@/lib/catalogs/reading-entries";
import { BranchReader } from "@/components/catalogs/reading/BranchReader";
import { ReadingEntryList } from "@/components/catalogs/reading/ReadingEntryList";
import { LEGACY_SUBCLASSES_NOTE, findSubclassSourceLabel } from "@/components/classes/ClassDetailCard";

export function SubclassReader({
  characterClass,
  subclass,
  featureKey,
  focusRequest,
  is2024,
  onBack,
  onClose,
}: {
  characterClass: ClassData;
  subclass: SubclassData;
  featureKey: string | null;
  focusRequest: number;
  is2024: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <SubclassAnalysisProvider entity={catalogSubclassEntity(characterClass, subclass)} placement="catalog">
    <BranchReader
      name={subclass.name}
      engName={subclass.engName}
      sourceLabel={findSubclassSourceLabel(subclass)}
      description={subclass.description}
      coverSrc={subclass.imageSrc}
      beforeDescription={<SubclassAnalysis entity={catalogSubclassEntity(characterClass, subclass)} placement="catalog" />}
      labels={{ parentName: characterClass.name, backLabel: "До класу", kindLabel: "Підклас" }}
      is2024={is2024}
      focusOnOpen={!featureKey}
      onBack={onBack}
      onClose={onClose}
    >
      {subclass.legacy ? <p className="mb-3 text-xs text-slate-400">{LEGACY_SUBCLASSES_NOTE}</p> : null}
      <ReadingEntryList
        entries={buildFeatureEntries(subclass.features)}
        targetKey={featureKey}
        focusRequest={focusRequest}
        is2024={is2024}
        isExpandedByDefault
      />
    </BranchReader>
    </SubclassAnalysisProvider>
  );
}

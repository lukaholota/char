"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatSpellChoiceStep } from "@/components/spells/FeatSpellChoiceStep";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";

interface Props {
  featLabel: string;
  offer: FeatSpellChoiceOffer;
  field?: "featSpellIds" | "featGrowthSpellIds" | "classOptionSpellIds";
  title?: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

const OTHER_FIELDS = {
  featSpellIds: ["featGrowthSpellIds", "classOptionSpellIds"],
  featGrowthSpellIds: ["featSpellIds", "classOptionSpellIds"],
  classOptionSpellIds: ["featSpellIds", "featGrowthSpellIds"],
} as const;

export function LevelUpFeatSpellStep({ featLabel, offer, field = "featSpellIds", title = "Заклинання риси", onNextDisabledChange }: Props) {
  const { formData, updateFormData } = usePersFormStore();
  const reportComplete = useCallback((isComplete: boolean) => onNextDisabledChange?.(!isComplete), [onNextDisabledChange]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <FeatSpellChoiceStep
          featLabel={featLabel}
          offer={offer}
          selectedIds={formData[field] ?? []}
          excludedSpellIds={OTHER_FIELDS[field].flatMap((other) => formData[other] ?? [])}
          onChange={(spellIds) => updateFormData({ [field]: spellIds })}
          onCompleteChange={reportComplete}
        />
      </CardContent>
    </Card>
  );
}

export default LevelUpFeatSpellStep;

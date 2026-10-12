"use client";

import { ControlledInfoDialog, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import type { ClassI } from "@/lib/types/model-types";

export type ChoiceOptionFeatures = ClassI["classChoiceOptions"][number]["choiceOption"]["features"];
export type ChoiceOptionInfo = { title: string; features?: ChoiceOptionFeatures };

export function ChoiceOptionFeaturesDialog({ info, onClose }: { info: ChoiceOptionInfo | null; onClose: () => void }) {
  const features = (info?.features ?? []).map((item) => item.feature).filter((feature) => feature?.name);
  return (
    <ControlledInfoDialog open={info !== null} onOpenChange={(open) => { if (!open) onClose(); }} title={info?.title || "Фічі"} contentClassName="max-w-2xl">
      {features.length ? (
        <div className="space-y-3">
          <InfoSectionTitle>Фічі</InfoSectionTitle>
          <div className="space-y-3">
            {features.map((feature) => (
              <div key={feature.name} className="glass-panel rounded-xl border border-slate-800/70 p-4">
                <div className="text-sm font-semibold text-white">{feature.name}</div>
                {feature.description ? <FormattedDescription content={feature.description} className="mt-2 text-slate-200/90" /> : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-400">Немає фіч</div>
      )}
    </ControlledInfoDialog>
  );
}

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { CustomSkillEditor } from "@/lib/components/characterSheet/custom/CustomSkillDialog";
import { CustomFeatureEditor } from "@/lib/components/characterSheet/custom/CustomFeatureDialog";
import {
  deleteCampaignFeatureAction,
  deleteCampaignSkillAction,
  saveCampaignFeatureAction,
  saveCampaignSkillAction,
} from "@/lib/actions/campaign-custom-content-actions";
import { bonusTranslations } from "@/lib/refs/translation";
import { MAX_CAMPAIGN_FEATURES, MAX_CAMPAIGN_SKILLS } from "@/rules/pers-custom-content";
import type { CampaignFeatureView, CampaignSkillView, GameSessionView } from "@/server/db/game-sessions";

const REST_SHORT_LABELS = { SHORT_REST: "короткий відпочинок", LONG_REST: "довгий відпочинок" } as const;
const ROW = "flex min-h-11 w-full items-center justify-between gap-3 rounded border border-white/10 px-3 py-2 text-left text-sm hover:bg-white/5";
const ADD_BUTTON = "flex min-h-11 items-center justify-center gap-2 rounded border border-dashed border-arcane-400/40 px-3 text-sm text-arcane-100 hover:bg-arcane-500/10 disabled:opacity-50";

export function CampaignCustomContent({ view }: { view: GameSessionView }) {
  const router = useModeRouter();
  const [skillTarget, setSkillTarget] = useState<CampaignSkillView | "new" | null>(null);
  const [featureTarget, setFeatureTarget] = useState<CampaignFeatureView | "new" | null>(null);
  const finish = (close: () => void) => () => {
    close();
    toast.success("Збережено для всіх героїв кампанії");
    router.refresh();
  };
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-200">Навички й здібності кампанії</p>
        <p className="text-sm text-slate-400">Кожен герой кампанії отримає їх на свій лист персонажа.</p>
      </div>
      {view.campaignSkills.length || view.campaignFeatures.length ? (
        <ul className="space-y-1">
          {view.campaignSkills.map((skill) => (
            <li key={`skill-${skill.id}`}>
              <button type="button" className={ROW} onClick={() => setSkillTarget(skill)} aria-label={`Редагувати навичку кампанії: ${skill.name}`}>
                <span className="min-w-0 break-words text-slate-100">{skill.name}</span>
                <span className="shrink-0 text-slate-400">{bonusTranslations.statNames[skill.ability]}</span>
              </button>
            </li>
          ))}
          {view.campaignFeatures.map((feature) => (
            <li key={`feature-${feature.id}`}>
              <button type="button" className={ROW} onClick={() => setFeatureTarget(feature)} aria-label={`Редагувати здібність кампанії: ${feature.name}`}>
                <span className="min-w-0 break-words text-slate-100">{feature.name}</span>
                <span className="shrink-0 text-slate-400">{describeFeatureUses(feature)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={ADD_BUTTON} disabled={view.campaignSkills.length >= MAX_CAMPAIGN_SKILLS} onClick={() => setSkillTarget("new")}>
          <Plus className="h-4 w-4" aria-hidden />
          Навичка
        </button>
        <button type="button" className={ADD_BUTTON} disabled={view.campaignFeatures.length >= MAX_CAMPAIGN_FEATURES} onClick={() => setFeatureTarget("new")}>
          <Plus className="h-4 w-4" aria-hidden />
          Здібність
        </button>
      </div>
      <CustomSkillEditor
        pers={null}
        target={skillTarget}
        title={skillTarget === "new" ? "Нова навичка кампанії" : "Навичка кампанії"}
        description="Зʼявиться в кожного героя кампанії й кидатиметься від його характеристик і майстерності."
        store={{ save: (skillId, draft) => saveCampaignSkillAction(view.id, skillId, draft), remove: (skillId) => deleteCampaignSkillAction(view.id, skillId) }}
        onClose={() => setSkillTarget(null)}
        onSaved={finish(() => setSkillTarget(null))}
      />
      <CustomFeatureEditor
        pers={null}
        target={featureTarget}
        title={featureTarget === "new" ? "Нова здібність кампанії" : "Здібність кампанії"}
        description="Зʼявиться в кожного героя кампанії зі своїм лічильником. БМ і модифікатори в формулі беруться з листа героя."
        store={{ save: (featureId, draft) => saveCampaignFeatureAction(view.id, featureId, draft), remove: (featureId) => deleteCampaignFeatureAction(view.id, featureId) }}
        onClose={() => setFeatureTarget(null)}
        onSaved={finish(() => setFeatureTarget(null))}
      />
    </div>
  );
}

function describeFeatureUses(feature: CampaignFeatureView): string {
  if (feature.usesMax === null) return "без ліку";
  return feature.restoredOn ? `${feature.usesMax} · ${REST_SHORT_LABELS[feature.restoredOn]}` : `${feature.usesMax} · вручну`;
}

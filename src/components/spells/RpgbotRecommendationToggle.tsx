"use client";

import { useId } from "react";
import { AnalystAvatar } from "@/components/optimization/AnalystAvatar";
import { Switch } from "@/components/ui/switch";

type Props = { isOn: boolean; onChange: (isOn: boolean) => void; description?: string };

const SPELL_DESCRIPTION = "Оцінка кожного заклинання за розбором RPGbot для вашого класу; найкращі — зверху.";

export function RpgbotRecommendationToggle({ isOn, onChange, description = SPELL_DESCRIPTION }: Props) {
  const switchId = useId();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <AnalystAvatar className="size-12" />
      <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-semibold text-slate-100">Показати рекомендації RPGbot</span>
        <span className="block text-xs text-slate-400">{description}</span>
      </label>
      <Switch id={switchId} checked={isOn} onCheckedChange={onChange} />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { ScrollText } from "lucide-react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/homebrew/HomebrewFormFields";
import { HouseRulesFields, MAGIC_SYSTEM_LABELS } from "@/components/house-rules/HouseRulesFields";
import { saveGameSessionHouseRulesAction } from "@/lib/actions/game-sessions";
import { CUSTOM_DAMAGE_TYPES_LIMIT, parseCustomDamageTypes, type CampaignHouseRules } from "@/rules/house-rules";
import type { GameSessionView } from "@/server/db/game-sessions";
import { SwitchRow } from "./MapToolPanels";

export function describeCampaignHouseRules(rules: CampaignHouseRules): string[] {
  return [
    rules.attunementLimit === null ? null : `Предметів із налаштуванням: до ${rules.attunementLimit}`,
    rules.magicSystem === "POINTS" ? `Магія: ${MAGIC_SYSTEM_LABELS.POINTS}` : null,
    rules.damageTypes.length ? `Свої типи шкоди: ${rules.damageTypes.join(", ")}` : null,
    rules.isDamageConfirmedByGm ? "Майстер перевіряє шкоду гравців" : null,
    rules.isAttackTrayShown ? null : "Кидок атаки — без вікна, лише результат",
    rules.isDamageAutoRolled ? null : "Шкоду після влучання гравець кидає сам",
  ].filter((line): line is string => line !== null);
}

export function CampaignHouseRulesSummary({ rules }: { rules: CampaignHouseRules }) {
  const lines = describeCampaignHouseRules(rules);
  if (!lines.length) return null;
  return (
    <div className="space-y-1 text-sm text-slate-300">
      <p className="font-semibold text-slate-200">Правила кампанії</p>
      {lines.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}

export function CampaignHouseRulesEditor({ view }: { view: GameSessionView }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="outline" onClick={() => setIsOpen(true)} className="h-12 w-full justify-start gap-3 px-4 text-base">
          <ScrollText className="h-4 w-4" aria-hidden />
          Правила кампанії
        </Button>
        <CampaignHouseRulesSummary rules={view.houseRules} />
      </div>
    );
  }
  return <CampaignHouseRulesForm view={view} onDone={() => setIsOpen(false)} />;
}

function CampaignHouseRulesForm({ view, onDone }: { view: GameSessionView; onDone: () => void }) {
  const router = useModeRouter();
  const [rules, setRules] = useState(view.houseRules);
  const [damageTypesText, setDamageTypesText] = useState(view.houseRules.damageTypes.join(", "));
  const [isPending, startTransition] = useTransition();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const damageTypes = parseCustomDamageTypes(damageTypesText.split(","));
    startTransition(async () => {
      const result = await saveGameSessionHouseRulesAction(view.id, { ...rules, damageTypes });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Правила кампанії збережено");
      onDone();
      router.refresh();
    });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-semibold text-slate-200">Правила кампанії</p>
      <HouseRulesFields rules={rules} onChange={(next) => setRules({ ...rules, ...next })} defaultLimitLabel="За книгою" />
      <TextField
        name="house-damage-types"
        label="Свої типи шкоди"
        value={damageTypesText}
        onChange={setDamageTypesText}
        maxLength={240}
        placeholder="Світло, Хаос"
        hint={`Через кому, до ${CUSTOM_DAMAGE_TYPES_LIMIT}. Гравці зможуть обрати їх для додаткової шкоди зброї.`}
      />
      <SwitchRow label="Майстер перевіряє шкоду гравців перед тим, як зняти хіти" isChecked={rules.isDamageConfirmedByGm} onChange={(isDamageConfirmedByGm) => setRules({ ...rules, isDamageConfirmedByGm })} />
      <SwitchRow label="Показувати вікно кидка атаки" isChecked={rules.isAttackTrayShown} onChange={(isAttackTrayShown) => setRules({ ...rules, isAttackTrayShown })} />
      <SwitchRow label="Шкода сама після влучання" isChecked={rules.isDamageAutoRolled} onChange={(isDamageAutoRolled) => setRules({ ...rules, isDamageAutoRolled })} />
      <p className="text-xs text-slate-500">Гравець може змінити ліміт і магію для свого героя на листі персонажа, а вікно атаки й шкоду — для себе в цій кампанії.</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" disabled={isPending} className="h-12 text-base">Зберегти</Button>
        <Button type="button" variant="ghost" onClick={onDone} className="h-12 text-base">Скасувати</Button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HouseRulesFields, MAGIC_SYSTEM_LABELS } from "@/components/house-rules/HouseRulesFields";
import { SelectField } from "@/components/homebrew/HomebrewFormFields";
import { savePersHouseRulesAction } from "@/lib/actions/pers-house-rules-actions";
import type { PersWithRelations } from "@/lib/actions/pers";
import { findCampaignHouseRulesForPers } from "@/lib/logic/pers-house-rules";
import { collectActiveFeatures } from "@/lib/logic/bonus-calculator";
import { findAttunementCapacityForPers } from "@/rules/attunement";
import { parsePersHouseRules } from "@/rules/house-rules";
import { findDarkvisionRange } from "@/rules/senses-and-resistances";

const DARKVISION_OPTIONS = [{ value: "0", label: "Немає" }, ...[30, 60, 90, 120, 150, 300].map((feet) => ({ value: String(feet), label: `${feet} футів` }))];

export function PersHouseRulesDialog({ pers, trigger }: { pers: PersWithRelations; trigger: ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [rules, setRules] = useState(() => parsePersHouseRules(pers.houseRules));
  const [isPending, startTransition] = useTransition();
  const campaign = findCampaignHouseRulesForPers(pers);
  const defaultLimit = findAttunementCapacityForPers(pers, campaign.attunementLimit);
  const racialDarkvision = findDarkvisionRange(collectActiveFeatures(pers));

  const open = (next: boolean) => {
    if (next) setRules(parsePersHouseRules(pers.houseRules));
    setIsOpen(next);
  };
  const save = () =>
    startTransition(async () => {
      const result = await savePersHouseRulesAction(pers.persId, rules);
      if (!result.success) return void toast.error(result.error);
      setIsOpen(false);
      router.refresh();
    });

  return (
    <Dialog open={isOpen} onOpenChange={open}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md border-white/10 bg-slate-950">
        <DialogTitle>Домашні правила героя</DialogTitle>
        <DialogDescription>Типові значення беруться з кампанії, а без неї — з книги.</DialogDescription>
        <HouseRulesFields rules={rules} onChange={setRules} defaultLimitLabel={`Типово: ${defaultLimit}`} defaultMagicLabel={`Типово: ${MAGIC_SYSTEM_LABELS[campaign.magicSystem]}`} />
        <SelectField
          name="house-darkvision"
          label="Темнозір"
          value={rules.darkvisionRange === null ? "" : String(rules.darkvisionRange)}
          onChange={(value) => setRules({ ...rules, darkvisionRange: value ? Number(value) : null })}
          options={[{ value: "", label: `Як у виду: ${racialDarkvision ? `${racialDarkvision} футів` : "немає"}` }, ...DARKVISION_OPTIONS]}
          hint="Діє на лист і на карту гри. Предмети на кшталт окулярів нічного бачення враховуються окремо."
        />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={save} disabled={isPending} className="h-11 text-base">Зберегти</Button>
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="h-11 text-base">Скасувати</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

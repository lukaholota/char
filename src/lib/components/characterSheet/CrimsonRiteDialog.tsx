"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Droplet } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import { setWeaponCrimsonRite } from "@/lib/actions/equipment-actions";
import { listKnownCrimsonRites, findWeaponCrimsonRite } from "@/lib/logic/crimson-rite-sheet";
import { findCrimsonRiteDamage } from "@/rules/crimson-rite";
import { formatDiceUkr } from "@/lib/logic/equipment-stats";
import { damageTypeTranslations } from "@/lib/refs/translation";
import { BLOOD_HUNTER_CLASS_NAMES, sumClassLevels } from "@/lib/logic/active-states";

type Props = { pers: PersWithRelations; pw: PersWeaponWithWeapon; weaponName: string };

/// Багряний обряд на цій зброї: запалити один із відомих або згасити. Ціну (хіти за кубик гемокрафту)
/// гравець знімає сам на листі — застосунок трекер, а не суддя.
export function CrimsonRiteDialog({ pers, pw, weaponName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rites = listKnownCrimsonRites(pers);
  const active = findWeaponCrimsonRite(pers, pw);
  const bloodHunterLevel = sumClassLevels(pers, BLOOD_HUNTER_CLASS_NAMES);

  if (rites.length === 0) return null;

  const chooseRite = (riteFeatureId: number | null) => {
    startTransition(async () => {
      const result = await setWeaponCrimsonRite(pw.persWeaponId, riteFeatureId);
      if (!result.success) {
        toast.error(result.error || "Не вдалося змінити обряд");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={active ? "h-8 w-8 text-rose-400 hover:bg-rose-500/10" : "h-8 w-8 text-slate-500 hover:text-rose-300"}
          title="Багряний обряд"
          onClick={(event) => event.stopPropagation()}
        >
          <Droplet className="h-4 w-4" fill={active ? "currentColor" : "none"} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Багряний обряд</DialogTitle>
          <DialogDescription>
            {weaponName}: одна зброя тримає лише один обряд, він діє до відпочинку. Запалюючи обряд, ви отримуєте некротичну шкоду — один кубик
            гемокрафту.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {rites.map((rite) => {
            const damage = findCrimsonRiteDamage(rite.engName, bloodHunterLevel);
            const isActive = active?.rite.featureId === rite.featureId;
            return (
              <Button
                key={rite.featureId}
                variant="outline"
                disabled={isPending || isActive}
                className="w-full justify-between border-white/10 bg-white/5 text-slate-100"
                onClick={() => chooseRite(rite.featureId)}
              >
                <span>{rite.name}</span>
                {damage && (
                  <span className="text-xs text-rose-300">
                    +{formatDiceUkr(damage.dice)} {(damageTypeTranslations[damage.damageType] ?? damage.damageType).toLowerCase()}
                  </span>
                )}
              </Button>
            );
          })}
          {active && (
            <Button variant="ghost" disabled={isPending} className="w-full text-slate-300" onClick={() => chooseRite(null)}>
              Згасити обряд
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

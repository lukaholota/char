"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WeaponMasteryPicker } from "@/components/weapons/WeaponMasteryPicker";
import { loadWeaponMasteryOffer, saveWeaponMastery } from "@/lib/actions/weapon-mastery";
import type { WeaponMasteryOffer } from "@/server/db/weapon-mastery";
import { toast } from "sonner";

interface Props {
  persId: number;
  trigger: React.ReactNode;
}

/**
 * Вибір майстерності змінний будь-коли, а не лише після довгого відпочинку
 * (рішення власника 2026-08-30) — тому це звичайний редактор, без привʼязки до відпочинку.
 */
export default function WeaponMasteryDialog({ persId, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState<WeaponMasteryOffer | null>(null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    if (!open) return;
    setOffer(null);
    loadWeaponMasteryOffer(persId).then((result) => {
      if (!result.ok) {
        toast.error(result.error);
        setOpen(false);
        return;
      }
      setOffer(result.offer);
      setChosen(result.offer.selectedWeaponIds);
    });
  }, [open, persId]);

  const capacity = offer?.capacity ?? 0;

  const toggleWeapon = (weaponId: number) => {
    setChosen((current) => {
      if (current.includes(weaponId)) return current.filter((id) => id !== weaponId);
      if (current.length >= capacity) return current;
      return [...current, weaponId];
    });
  };

  const save = () => {
    startSaving(async () => {
      const result = await saveWeaponMastery(persId, chosen);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Майстерність зброї збережено");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-amber-300" />
            Майстерність зброї
          </DialogTitle>
        </DialogHeader>

        {!offer ? (
          <p className="py-6 text-center text-sm text-slate-400">Завантаження…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Обрано {chosen.length} з {capacity}. Набір можна міняти будь-коли.
            </p>

            <WeaponMasteryPicker
              options={offer.options}
              selectedWeaponIds={chosen}
              capacity={capacity}
              onToggle={toggleWeapon}
            />

            <Button onClick={save} disabled={isSaving} className="w-full">
              {isSaving ? "Збереження…" : "Зберегти"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWeapon, deleteWeapon } from "@/lib/actions/equipment-actions";
import { Ability, PersWeapon } from "@prisma/client";
import { toast } from "sonner";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import { Trash2 } from "lucide-react";

interface WeaponCustomizeModalProps {
  persWeapon: PersWeapon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WeaponCustomizeModal({ persWeapon, open, onOpenChange }: WeaponCustomizeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    overrideName: persWeapon.overrideName || "",
    attackBonus: persWeapon.attackBonus || 0,
    customDamageBonus: persWeapon.customDamageBonus as number || 0,
    customDamageDice: persWeapon.customDamageDice || "",
    customDamageAbility: persWeapon.customDamageAbility || "STR",
    isMagical: persWeapon.isMagical,
    isProficient: persWeapon.isProficient,
  });

  useModalBackButton(open, () => onOpenChange(false));

  useEffect(() => {
    if (open) {
      setFormData({
        overrideName: persWeapon.overrideName || "",
        attackBonus: persWeapon.attackBonus || 0,
        customDamageBonus: persWeapon.customDamageBonus as number || 0,
        customDamageDice: persWeapon.customDamageDice || "",
        customDamageAbility: persWeapon.customDamageAbility || "STR",
        isMagical: persWeapon.isMagical,
        isProficient: persWeapon.isProficient,
      });
    }
  }, [open, persWeapon]);

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateWeapon(persWeapon.persWeaponId, {
        ...formData,
        overrideName: formData.overrideName || null,
        customDamageAbility: formData.customDamageAbility as Ability,
      });

      if (res.success) {
        toast.success("Зброю оновлено");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Помилка при оновленні зброї");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Ви впевнені, що хочете видалити цю зброю?")) return;
    
    startTransition(async () => {
      const res = await deleteWeapon(persWeapon.persWeaponId);
      if (res.success) {
        toast.success("Зброю видалено");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Помилка при видаленні зброї");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-white/10 text-slate-50">
        <DialogHeader>
          <DialogTitle>Налаштування зброї</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Назва (кастомна)</Label>
            <Input
              value={formData.overrideName}
              onChange={(e) => setFormData({ ...formData, overrideName: e.target.value })}
              className="bg-white/5 border-white/10"
              placeholder="Залишіть порожнім для стандартної"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Бонус до атаки</Label>
              <Input
                type="number"
                value={formData.attackBonus}
                onChange={(e) => setFormData({ ...formData, attackBonus: parseInt(e.target.value) || 0 })}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Бонус до шкоди</Label>
              <Input
                type="number"
                value={formData.customDamageBonus}
                onChange={(e) => setFormData({ ...formData, customDamageBonus: parseInt(e.target.value) || 0 })}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Кістка шкоди (напр. 1d8)</Label>
              <Input
                value={formData.customDamageDice}
                onChange={(e) => setFormData({ ...formData, customDamageDice: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="Напр. 1d8"
              />
            </div>
            <div className="space-y-2">
              <Label>Характеристика</Label>
              <Select
                value={formData.customDamageAbility}
                onValueChange={(val) => setFormData({ ...formData, customDamageAbility: val })}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Ability).map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label>Магічна зброя</Label>
              <div className="text-xs text-slate-400">Впливає на ігнорування опору</div>
            </div>
            <Switch
              checked={formData.isMagical}
              onCheckedChange={(val) => setFormData({ ...formData, isMagical: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label>Володіння</Label>
              <div className="text-xs text-slate-400">Додає бонус майстерності до атаки</div>
            </div>
            <Switch
              checked={formData.isProficient}
              onCheckedChange={(val) => setFormData({ ...formData, isProficient: val })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="destructive" className="gap-2" onClick={handleDelete} disabled={isPending}>
              <Trash2 className="w-4 h-4" />
              Видалити
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={isPending}>
              Зберегти
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

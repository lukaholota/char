"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateArmor, deleteArmor } from "@/lib/actions/equipment-actions";
import { toast } from "sonner";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import { PersArmorWithArmor } from "@/lib/actions/pers";
import { Trash2 } from "lucide-react";

interface ArmorCustomizeModalProps {
  persArmor: PersArmorWithArmor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ArmorCustomizeModal({ persArmor, open, onOpenChange }: ArmorCustomizeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    overrideBaseAC: persArmor.overrideBaseAC,
    miscACBonus: persArmor.miscACBonus || 0,
    isProficient: persArmor.isProficient,
    equipped: persArmor.equipped,
  });

  useModalBackButton(open, () => onOpenChange(false));

  useEffect(() => {
    if (open) {
      setFormData({
        overrideBaseAC: persArmor.overrideBaseAC,
        miscACBonus: persArmor.miscACBonus || 0,
        isProficient: persArmor.isProficient,
        equipped: persArmor.equipped,
      });
    }
  }, [open, persArmor]);

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateArmor(persArmor.persArmorId, {
        ...formData,
        miscACBonus: formData.miscACBonus || 0,
      });

      if (res.success) {
        toast.success("Обладунок оновлено");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Помилка при оновленні обладунку");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Ви впевнені, що хочете видалити цей обладунок?")) return;
    
    startTransition(async () => {
      const res = await deleteArmor(persArmor.persArmorId);
      if (res.success) {
        toast.success("Обладунок видалено");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Помилка при видаленні обладунку");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900/60 backdrop-blur-xl border-white/10 text-slate-50">
        <DialogHeader>
          <DialogTitle>Налаштування обладунку</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Базовий КБ (залишити порожнім для стандартного)</Label>
            <Input
              type="number"
              value={formData.overrideBaseAC ?? ""}
              onChange={(e) => setFormData({ ...formData, overrideBaseAC: e.target.value ? parseInt(e.target.value) : null })}
              placeholder={persArmor.armor?.baseAC?.toString() || "10"}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label>Додатковий бонус до КБ (магічний +1 та ін.)</Label>
            <Input
              type="number"
              value={formData.miscACBonus}
              onChange={(e) => setFormData({ ...formData, miscACBonus: parseInt(e.target.value) || 0 })}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label>Екіпірований</Label>
              <div className="text-xs text-slate-400">Тільки один обладунок може бути активним</div>
            </div>
            <Switch
              checked={formData.equipped}
              onCheckedChange={(val) => setFormData({ ...formData, equipped: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label>Володіння</Label>
              <div className="text-xs text-slate-400">Відсутність володіння накладає штрафи</div>
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

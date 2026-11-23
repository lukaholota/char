"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWeapon, deleteWeapon } from "@/lib/actions/equipment-actions";
import { Ability, DamageType } from "@/lib/prisma-enums";
import type { PersWeaponWithWeapon } from "@/lib/actions/pers";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { attributesUkrFull, damageTypeTranslations } from "@/lib/refs/translation";
import { ExtraDamageFields } from "./ExtraDamageFields";
import { buildExtraDamage, toExtraDamageDrafts, type ExtraDamageDraft } from "@/rules/weapon-profile";

interface WeaponCustomizeModalProps {
  persWeapon: PersWeaponWithWeapon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customDamageTypes: readonly string[];
}

export default function WeaponCustomizeModal({ persWeapon, open, onOpenChange, customDamageTypes }: WeaponCustomizeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState(() => buildWeaponFormState(persWeapon));

  useEffect(() => {
    if (open) setFormData(buildWeaponFormState(persWeapon));
  }, [open, persWeapon]);

  const handleSave = () => {
    const extraDamage = buildExtraDamage(formData.extraDamage);
    if (extraDamage.length !== formData.extraDamage.length) return void toast.error("Перевірте формули додаткової шкоди");
    startTransition(async () => {
      const res = await updateWeapon(persWeapon.persWeaponId, {
        ...formData,
        attackBonus: parseInt(formData.attackBonus) || 0,
        customDamageBonus: parseInt(formData.customDamageBonus) || 0,
        overrideName: formData.overrideName || null,
        customDamageAbility: formData.customDamageAbility === AUTO_ABILITY ? null : formData.customDamageAbility,
        overrideAttackAbility: formData.overrideAttackAbility === AUTO_ABILITY ? null : formData.overrideAttackAbility,
        extraDamage,
        overrideDamageType: formData.overrideDamageType === BOOK_DAMAGE_TYPE ? null : formData.overrideDamageType,
        overrideNormalRange: parseRangeInput(formData.overrideNormalRange),
        overrideLongRange: parseRangeInput(formData.overrideLongRange),
      });

      if (res.success) {
        toast.success("Зброю оновлено");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Помилка при оновленні зброї");
      }
    });
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }
    
    startTransition(async () => {
      const res = await deleteWeapon(persWeapon.persWeaponId);
      if (res.success) {
        toast.success("Зброю видалено");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Помилка при видаленні зброї");
        setIsDeleting(false);
      }
    });
  };

  useEffect(() => {
    if (!open) setIsDeleting(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[90vh] max-w-md overflow-y-auto border-white/10 text-slate-50"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement)?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Налаштування зброї</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Назва (кастомна)</Label>
            <Input
              autoFocus={false}
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
                autoFocus={false}
                type="text"
                inputMode="numeric"
                value={formData.attackBonus}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^-?\d*$/.test(val)) {
                    setFormData({ ...formData, attackBonus: val });
                  }
                }}
                className="bg-white/5 border-white/10 text-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Бонус до шкоди</Label>
              <Input
                autoFocus={false}
                type="text"
                inputMode="numeric"
                value={formData.customDamageBonus}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^-?\d*$/.test(val)) {
                    setFormData({ ...formData, customDamageBonus: val });
                  }
                }}
                className="bg-white/5 border-white/10 text-slate-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weapon-damage-formula">Шкода</Label>
            <Input
              id="weapon-damage-formula"
              autoFocus={false}
              value={formData.customDamageDice}
              onChange={(e) => setFormData({ ...formData, customDamageDice: e.target.value })}
              className="bg-white/5 border-white/10"
              placeholder="Як у зброї"
              aria-describedby="weapon-damage-formula-hint"
            />
            <p id="weapon-damage-formula-hint" className="text-xs text-slate-400">
              Напр. 1к8, 1к6+СИЛ*2 або 1к8+СИЛ+СТА. Характеристики у формулі замінюють «Шкода від».
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AbilityField
              label="Атака від"
              autoLabel={formData.customDamageAbility === AUTO_ABILITY ? "Автоматично" : "Як шкода"}
              value={formData.overrideAttackAbility}
              onChange={(overrideAttackAbility) => setFormData({ ...formData, overrideAttackAbility })}
            />
            <AbilityField
              label="Шкода від"
              autoLabel={formData.overrideAttackAbility === AUTO_ABILITY ? "Автоматично" : "Як атака"}
              value={formData.customDamageAbility}
              onChange={(customDamageAbility) => setFormData({ ...formData, customDamageAbility })}
            />
          </div>

          <ExtraDamageFields value={formData.extraDamage} onChange={(extraDamage) => setFormData({ ...formData, extraDamage })} customTypes={customDamageTypes} />

          <div className="space-y-2">
            <Label>Тип шкоди</Label>
            <Select
              value={formData.overrideDamageType}
              onValueChange={(val) => setFormData({ ...formData, overrideDamageType: val as DamageType | typeof BOOK_DAMAGE_TYPE })}
            >
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BOOK_DAMAGE_TYPE}>
                  Як у книзі{persWeapon.weapon?.damageType ? ` (${damageTypeTranslations[persWeapon.weapon.damageType]})` : ""}
                </SelectItem>
                {Object.values(DamageType).map((damageType) => (
                  <SelectItem key={damageType} value={damageType}>
                    {damageTypeTranslations[damageType] ?? damageType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Дальність, фт</Label>
              <Input
                autoFocus={false}
                type="text"
                inputMode="numeric"
                value={formData.overrideNormalRange}
                onChange={(e) => /^\d*$/.test(e.target.value) && setFormData({ ...formData, overrideNormalRange: e.target.value })}
                className="bg-white/5 border-white/10 text-slate-50"
                placeholder={persWeapon.weapon?.normalRange ? String(persWeapon.weapon.normalRange) : "—"}
              />
            </div>
            <div className="space-y-2">
              <Label>Макс. дальність, фт</Label>
              <Input
                autoFocus={false}
                type="text"
                inputMode="numeric"
                value={formData.overrideLongRange}
                onChange={(e) => /^\d*$/.test(e.target.value) && setFormData({ ...formData, overrideLongRange: e.target.value })}
                className="bg-white/5 border-white/10 text-slate-50"
                placeholder={persWeapon.weapon?.longRange ? String(persWeapon.weapon.longRange) : "—"}
              />
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
            <Button 
                variant="destructive" 
                className={`gap-2 transition-all duration-300 ${isDeleting ? "bg-red-600 ring-2 ring-red-400 ring-offset-2" : ""}`} 
                onClick={handleDelete} 
                disabled={isPending}
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Впевнені?" : "Видалити"}
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-slate-200" onClick={handleSave} disabled={isPending}>
              Зберегти
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const BOOK_DAMAGE_TYPE = "BOOK" as const;
const AUTO_ABILITY = "AUTO" as const;
type AbilityChoice = Ability | typeof AUTO_ABILITY;

function AbilityField({ label, autoLabel, value, onChange }: { label: string; autoLabel: string; value: AbilityChoice; onChange: (value: AbilityChoice) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as AbilityChoice)}>
        <SelectTrigger className="bg-white/5 border-white/10" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUTO_ABILITY}>{autoLabel}</SelectItem>
          {Object.values(Ability).map((ability) => (
            <SelectItem key={ability} value={ability}>
              {attributesUkrFull[ability as keyof typeof attributesUkrFull] || ability}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type WeaponFormState = {
  overrideName: string;
  attackBonus: string;
  customDamageBonus: string;
  customDamageDice: string;
  customDamageAbility: AbilityChoice;
  overrideAttackAbility: AbilityChoice;
  extraDamage: ExtraDamageDraft[];
  overrideDamageType: DamageType | typeof BOOK_DAMAGE_TYPE;
  overrideNormalRange: string;
  overrideLongRange: string;
  isMagical: boolean;
  isProficient: boolean;
};

function buildWeaponFormState(persWeapon: PersWeaponWithWeapon): WeaponFormState {
  return {
    overrideName: persWeapon.overrideName || "",
    attackBonus: (persWeapon.attackBonus ?? 0).toString(),
    customDamageBonus: (persWeapon.customDamageBonus ?? 0).toString(),
    customDamageDice: persWeapon.customDamageDice || "",
    customDamageAbility: persWeapon.customDamageAbility ?? AUTO_ABILITY,
    overrideAttackAbility: persWeapon.overrideAttackAbility ?? AUTO_ABILITY,
    extraDamage: toExtraDamageDrafts(persWeapon.extraDamage),
    overrideDamageType: persWeapon.overrideDamageType ?? BOOK_DAMAGE_TYPE,
    overrideNormalRange: persWeapon.overrideNormalRange?.toString() ?? "",
    overrideLongRange: persWeapon.overrideLongRange?.toString() ?? "",
    isMagical: persWeapon.isMagical,
    isProficient: persWeapon.isProficient,
  };
}

function parseRangeInput(input: string): number | null {
  const range = parseInt(input);
  return range > 0 ? range : null;
}

"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { damageTypeTranslations } from "@/lib/refs/translation";
import { DAMAGE_TYPE_KEYS, type DamageTypeKey } from "@/rules/types";
import { EXTRA_DAMAGE_LIMIT, type ExtraDamageDraft } from "@/rules/weapon-profile";
import { parseDiceGroup } from "@/rules/weapon-damage-formula";

const CUSTOM_PREFIX = "custom:";

const toSelectValue = (row: ExtraDamageDraft) => row.damageType ?? `${CUSTOM_PREFIX}${row.customType ?? ""}`;
const fromSelectValue = (value: string): Pick<ExtraDamageDraft, "damageType" | "customType"> =>
  value.startsWith(CUSTOM_PREFIX) ? { damageType: null, customType: value.slice(CUSTOM_PREFIX.length) } : { damageType: value as DamageTypeKey, customType: undefined };

type Props = { value: ExtraDamageDraft[]; onChange: (value: ExtraDamageDraft[]) => void; customTypes?: readonly string[] };

export function ExtraDamageFields({ value, onChange, customTypes = [] }: Props) {
  const updateRow = (index: number, patch: Partial<ExtraDamageDraft>) => onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const customOptions = [...new Set([...customTypes, ...value.flatMap((row) => (row.customType ? [row.customType] : []))])];
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Додаткова шкода</legend>
      {value.map((row, index) => {
        const isInvalid = row.dice.trim() !== "" && !parseDiceGroup(row.dice);
        return (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={row.dice}
              onChange={(e) => updateRow(index, { dice: e.target.value })}
              aria-label={`Кубики додаткової шкоди ${index + 1}`}
              aria-invalid={isInvalid}
              placeholder="1к6"
              className={`w-20 bg-white/5 ${isInvalid ? "border-rose-400" : "border-white/10"}`}
            />
            <Select value={toSelectValue(row)} onValueChange={(next) => updateRow(index, fromSelectValue(next))}>
              <SelectTrigger className="flex-1 bg-white/5 border-white/10" aria-label={`Тип додаткової шкоди ${index + 1}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAMAGE_TYPE_KEYS.map((damageType) => (
                  <SelectItem key={damageType} value={damageType}>{damageTypeTranslations[damageType] ?? damageType}</SelectItem>
                ))}
                {customOptions.map((name) => (
                  <SelectItem key={name} value={`${CUSTOM_PREFIX}${name}`}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400" aria-label={`Прибрати додаткову шкоду ${index + 1}`} onClick={() => onChange(value.filter((_, i) => i !== index))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
      {value.length < EXTRA_DAMAGE_LIMIT && (
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-slate-300" onClick={() => onChange([...value, { dice: "1к6", damageType: "FIRE" }])}>
          <Plus className="h-4 w-4" />
          Додати тип шкоди
        </Button>
      )}
      {value.some((row) => row.dice.trim() !== "" && !parseDiceGroup(row.dice)) && <p className="text-xs text-rose-300">Пишіть кубики так: 1к6 або 2к8.</p>}
    </fieldset>
  );
}

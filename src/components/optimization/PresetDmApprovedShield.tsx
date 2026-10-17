"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function PresetShieldNote() {
  return <p className="mt-2 text-sm leading-relaxed text-slate-300">Понад стартовий набір класу: Щит (+2 до КБ) — з дозволу ДМа.</p>;
}

export function PresetShieldToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <Label htmlFor="preset-dm-approved-shield" className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700/70 bg-white/5 p-4">
    <Checkbox id="preset-dm-approved-shield" checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-1 h-5 w-5" aria-labelledby="preset-dm-approved-shield-title" aria-describedby="preset-dm-approved-shield-hint" />
    <span>
      <span id="preset-dm-approved-shield-title" className="block text-base text-white">Щит з дозволу ДМа</span>
      <span id="preset-dm-approved-shield-hint" className="mt-1 block text-sm leading-relaxed text-slate-400">Щита немає в стартовому наборі класу, але персонаж ним володіє, тож почне зі щитом (+2 до КБ), якщо ДМ не заперечує.</span>
    </span>
  </Label>;
}

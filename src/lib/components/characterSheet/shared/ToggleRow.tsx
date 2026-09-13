"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const ICON_LOOKS = {
  indigo: "bg-indigo-500 text-white",
  amber: "bg-amber-500 text-slate-900",
} as const;

type Props = {
  icon: LucideIcon;
  label: ReactNode;
  description: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  tone?: keyof typeof ICON_LOOKS;
};

export function ToggleRow({ icon: Icon, label, description, checked, onCheckedChange, disabled, tone = "indigo" }: Props) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-white/10">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${checked ? ICON_LOOKS[tone] : "bg-white/5 text-slate-400"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <Label className="font-bold text-slate-50 flex items-center gap-2">{label}</Label>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Minus, Plus, Settings } from "lucide-react";
import type { Ruleset } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  ruleset: Ruleset;
  heroicInspirationCount: number;
  canStackHeroicInspiration: boolean;
  gainsOnLongRest: boolean;
  disabled: boolean;
  isReadOnly: boolean;
  onCountChange: (next: number) => void;
  onCanStackChange: (next: boolean) => void;
};

export function HeroicInspirationRow({
  ruleset,
  heroicInspirationCount,
  canStackHeroicInspiration,
  gainsOnLongRest,
  disabled,
  isReadOnly,
  onCountChange,
  onCanStackChange,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const title = findInspirationTitle(ruleset);
  const hasInspiration = heroicInspirationCount > 0;

  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-800/60 border border-white/10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Налаштування: ${title}`}
          onClick={() => setSettingsOpen(true)}
          disabled={isReadOnly}
          className={`rounded-lg border p-2 transition disabled:cursor-default ${
            hasInspiration
              ? "border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
        <div>
          <Label className="font-bold text-slate-50">{title}</Label>
          <p className="text-xs text-slate-400">{describeInspiration({ ruleset, hasInspiration, gainsOnLongRest })}</p>
        </div>
      </div>

      {canStackHeroicInspiration ? (
        <InspirationCounter count={heroicInspirationCount} disabled={disabled} onChange={onCountChange} />
      ) : (
        <Switch checked={hasInspiration} onCheckedChange={(checked) => onCountChange(checked ? 1 : 0)} disabled={disabled} />
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription>За правилами натхнення одне: або є, або немає.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/40 p-3">
            <div>
              <Label htmlFor="can-stack-heroic-inspiration" className="font-semibold text-slate-50">
                Може стакатися
              </Label>
              <p className="text-xs text-slate-400">
                Натхнення накопичується: кожне нове, зокрема після довгого відпочинку, додає ще одне. Вимкнення лишає одне.
              </p>
            </div>
            <Switch
              id="can-stack-heroic-inspiration"
              checked={canStackHeroicInspiration}
              onCheckedChange={onCanStackChange}
              disabled={disabled}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InspirationCounter({ count, disabled, onChange }: { count: number; disabled: boolean; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="h-7 w-7"
        aria-label="Витратити натхнення"
        onClick={() => onChange(count - 1)}
        disabled={disabled || count <= 0}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <span className="min-w-6 text-center text-lg font-bold text-slate-50">{count}</span>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="h-7 w-7"
        aria-label="Додати натхнення"
        onClick={() => onChange(count + 1)}
        disabled={disabled}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}

function findInspirationTitle(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "Героїчне натхнення" : "Натхнення";
}

function describeInspiration({
  ruleset,
  hasInspiration,
  gainsOnLongRest,
}: {
  ruleset: Ruleset;
  hasInspiration: boolean;
  gainsOnLongRest: boolean;
}): string {
  if (hasInspiration) {
    return ruleset === "RULES_2024"
      ? "Витрать, щоб перекинути будь-який кубик одразу після кидка"
      : "Витрать, щоб отримати перевагу на кидку атаки, рятівному кидку чи перевірці навички";
  }
  return gainsOnLongRest ? "Немає — дає майстер або довгий відпочинок" : "Немає — дає майстер";
}

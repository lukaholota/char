"use client";

import { AlertTriangle, Check, HelpCircle, Plus, X } from "lucide-react";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { type BastionFacilityData, type BastionSpace, translateSpace } from "@/lib/bastion-facility";
import type { BastionFacilityMatch, BastionSpecialFacilityUsage } from "@/rules/bastions";
import { cn } from "@/lib/utils";

const MATCH_LOOKS = {
  met: {
    label: "Відповідає",
    icon: Check,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  unmet: {
    label: "Передумова не пройдена",
    icon: X,
    className: "border-red-500/30 bg-red-500/10 text-red-300",
  },
  campaign: {
    label: "Залежить від кампанії",
    icon: HelpCircle,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
} as const;

export function BastionMatchBadge({
  level,
  prerequisiteText,
  match,
}: {
  level: number | null;
  prerequisiteText: string;
  match: BastionFacilityMatch;
}) {
  const look = MATCH_LOOKS[match.status];
  const Icon = look.icon;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
            look.className
          )}
        >
          <Icon className="h-3 w-3" />
          {look.label}
        </span>
        {match.isAboveCharacterLevel ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Рівень {level}+
          </span>
        ) : null}
      </div>

      {match.status !== "met" && prerequisiteText ? (
        <FormattedDescription content={prerequisiteText} className="text-[11px] text-slate-400" />
      ) : null}
    </div>
  );
}

/// Каталог дає більше одного розміру лише 13 приміщенням із 61 — решті кнопка одна, і розмір
/// проставляє сервер.
export function BastionAddFacility({
  facility,
  isPending,
  onAdd,
}: {
  facility: BastionFacilityData;
  isPending: boolean;
  onAdd: (space: BastionSpace | undefined) => void;
}) {
  const spaces = facility.space.length > 1 ? facility.space : [];

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {spaces.length === 0 ? (
        <AddButton isPending={isPending} onClick={() => onAdd(undefined)}>
          Додати
        </AddButton>
      ) : (
        spaces.map((space) => (
          <AddButton key={space} isPending={isPending} onClick={() => onAdd(space)}>
            {translateSpace(space)}
          </AddButton>
        ))
      )}
    </div>
  );
}

function AddButton({
  isPending,
  onClick,
  children,
}: {
  isPending: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
    >
      <Plus className="h-3 w-3" />
      {children}
    </button>
  );
}

export function BastionPickerBanner({
  persName,
  characterLevel,
  usage,
}: {
  persName: string | null;
  characterLevel: number;
  usage: BastionSpecialFacilityUsage;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
      <span className="font-semibold text-slate-100">{persName ?? "Бастіон персонажа"}</span>
      <span className="text-slate-400">рівень {characterLevel}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold",
          usage.isOverLimit
            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
            : "border-white/10 bg-white/5 text-slate-300"
        )}
      >
        Спеціальних: {usage.used} / {usage.limit}
        {usage.isOverLimit ? <AlertTriangle className="h-3 w-3" /> : null}
      </span>
      {usage.isOverLimit ? (
        <span className="text-amber-200/80">
          За стандартними правилами на цьому рівні їх {usage.limit}
        </span>
      ) : null}
    </div>
  );
}

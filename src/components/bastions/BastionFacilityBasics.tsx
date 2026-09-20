"use client";

import { useTransition } from "react";
import { AlertTriangle, BookOpen, Info } from "lucide-react";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { toast } from "sonner";
import { replaceFacility, saveBastionMaintaining } from "@/lib/actions/bastion-actions";
import { BASTION_RULES_HREF, type BastionSpaceCode, toBastionSpace, translateSpace } from "@/lib/bastion-facility";
import {
  BASIC_FACILITY_COSTS,
  BASIC_FACILITY_ENLARGEMENT_COSTS,
  BASTION_BELOW_STANDARD_LEVEL_HINT,
  describeMaintainConflict,
  findMissingFreeBasicSpaces,
} from "@/rules/bastions";
import type { BastionFacilityView, BastionReplacementOption, BastionStanding } from "@/server/db/bastions";

export function BastionBasicFacilitiesHint({ views }: { views: readonly BastionFacilityView[] }) {
  const basicSpaces = views.filter((view) => view.match && !view.match.isSpecial).map((view) => toBastionSpace(view.space));
  const missing = findMissingFreeBasicSpaces(basicSpaces);

  return (
    <div className="space-y-2 text-sm">
      {missing.length > 0 ? (
        <p className="flex items-start gap-2 text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>
            Бастіон стартує з двох безкоштовних базових приміщень — тісного й просторого. Ще не додано:{" "}
            {missing.map((space) => translateSpace(space).toLowerCase()).join(" і ")}.
          </span>
        </p>
      ) : null}
      <details className="text-slate-400">
        <summary className="min-h-10 cursor-pointer select-none py-2 text-slate-300 hover:text-slate-100">
          Скільки коштують нові базові приміщення й збільшення
        </summary>
        <ul className="space-y-1 pb-1 pl-4">
          {BASIC_FACILITY_COSTS.map((cost) => (
            <li key={cost.space}>Нове {translateSpace(cost.space).toLowerCase()} — {formatCost(cost)}</li>
          ))}
          {BASIC_FACILITY_ENLARGEMENT_COSTS.map((cost) => (
            <li key={cost.to}>Збільшити: {translateSpace(cost.from).toLowerCase()} → {translateSpace(cost.to).toLowerCase()} — {formatCost(cost)}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function BastionRulesLink() {
  return (
    <ModeLink href={BASTION_RULES_HREF} className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200">
      <BookOpen className="h-3.5 w-3.5" />
      Правила бастіонів: ходи, накази, події
    </ModeLink>
  );
}

export function BastionFacilityKindLabel({ view }: { view: BastionFacilityView }) {
  const kind = !view.match ? null : view.match.isSpecial ? `Спеціальне · рівень ${view.level}+` : "Базове";

  return (
    <span className="text-xs text-slate-400">
      {kind ? `${kind} · ` : ""}
      {translateSpace(toBastionSpace(view.space))}
    </span>
  );
}

export function BastionFacilitySpaceSelect({
  view,
  value,
  onChange,
}: {
  view: BastionFacilityView;
  value: BastionSpaceCode;
  onChange: (space: BastionSpaceCode) => void;
}) {
  if (view.allowedSpaces.length < 2) return null;

  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-[0.08em] text-slate-400">Розмір</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as BastionSpaceCode)}
        className="w-full rounded-md border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
      >
        {view.allowedSpaces.map((space) => (
          <option key={space} value={space}>
            {translateSpace(toBastionSpace(space))}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BastionMaintainToggle({
  standing,
  views,
  onChanged,
}: {
  standing: BastionStanding;
  views: readonly BastionFacilityView[];
  onChanged: (next: BastionStanding) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isMaintaining = standing.bastion?.isMaintaining ?? false;
  const conflict = describeMaintainConflict({
    isMaintaining,
    orderedFacilityCount: views.filter((view) => view.currentOrder !== null).length,
  });

  const toggle = (next: boolean) => {
    startTransition(async () => {
      const result = await saveBastionMaintaining({ persId: standing.persId, isMaintaining: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChanged(result.standing);
    });
  };

  return (
    <div className="space-y-1">
      <label className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={isMaintaining}
          disabled={isPending}
          onChange={(event) => toggle(event.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
        Утримання — наказ усьому бастіону цього ходу
      </label>
      {conflict ? (
        <p className="flex items-start gap-1.5 text-sm text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {conflict}
        </p>
      ) : null}
    </div>
  );
}

/// Заміна тримає рядок: захисники, найманці й нотатки лишаються, наказ — якщо новому приміщенню його дають.
export function BastionFacilityReplaceSelect({
  persId,
  view,
  options,
  onReplaced,
}: {
  persId: number;
  view: BastionFacilityView;
  options: readonly BastionReplacementOption[];
  onReplaced: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  if (!view.match?.isSpecial || options.length === 0) return null;

  const replace = (slug: string) => {
    startTransition(async () => {
      const result = await replaceFacility({ persId, facilityId: view.facilityId, slug });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await onReplaced();
      toast.success("Приміщення замінено");
    });
  };

  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-[0.08em] text-slate-400">Замінити — одне приміщення за підвищення рівня</span>
      <select
        value=""
        disabled={isPending}
        onChange={(event) => replace(event.target.value)}
        className="w-full rounded-md border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
      >
        <option value="">Оберіть приміщення…</option>
        {options.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.name}
            {option.level ? ` · рівень ${option.level}+` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

/// Рівень підказує, а не забороняє (Р26): напис зʼявляється й тоді, коли бастіон уже створений.
export function BelowStandardLevelHint({ standing }: { standing: BastionStanding }) {
  if (!standing.access.isBelowStandardLevel) return null;

  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      {BASTION_BELOW_STANDARD_LEVEL_HINT}
    </p>
  );
}

function formatCost(cost: { gold: number; days: number }) {
  return `${cost.gold.toLocaleString("uk-UA")} зм і ${cost.days} днів`;
}

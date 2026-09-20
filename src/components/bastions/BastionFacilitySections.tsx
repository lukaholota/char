"use client";

import { AlertTriangle } from "lucide-react";
import { AddBastionFacilityDialog } from "@/components/bastions/AddBastionFacilityDialog";
import { BastionFacilityCard } from "@/components/bastions/BastionFacilityCard";
import { BastionBasicFacilitiesHint } from "@/components/bastions/BastionFacilityBasics";
import { bastionSectionClassName } from "@/components/bastions/bastion-field-styles";
import { cn } from "@/lib/utils";
import { describeSpecialFacilitySlots, findSpecialFacilityUsage } from "@/rules/bastions";
import type { BastionFacilityView, BastionPicker, BastionStanding } from "@/server/db/bastions";

export function BastionFacilitySections({
  standing,
  picker,
  onChanged,
}: {
  standing: BastionStanding;
  picker: BastionPicker | null;
  onChanged: () => Promise<void>;
}) {
  const views = picker?.facilityViews ?? [];
  const specialViews = views.filter(isListedAsSpecial);
  const basicViews = views.filter((view) => !isListedAsSpecial(view));
  const renderCards = (listed: readonly BastionFacilityView[]) => (
    <div className="divide-y divide-white/10">
      {listed.map((view) => (
        <BastionFacilityCard
          key={view.facilityId}
          persId={standing.persId}
          view={view}
          replacementOptions={picker?.replacementOptions ?? []}
          onChanged={onChanged}
        />
      ))}
    </div>
  );

  return (
    <>
      <section className={bastionSectionClassName} aria-labelledby="bastion-special-facilities">
        <BastionSectionHeading id="bastion-special-facilities" title="Спеціальні приміщення">
          <AddBastionFacilityDialog persId={standing.persId} persName={standing.persName} label="Додати спеціальне" onFacilityAdded={onChanged} />
        </BastionSectionHeading>
        <BastionSpecialFacilitySlots characterLevel={standing.characterLevel} used={picker?.specialCount ?? 0} />
        {specialViews.length > 0 ? renderCards(specialViews) : <p className="text-sm text-slate-400">Спеціальні приміщення дають бастіону накази: ремесло, дослідження, торгівлю, вербування.</p>}
      </section>

      <section className={bastionSectionClassName} aria-labelledby="bastion-basic-facilities">
        <BastionSectionHeading id="bastion-basic-facilities" title="Базові приміщення">
          <AddBastionFacilityDialog persId={standing.persId} persName={standing.persName} label="Додати базове" levelTab="BASIC" onFacilityAdded={onChanged} />
        </BastionSectionHeading>
        {basicViews.length > 0 ? renderCards(basicViews) : null}
        <BastionBasicFacilitiesHint views={basicViews} />
      </section>
    </>
  );
}

/// Рядок, чий слаґ зник із каталогу, типу вже не має (Р25) — показуємо його серед спеціальних, де його найімовірніше шукатимуть.
function isListedAsSpecial(view: BastionFacilityView): boolean {
  return view.match?.isSpecial ?? true;
}

function BastionSectionHeading({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-lg font-semibold text-slate-50">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function BastionSpecialFacilitySlots({ characterLevel, used }: { characterLevel: number; used: number }) {
  const slots = describeSpecialFacilitySlots({ ...findSpecialFacilityUsage({ characterLevel, used }), characterLevel });

  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", slots.isWarning ? "text-amber-300" : "text-slate-300")}>
      {slots.counter ? <span className="font-semibold tabular-nums">{slots.counter}</span> : null}
      {slots.isWarning ? <AlertTriangle className="h-4 w-4 shrink-0" /> : null}
      {slots.hint ? <span className={slots.isWarning ? "text-amber-200/90" : "text-slate-400"}>{slots.hint}</span> : null}
    </p>
  );
}

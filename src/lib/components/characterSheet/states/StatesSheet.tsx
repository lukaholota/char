"use client";

import { useState, type ReactNode } from "react";
import { Flame, Focus, Minus, Plus, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { listActiveStateParts } from "@/lib/logic/active-states";
import { describeStatePart, findStateSourceLabel, shortenSpellName } from "@/lib/logic/state-labels";
import { findExhaustionPart, MAX_EXHAUSTION_LEVEL } from "@/rules/exhaustion";
import { SPELL_BUFF_KEYS, findSpellBuffPart, type SpellBuffKey } from "@/rules/spell-buffs";
import type { StateEffects } from "@/rules/state-effects";
import { useSheetStatesContext } from "./SheetStatesContext";
import type { SheetStatesControl } from "./useSheetStates";

const BOTTOM_SHEET =
  "top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 gap-0 rounded-b-none border-x-0 border-b-0 bg-slate-950/95 p-0 pb-[env(safe-area-inset-bottom)] max-h-[88dvh] overflow-y-auto sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border";

/// Одне місце для всього, що діє на персонажа. Порядок — від «що зараз» до «що можна додати».
export function StatesSheet() {
  const control = useSheetStatesContext();
  if (!control) return null;

  return (
    <Dialog open={control.isPanelOpen} onOpenChange={control.setPanelOpen}>
      <DialogContent className={BOTTOM_SHEET}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden />
        <DialogHeader className="px-4 pb-1 pt-3 text-left">
          <DialogTitle className="text-lg">Стани</DialogTitle>
          <DialogDescription className="sr-only">Лист і кубики враховують усе, що тут увімкнено.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-4 pb-5 pt-2">
          <ActiveSection control={control} />
          <FeatureSection control={control} />
          <ExhaustionSection control={control} />
          <BuffSection control={control} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActiveSection({ control }: { control: SheetStatesControl }) {
  const parts = listActiveStateParts(control.pers);
  const findPart = (sourceKey: string) => parts.find((entry) => entry.sourceKey === sourceKey)?.part ?? {};
  const rows: ReactNode[] = [
    ...control.activeFeatures.map((feature) => (
      <ActiveRow
        key={`feature:${feature.featureId}`}
        icon={<Flame className="h-4 w-4 text-amber-300" />}
        title={feature.name}
        summary={describeStatePart(findPart(feature.engName))}
        endLabel={`Завершити: ${feature.name}`}
        onEnd={control.isReadOnly ? undefined : () => control.setFeatureActive(feature.featureId, false)}
      />
    )),
    ...(control.concentration ? [<ConcentrationRow key="concentration" control={control} findPart={findPart} />] : []),
    ...listStandaloneBuffKeys(control).map((key) => {
      const title = findStateSourceLabel(control.pers, key, control.catalog);
      const row = control.pers.effects.find((effect) => effect.effectKey === key);
      return (
        <ActiveRow
          key={`buff:${key}`}
          icon={<Sparkles className="h-4 w-4 text-sky-300" />}
          title={title}
          summary={[...describeStatePart(findPart(key)), ...(row?.endsWithConcentration ? ["тримається на концентрації"] : [])]}
          endLabel={`Завершити: ${title}`}
          onEnd={control.isReadOnly ? undefined : () => control.setBuff(key, false)}
        />
      );
    }),
  ];

  if (rows.length === 0) return null;
  return <SectionBlock title="Діє зараз">{rows}</SectionBlock>;
}

/// Баф, що тримається на концентрації, — один рядок із нею: хрестик знімає обидва.
function ConcentrationRow({ control, findPart }: { control: SheetStatesControl; findPart: (sourceKey: string) => Partial<StateEffects> }) {
  const name = shortenSpellName(control.concentration?.spell?.name ?? "Заклинання");
  const heldEffects = control.pers.effects.filter((row) => row.endsWithConcentration).flatMap((row) => describeStatePart(findPart(row.effectKey)));
  return (
    <ActiveRow
      icon={<Focus className="h-4 w-4 text-violet-300" />}
      title={`Концентрація · ${name}`}
      summary={[...heldEffects, "ряткидок Статури при шкоді"]}
      endLabel={`Завершити концентрацію на «${name}»`}
      onEnd={control.isReadOnly ? undefined : () => control.setConcentration(null)}
    />
  );
}

function listStandaloneBuffKeys(control: SheetStatesControl) {
  const held = new Set(control.pers.effects.filter((row) => row.endsWithConcentration).map((row) => row.effectKey));
  return control.activeBuffKeys.filter((key) => !held.has(key));
}

/// Підсумок Люті — п'ять речей; два рядки видно одразу, решта розгортається тапом.
function ActiveRow(props: { icon: ReactNode; title: string; summary: string[]; endLabel: string; onEnd?: () => void }) {
  const [isExpanded, setExpanded] = useState(false);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="mt-0.5 shrink-0">{props.icon}</div>
      <button type="button" onClick={() => setExpanded(!isExpanded)} aria-expanded={isExpanded} className="min-w-0 flex-1 text-left">
        <div className="text-sm font-semibold text-slate-50">{props.title}</div>
        {props.summary.length > 0 ? (
          <div className={cn("mt-0.5 text-xs leading-snug text-slate-400", !isExpanded && "line-clamp-2")}>{props.summary.join(" · ")}</div>
        ) : null}
      </button>
      {props.onEnd ? (
        <button type="button" onClick={props.onEnd} aria-label={props.endLabel} className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-slate-100">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function FeatureSection({ control }: { control: SheetStatesControl }) {
  const available = control.toggleableFeatures.filter((feature) => !control.isFeatureActive(feature.featureId));
  if (available.length === 0 || control.isReadOnly) return null;

  return (
    <SectionBlock title="Риси">
      <div className="flex flex-wrap gap-2">
        {available.map((feature) => {
          const uses = control.findFeatureUses(feature.featureId);
          const isDisabled = !control.canActivateFeature(feature.featureId) || (uses !== null && uses.remaining < 1);
          return (
            <button
              key={feature.featureId}
              type="button"
              disabled={isDisabled}
              onClick={() => control.setFeatureActive(feature.featureId, true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 text-sm font-semibold text-amber-100 transition active:scale-95 disabled:opacity-40"
            >
              <Flame className="h-4 w-4" aria-hidden />
              {feature.name}
              {uses ? <span className="text-xs font-normal text-amber-200/70">{uses.remaining}/{uses.max}</span> : null}
            </button>
          );
        })}
      </div>
    </SectionBlock>
  );
}

function ExhaustionSection({ control }: { control: SheetStatesControl }) {
  const level = control.exhaustionLevel;
  const part = findExhaustionPart(level, control.pers.ruleset);
  const summary = part ? describeStatePart(part).join(" · ") : "немає";
  if (control.isReadOnly && level === 0) return null;

  return (
    <SectionBlock title="Виснаження">
      <div className={cn("flex items-center gap-3 rounded-xl border px-3 py-2", level > 0 ? "border-rose-400/30 bg-rose-500/10" : "border-white/10 bg-white/[0.03]")}>
        <div className="min-w-0 flex-1 text-xs leading-snug text-slate-300">{summary}</div>
        {control.isReadOnly ? (
          <span className="text-lg font-bold tabular-nums text-slate-50">{level}</span>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <StepButton label="Зменшити виснаження" disabled={level <= 0} onClick={() => control.setExhaustion(level - 1)}>
              <Minus className="h-4 w-4" />
            </StepButton>
            <span className="w-6 text-center text-lg font-bold tabular-nums text-slate-50" aria-live="polite">{level}</span>
            <StepButton label="Збільшити виснаження" disabled={level >= MAX_EXHAUSTION_LEVEL} onClick={() => control.setExhaustion(level + 1)}>
              <Plus className="h-4 w-4" />
            </StepButton>
          </div>
        )}
      </div>
    </SectionBlock>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-100 transition active:scale-95 disabled:opacity-30">
      {children}
    </button>
  );
}

function BuffSection({ control }: { control: SheetStatesControl }) {
  if (control.isReadOnly) return null;
  const keys = SPELL_BUFF_KEYS.filter((key) => control.catalog.some((entry) => entry.key === key));

  return (
    <SectionBlock title="Заклинання на мені" hint="Наклав союзник або ти сам поза листом — натисни, щоб увімкнути">
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((key) => (
          <BuffTile key={key} buffKey={key} control={control} />
        ))}
      </div>
    </SectionBlock>
  );
}

function BuffTile({ buffKey, control }: { buffKey: SpellBuffKey; control: SheetStatesControl }) {
  const isActive = control.activeBuffKeys.includes(buffKey);
  const label = findStateSourceLabel(control.pers, buffKey, control.catalog);
  const effect = describeStatePart(findSpellBuffPart(buffKey, control.pers.ruleset))[0] ?? "";
  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={`${label}: ${effect}`}
      onClick={() => control.setBuff(buffKey, !isActive)}
      className={cn(
        "flex min-h-14 flex-col items-start justify-center rounded-xl border px-2 py-1.5 text-left transition active:scale-95",
        isActive ? "border-sky-400/60 bg-sky-500/20" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
      )}
    >
      <span className={cn("line-clamp-2 text-[12px] font-semibold leading-tight", isActive ? "text-sky-50" : "text-slate-100")}>{label}</span>
      <span className="mt-0.5 line-clamp-1 text-[10px] leading-tight text-slate-400">{effect}</span>
    </button>
  );
}

function SectionBlock({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>
        {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

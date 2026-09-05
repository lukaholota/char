"use client";

import { Footprints, Languages, Ruler, ScrollText, TrendingUp } from "lucide-react";

import type { RaceBranch, RaceData, RaceTrait } from "@/lib/racesData";
import { RACE_SINGULAR } from "@/lib/refs/race-labels";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { cn } from "@/lib/utils";

export function RaceDetailCard({ race, is2024 = false }: { race: RaceData; is2024?: boolean }) {
  return (
    <div
      className={cn(
        "glass-card max-w-full overflow-hidden break-words rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl sm:p-6",
        is2024
          ? "shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20"
          : "shadow-[0_0_30px_rgba(141,99,238,0.08)] ring-1 ring-white/10",
      )}
    >
      <Header race={race} is2024={is2024} />
      <MetaGrid race={race} />

      {race.traits.length > 0 ? (
        <Section title={`Риси ${is2024 ? "виду" : "раси"}`}>
          <TraitList traits={race.traits} />
        </Section>
      ) : null}

      <BranchSection title="Підраси" branches={race.subraces} />
      <BranchSection title="Варіанти" branches={race.variants} />
    </div>
  );
}

function Header({ race, is2024 }: { race: RaceData; is2024: boolean }) {
  return (
    <div className="flex items-start gap-4">
      {race.imageSrc ? (
        <div className="hidden h-28 w-28 shrink-0 sm:block">
          <FramedIllustration
            src={race.imageSrc}
            alt={race.name}
            sizes="112px"
            chamfer="sm"
            vignette="md"
            imageClassName="object-top"
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            "font-rpg-display text-xl uppercase tracking-wide sm:text-2xl",
            is2024 ? "text-amber-200" : "text-arcane-200",
          )}
        >
          {race.name}
        </h1>
        <p className="mt-0.5 font-mono text-xs text-slate-500">[{race.engName}]</p>
        <p className="mt-2 text-xs text-slate-400">
          {RACE_SINGULAR[race.ruleset]} · {race.source}
        </p>
      </div>
    </div>
  );
}

function MetaGrid({ race }: { race: RaceData }) {
  const speed = [`${race.speed} футів`, ...race.extraSpeeds.map((s) => `${s.label} ${s.value} футів`)];
  const languages = race.languagesToChooseCount
    ? [...race.languages, `+${race.languagesToChooseCount} на вибір`]
    : race.languages;

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <MetaCell icon={Ruler} label="Розмір" value={race.sizes.join(" / ") || "—"} />
      <MetaCell icon={Footprints} label="Швидкість" value={speed.join(", ")} />
      <MetaCell icon={Languages} label="Мови" value={languages.join(", ") || "—"} />
      <MetaCell
        icon={TrendingUp}
        label="Бонуси характеристик"
        value={race.asiSummary}
        className="sm:col-span-3"
      />
    </div>
  );
}

function MetaCell({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2", className)}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-200">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel mt-4 max-w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      {children}
    </div>
  );
}

function BranchSection({ title, branches }: { title: string; branches: RaceBranch[] }) {
  if (branches.length === 0) return null;

  return (
    <Section title={`${title} (${branches.length})`}>
      <div className="space-y-4">
        {branches.map((branch) => (
          <div key={branch.key}>
            <div className="flex items-baseline gap-2">
              <ScrollText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="text-sm font-semibold text-slate-100">{branch.name}</span>
              <span className="font-mono text-[11px] text-slate-500">[{branch.engName}]</span>
            </div>
            {branch.traits.length > 0 ? (
              <div className="mt-2 pl-5">
                <TraitList traits={branch.traits} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}

function TraitList({ traits }: { traits: RaceTrait[] }) {
  return (
    <div className="space-y-3">
      {traits.map((trait) => (
        <div key={`${trait.engName}-${trait.name}`}>
          <div className="text-sm font-semibold text-slate-100">{trait.name}</div>
          <FormattedDescription
            content={trait.description}
            className="mt-1 text-sm leading-relaxed text-slate-300"
          />
        </div>
      ))}
    </div>
  );
}

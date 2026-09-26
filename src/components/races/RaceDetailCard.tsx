"use client";

import { Footprints, Languages, Ruler, TrendingUp } from "lucide-react";

import type { RaceBranch, RaceData } from "@/lib/racesData";
import { RACE_SINGULAR } from "@/lib/refs/race-labels";
import { findBranchKey, type RaceBranchKind, type RaceSection } from "@/lib/catalogs/reading-target";
import { buildTraitEntries } from "@/lib/catalogs/reading-entries";
import { CatalogProse } from "@/components/catalogs/CatalogProse";
import { BranchCardGrid, type BranchCard } from "@/components/catalogs/reading/BranchCardGrid";
import { MissingTargetNotice } from "@/components/catalogs/reading/MissingTargetNotice";
import { ReadingEntryList } from "@/components/catalogs/reading/ReadingEntryList";
import { ReadingSectionTabs, type ReadingSection } from "@/components/catalogs/reading/ReadingSectionTabs";
import type { ReadingActions, ReadingView } from "@/components/catalogs/reading/reading-view";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

export const BRANCH_KIND_LABELS: Record<RaceBranchKind, string> = { subrace: "Підраса", variant: "Варіант" };

const TRAIT_FORMS = ["риса", "риси", "рис"] as const;

export function RaceDetailCard({
  race,
  is2024 = false,
  view,
  actions,
}: {
  race: RaceData;
  is2024?: boolean;
  view: ReadingView<RaceSection>;
  actions: ReadingActions<RaceSection>;
}) {
  return (
    <div
      className={cn(
        "glass-card max-w-full overflow-hidden break-words rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl sm:p-6",
        findAccentVariant(is2024, { prism: "shadow-[0_0_30px_rgba(192,74,224,0.08)] ring-1 ring-prism-500/20", arcane: "shadow-[0_0_30px_rgba(141,99,238,0.08)] ring-1 ring-white/10" }),
      )}
    >
      <Header race={race} is2024={is2024} />
      {view.missing ? (
        <MissingTargetNotice
          message={view.missing === "branch" ? "Такої підраси чи варіанта тут немає." : "Такої риси тут немає."}
          actionLabel={is2024 ? "До виду" : "До раси"}
          onAction={actions.onDismissMissing}
        />
      ) : null}
      <ReadingSectionTabs
        label={`Розділи: ${race.name}`}
        sections={buildSections(race, is2024, view, actions)}
        value={view.section}
        onValueChange={actions.onSectionChange}
        is2024={is2024}
      />
    </div>
  );
}

function buildSections(
  race: RaceData,
  is2024: boolean,
  view: ReadingView<RaceSection>,
  actions: ReadingActions<RaceSection>,
): ReadingSection<RaceSection>[] {
  const sections: ReadingSection<RaceSection>[] = [
    {
      value: "overview",
      label: "Огляд",
      content: (
        <>
          <CatalogProse content={race.description} />
          <MetaGrid race={race} />
        </>
      ),
    },
  ];
  if (race.traits.length > 0) {
    sections.push({
      value: "traits",
      label: `Риси (${race.traits.length})`,
      content: (
        <ReadingEntryList
          entries={buildTraitEntries(race.traits)}
          targetKey={view.featureKey}
          focusRequest={view.focusRequest}
          is2024={is2024}
          isExpandedByDefault
        />
      ),
    });
  }
  const branchCount = race.subraces.length + race.variants.length;
  if (branchCount > 0) {
    sections.push({
      value: "branches",
      label: `${findBranchSectionTitle(race)} (${branchCount})`,
      content: <BranchCardGrid cards={buildBranchCards(race)} is2024={is2024} onOpen={actions.onOpenBranch} />,
    });
  }
  return sections;
}

export function buildBranchCardKey(kind: RaceBranchKind, branch: RaceBranch): string {
  return `${kind}:${findBranchKey(branch)}`;
}

function buildBranchCards(race: RaceData): BranchCard[] {
  const toCard = (kind: RaceBranchKind) => (branch: RaceBranch): BranchCard => ({
    key: buildBranchCardKey(kind, branch),
    name: branch.name,
    engName: branch.engName,
    kindLabel: BRANCH_KIND_LABELS[kind],
    sourceLabel: null,
    entryCount: branch.traits.length,
    entryCountForms: TRAIT_FORMS,
    description: branch.description,
  });
  return [...race.subraces.map(toCard("subrace")), ...race.variants.map(toCard("variant"))];
}

function findBranchSectionTitle(race: RaceData) {
  if (race.subraces.length > 0 && race.variants.length > 0) return "Підраси й варіанти";
  return race.subraces.length > 0 ? "Підраси" : "Варіанти";
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
            findAccentVariant(is2024, { prism: "text-prism-200", arcane: "text-arcane-200" }),
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

"use client";

import type { BackgroundData } from "@/lib/backgroundsData";
import { abilityTranslations, sourceTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { cn } from "@/lib/utils";
import { Award, Languages, Sparkles, Wrench } from "lucide-react";
import { EquipmentOptionCard } from "@/lib/components/characterCreator/EquipmentOptionCard";
import {
  buildChoiceHeading,
  buildItemLines,
  formatVariantTitle,
} from "@/lib/components/characterCreator/equipment-choices";
import { findBackgroundStartingItems, hasGoldAlternative } from "@/rules/background-equipment";
import { findAccentVariant } from "@/styles/edition-accent";
import { EditionAccentChip } from "@/components/ui/EditionAccent";

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-xs sm:text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
      <span className="shrink-0 text-slate-400">{label}:</span>
      <span className="min-w-0 flex-1 text-slate-200">{children}</span>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 max-w-full overflow-hidden">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      {children}
    </div>
  );
}

function StartingEquipmentBlock({ background }: { background: BackgroundData }) {
  const equipment = { items: background.equipmentItems, grantsGoldInstead: background.grantsGoldInstead };
  const items = findBackgroundStartingItems(equipment, "EQUIPMENT");
  if (items.length === 0) return null;

  if (!hasGoldAlternative(equipment)) {
    return (
      <SectionBlock title="Стартове спорядження">
        <EquipmentOptionCard radioName={`equipment-${background.slug}`} lines={buildItemLines(items)} selected={false} />
      </SectionBlock>
    );
  }

  const gold = findBackgroundStartingItems(equipment, "GOLD");

  return (
    <SectionBlock title="Стартове спорядження">
      <p className="mb-2 text-sm font-semibold text-white">{buildChoiceHeading(["a", "b"])}</p>
      <div className="space-y-2">
        <EquipmentOptionCard
          radioName={`equipment-${background.slug}`}
          title={`${formatVariantTitle("a")}: пакунок спорядження`}
          lines={buildItemLines(items)}
          selected={false}
        />
        <EquipmentOptionCard
          radioName={`equipment-${background.slug}`}
          title={`${formatVariantTitle("b")}: гроші замість пакунка`}
          lines={buildItemLines(gold)}
          selected={false}
        />
      </div>
    </SectionBlock>
  );
}

/// Риса походження — найбільше, що дає передісторія 2024, тож її текст іде першим блоком:
/// у плашках вище стоїть лише назва, а по неї гравець і приходить.
function OriginFeatBlock({ background, is2024 }: { background: BackgroundData; is2024: boolean }) {
  const feat = background.originFeat;
  if (!feat?.description) return null;

  return (
    <SectionBlock title="Риса походження">
      <p className={cn("text-sm font-semibold", findAccentVariant(is2024, { prism: "text-prism-200", arcane: "text-arcane-200" }))}>
        {feat.nameUa} <span className="font-mono text-xs text-slate-500">[{feat.engName}]</span>
      </p>
      <FormattedDescription
        content={feat.description}
        className="mt-1.5 space-y-2 break-words text-xs leading-relaxed text-slate-300 sm:text-sm"
      />
    </SectionBlock>
  );
}

function findSkillsLabel(background: BackgroundData): string | null {
  const fixed = background.skills.map((s) => s.nameUa);
  if (background.skillChoiceCount > 0) {
    const choice = `будь-які ${background.skillChoiceCount} на вибір`;
    return fixed.length > 0 ? `${fixed.join(", ")}, ${choice}` : choice;
  }
  return fixed.length > 0 ? fixed.join(", ") : null;
}

export function BackgroundDetailCard({
  background,
  is2024 = false,
}: {
  background: BackgroundData;
  is2024?: boolean;
}) {
  const sourceLabel =
    sourceTranslations[background.source as keyof typeof sourceTranslations] || background.source;
  const skillsLabel = findSkillsLabel(background);
  const abilityLabels = background.abilityOptions.map((a) => abilityTranslations[a] || a);

  return (
    <div
      className={cn(
        "glass-card border border-white/10 bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xl break-words max-w-full overflow-hidden rounded-2xl",
        findAccentVariant(is2024, { prism: "shadow-[0_0_30px_rgba(192,74,224,0.08)] ring-1 ring-prism-500/20", arcane: "shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10" })
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {background.imageSrc ? (
          <div className="hidden h-28 w-28 shrink-0 sm:block">
            <FramedIllustration
              src={background.imageSrc}
              alt={background.name}
              sizes="112px"
              chamfer="sm"
              vignette="md"
              imageClassName="object-top"
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className={cn(
                "font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-transparent bg-clip-text",
                findAccentVariant(is2024, { prism: "bg-gradient-to-r from-prism-300 via-prism-200 to-prism-500", arcane: "bg-gradient-to-r from-arcane-300 via-arcane-100 to-violet-300" })
              )}
            >
              {background.name}
            </h1>
            {is2024 && (
              <EditionAccentChip edition="2024">2024</EditionAccentChip>
            )}
          </div>
          <div className="mt-0.5 font-mono text-xs text-slate-400">[{background.engName}]</div>
        </div>

        <div
          className={cn(
            "shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium",
            findAccentVariant(is2024, { prism: "border-prism-500/30 bg-prism-500/10 text-prism-300", arcane: "border-arcane-500/30 bg-arcane-500/10 text-arcane-300" })
          )}
        >
          {sourceLabel}
        </div>
      </div>

      <div className="mt-4 space-y-2 border-y border-white/10 py-3">
        {abilityLabels.length > 0 && (
          <MetaRow icon={Sparkles} label="Характеристики на вибір">
            {abilityLabels.join(" / ")}
          </MetaRow>
        )}

        {skillsLabel && (
          <MetaRow icon={Award} label="Навички">
            {skillsLabel}
          </MetaRow>
        )}

        {background.tools.length > 0 && (
          <MetaRow icon={Wrench} label="Інструменти">
            {background.tools.join(", ")}
          </MetaRow>
        )}

        {background.languagesToChooseCount > 0 && (
          <MetaRow icon={Languages} label="Мови">
            {background.languagesToChooseCount} на вибір
          </MetaRow>
        )}

        {background.originFeat && (
          <MetaRow icon={Sparkles} label="Риса походження">
            <span className={findAccentVariant(is2024, { prism: "text-prism-200", arcane: "text-arcane-200" })}>
              {background.originFeat.nameUa}
            </span>{" "}
            <span className="font-mono text-xs text-slate-500">[{background.originFeat.engName}]</span>
          </MetaRow>
        )}
      </div>

      <OriginFeatBlock background={background} is2024={is2024} />

      <StartingEquipmentBlock background={background} />

      <SectionBlock title={background.specialAbilityName || "Опис"}>
        <FormattedDescription
          content={background.description}
          className="space-y-2 break-words text-xs leading-relaxed text-slate-300 sm:text-sm"
        />
      </SectionBlock>
    </div>
  );
}

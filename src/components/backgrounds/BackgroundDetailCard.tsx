"use client";

import { BackgroundData } from "@/lib/backgroundsData";
import { abilityTranslations, sourceTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { cn } from "@/lib/utils";
import { Award, Coins, Languages, Package, Sparkles, Wrench } from "lucide-react";

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
        is2024
          ? "shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20"
          : "shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className={cn(
                "font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-transparent bg-clip-text",
                is2024
                  ? "bg-gradient-to-r from-amber-300 via-amber-200 to-amber-500"
                  : "bg-gradient-to-r from-teal-300 via-teal-100 to-violet-300"
              )}
            >
              {background.name}
            </h1>
            {is2024 && (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                2024
              </span>
            )}
          </div>
          <div className="mt-0.5 font-mono text-xs text-slate-400">[{background.engName}]</div>
        </div>

        <div
          className={cn(
            "shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium",
            is2024
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-teal-500/30 bg-teal-500/10 text-teal-300"
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
            <span className={is2024 ? "text-amber-200" : "text-teal-200"}>
              {background.originFeat.nameUa}
            </span>{" "}
            <span className="font-mono text-xs text-slate-500">[{background.originFeat.engName}]</span>
          </MetaRow>
        )}
      </div>

      {background.equipmentItems.length > 0 && (
        <SectionBlock title="Спорядження">
          <ul className="grid gap-1 text-xs text-slate-300 sm:text-sm">
            {background.equipmentItems.map((item) => (
              <li key={item.name} className="flex items-start gap-2">
                <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span>
                  {item.name}
                  {item.quantity > 1 && <span className="text-slate-400"> ×{item.quantity}</span>}
                </span>
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}

      {background.equipmentEngText && (
        <SectionBlock title="Спорядження (мовою оригіналу)">
          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">{background.equipmentEngText}</p>
          {background.grantsGoldInstead && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
              <Coins className="h-3.5 w-3.5" />
              Або {background.grantsGoldInstead} зм замість спорядження
            </p>
          )}
        </SectionBlock>
      )}

      <SectionBlock title={background.specialAbilityName || "Опис"}>
        <FormattedDescription
          content={background.description}
          className="space-y-2 break-words text-xs leading-relaxed text-slate-300 sm:text-sm"
        />
      </SectionBlock>
    </div>
  );
}

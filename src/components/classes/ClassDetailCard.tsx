"use client";

import { Dices, Shield, Sparkles, Wrench } from "lucide-react";

import type { ClassData, ClassFeature } from "@/lib/classesData";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { useIsArtHidden } from "@/components/no-ai/ContentImage";
import { cn } from "@/lib/utils";
import { sourceTranslations } from "@/lib/refs/translation";

export function ClassDetailCard({
  characterClass,
  is2024 = false,
}: {
  characterClass: ClassData;
  is2024?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-card max-w-full overflow-hidden break-words rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl sm:p-6",
        is2024
          ? "shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20"
          : "shadow-[0_0_30px_rgba(141,99,238,0.08)] ring-1 ring-white/10",
      )}
    >
      <Header characterClass={characterClass} is2024={is2024} />
      <MetaGrid characterClass={characterClass} />

      {characterClass.features.length > 0 ? (
        <Section title={`Здібності класу (${characterClass.features.length})`}>
          <FeatureList features={characterClass.features} />
        </Section>
      ) : null}

      {characterClass.subclasses.length > 0 ? (
        <Section
          title={`Підкласи (${characterClass.subclasses.length}) · з ${characterClass.subclassLevel} рівня`}
        >
          <div className="space-y-5">
            {characterClass.subclasses.map((subclass) => (
              <div key={subclass.key}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-100">{subclass.name}</span>
                  <span className="font-mono text-[11px] text-slate-500">[{subclass.engName}]</span>
                  {subclass.source ? (
                    <span className="text-[11px] text-slate-400">
                      {sourceTranslations[subclass.source] ?? subclass.source}
                    </span>
                  ) : null}
                </div>
                {subclass.description ? (
                  <FormattedDescription
                    content={subclass.description}
                    className="mt-1 text-sm leading-relaxed text-slate-300"
                  />
                ) : null}
                {subclass.features.length > 0 ? (
                  <div className="mt-2 pl-3">
                    <FeatureList features={subclass.features} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Header({ characterClass, is2024 }: { characterClass: ClassData; is2024: boolean }) {
  const isArtHidden = useIsArtHidden(characterClass.imageSrc);

  return (
    <div className="flex items-start gap-4">
      {characterClass.imageSrc && !isArtHidden ? (
        <div className="hidden h-28 w-28 shrink-0 sm:block">
          <FramedIllustration
            src={characterClass.imageSrc}
            alt={characterClass.name}
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
          {characterClass.name}
        </h1>
        <p className="mt-0.5 font-mono text-xs text-slate-500">[{characterClass.engName}]</p>
        <p className="mt-2 text-xs text-slate-400">
          Кістка здоровʼя к{characterClass.hitDie} · Підклас з {characterClass.subclassLevel} рівня
        </p>
      </div>
    </div>
  );
}

function MetaGrid({ characterClass }: { characterClass: ClassData }) {
  const skills = characterClass.skillChoices.count
    ? `${characterClass.skillChoices.count} з: ${characterClass.skillChoices.options.join(", ")}`
    : "—";
  const casting = characterClass.spellcasting
    ? `${characterClass.spellcasting}${characterClass.castingStat ? ` · ${characterClass.castingStat}` : ""}`
    : "Немає";

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <MetaCell icon={Dices} label="Рятівні кидки" value={characterClass.savingThrows.join(", ") || "—"} />
      <MetaCell icon={Sparkles} label="Чаротворення" value={casting} />
      <MetaCell
        icon={Shield}
        label="Обладунки"
        value={characterClass.armorProficiencies.join(", ") || "—"}
      />
      <MetaCell
        icon={Wrench}
        label="Інструменти"
        value={characterClass.toolProficiencies.join(", ") || "—"}
      />
      <div className="sm:col-span-2">
        <MetaCell icon={Sparkles} label="Навички" value={skills} />
      </div>
    </div>
  );
}

function MetaCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
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

function FeatureList({ features }: { features: ClassFeature[] }) {
  return (
    <div className="space-y-3">
      {features.map((feature) => (
        <div key={`${feature.level}-${feature.engName}-${feature.name}`}>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
              {feature.level} рів.
            </span>
            <span className="text-sm font-semibold text-slate-100">{feature.name}</span>
          </div>
          <FormattedDescription
            content={feature.description}
            className="mt-1 text-sm leading-relaxed text-slate-300"
          />
        </div>
      ))}
    </div>
  );
}

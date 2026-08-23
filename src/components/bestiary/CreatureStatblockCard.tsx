"use client";

import { ContentImage } from "@/components/no-ai/ContentImage";
import { CreatureData } from "@/lib/bestiaryData";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { sourceTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";
import { Shield, Heart, Zap, Swords } from "lucide-react";

export function CreatureStatblockCard({
  creature,
  is2024 = false,
}: {
  creature: CreatureData;
  is2024?: boolean;
}) {
  const sourceLabel = sourceTranslations[creature.source as keyof typeof sourceTranslations] || creature.source;

  const abilities = [
    { label: "СИЛ", eng: "STR", val: creature.strength || "10 (+0)" },
    { label: "СПР", eng: "DEX", val: creature.dexterity || "10 (+0)" },
    { label: "ТІЛ", eng: "CON", val: creature.constitution || "10 (+0)" },
    { label: "ІНТ", eng: "INT", val: creature.intelligence || "10 (+0)" },
    { label: "МУД", eng: "WIS", val: creature.wisdom || "10 (+0)" },
    { label: "ХАР", eng: "CHA", val: creature.charisma || "10 (+0)" },
  ];

  return (
    <div
      className={cn(
        "glass-card border border-white/10 bg-slate-950/70 p-4 sm:p-6 backdrop-blur-xl break-words max-w-full overflow-hidden rounded-2xl",
        is2024
          ? "shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20"
          : "shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10"
      )}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={cn(
                "font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-transparent bg-clip-text",
                is2024
                  ? "bg-gradient-to-r from-amber-300 via-amber-200 to-amber-500"
                  : "bg-gradient-to-r from-teal-300 via-teal-100 to-violet-300"
              )}
            >
              {creature.name}
            </h1>
            {is2024 && (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                2024
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 italic mt-0.5">
            {[creature.size, creature.type, creature.alignment].filter(Boolean).join(", ")}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">[{creature.nameEng}]</div>
        </div>

        {/* Source Badge */}
        <div
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium border",
            is2024
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-teal-500/30 bg-teal-500/10 text-teal-300"
          )}
        >
          {sourceLabel}
        </div>
      </div>

      {creature.imageUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-900/40">
          <ContentImage
            src={creature.imageUrl}
            alt={creature.name}
            provenance="manual"
            width={640}
            height={480}
            unoptimized
            loading="lazy"
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      {/* Basic Combat Stats (AC, HP, Initiative, Speed) */}
      <div
        className={cn(
          "mt-3 grid grid-cols-1 gap-2",
          creature.initiative ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
        )}
      >
        <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-slate-900/40 p-2.5 glass-panel">
          <Shield className={cn("h-5 w-5 shrink-0", is2024 ? "text-amber-400" : "text-teal-400")} />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Клас обладунку</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{creature.ac || "10"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-slate-900/40 p-2.5 glass-panel">
          <Heart className="h-5 w-5 shrink-0 text-rose-400" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Хіт-поінти</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{creature.hp || "10"}</div>
          </div>
        </div>

        {creature.initiative && (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-slate-900/40 p-2.5 glass-panel">
            <Swords className="h-5 w-5 shrink-0 text-violet-400" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Ініціатива</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{creature.initiative}</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-slate-900/40 p-2.5 glass-panel">
          <Zap className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Швидкість</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{creature.speed || "30 фт."}</div>
          </div>
        </div>
      </div>

      {/* Ability Scores Table */}
      <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/50 p-2 sm:p-3 glass-panel">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 text-center">
          {abilities.map((ab) => (
            <div key={ab.eng} className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">{ab.label}</span>
              <span className="text-[9px] font-mono text-slate-500 hidden sm:block">[{ab.eng}]</span>
              <span
                className={cn(
                  "mt-0.5 text-xs sm:text-sm font-semibold",
                  is2024 ? "text-amber-200" : "text-teal-200"
                )}
              >
                {ab.val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Meta: Saves, Skills, Senses, Languages, CR */}
      <div className="mt-3.5 border-y border-white/10 py-3 text-xs sm:text-sm text-slate-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {creature.savingThrows && (
            <div>
              <span className="font-semibold text-slate-400">Рятівні кидки:</span> {creature.savingThrows}
            </div>
          )}
          {creature.skills && (
            <div>
              <span className="font-semibold text-slate-400">Навички:</span> {creature.skills}
            </div>
          )}
          {creature.gear && (
            <div>
              <span className="font-semibold text-slate-400">Спорядження:</span> {creature.gear}
            </div>
          )}
          {creature.damageVulnerability && (
            <div>
              <span className="font-semibold text-slate-400">Вразливість до ушкоджень:</span>{" "}
              {creature.damageVulnerability}
            </div>
          )}
          {creature.damageResistance && (
            <div>
              <span className="font-semibold text-slate-400">Опір до ушкоджень:</span> {creature.damageResistance}
            </div>
          )}
          {creature.damageImmunity && (
            <div>
              <span className="font-semibold text-slate-400">Імунітет до ушкоджень:</span> {creature.damageImmunity}
            </div>
          )}
          {creature.conditionImmunity && (
            <div>
              <span className="font-semibold text-slate-400">Імунітет до станів:</span> {creature.conditionImmunity}
            </div>
          )}
          {creature.senses && (
            <div>
              <span className="font-semibold text-slate-400">Чуття:</span> {creature.senses}
            </div>
          )}
          {creature.languages && (
            <div>
              <span className="font-semibold text-slate-400">Мови:</span> {creature.languages}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-white/5 font-medium">
          <div>
            <span className="text-slate-400">Рівень небезпеки (CR):</span>{" "}
            <span className={is2024 ? "text-amber-300 font-bold" : "text-teal-300 font-bold"}>
              {creature.challenge || "-"}
            </span>
            {creature.xp && creature.xp !== "-" && (
              <span className="text-slate-500 ml-1.5">
                ({creature.xp} XP
                {creature.xpInLair ? `, ${creature.xpInLair} XP у лігві` : ""})
              </span>
            )}
          </div>
          {creature.proficiencyBonus && (
            <div className="text-slate-400 text-xs sm:text-sm">
              <span>Бонус майстерності:</span> <span className="text-slate-200 font-semibold">{creature.proficiencyBonus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Special Traits */}
      {creature.specialAbilities && (
        <div className="mt-4 space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Особливості
          </div>
          <div className="glass-panel rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2 break-words">
            <FormattedDescription content={creature.specialAbilities} />
          </div>
        </div>
      )}

      {/* Actions */}
      {creature.actions && (
        <div className="mt-4 space-y-1.5">
          <div
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              is2024 ? "text-amber-400" : "text-teal-400"
            )}
          >
            Дії
          </div>
          <div className="glass-panel rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2 break-words">
            <FormattedDescription content={creature.actions} />
          </div>
        </div>
      )}

      {/* Bonus Actions */}
      {creature.bonusActions && (
        <div className="mt-4 space-y-1.5">
          <div
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              is2024 ? "text-amber-400" : "text-teal-400"
            )}
          >
            Бонусні дії
          </div>
          <div className="glass-panel rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2 break-words">
            <FormattedDescription content={creature.bonusActions} />
          </div>
        </div>
      )}

      {/* Reactions */}
      {creature.reactions && (
        <div className="mt-4 space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Реакції
          </div>
          <div className="glass-panel rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2 break-words">
            <FormattedDescription content={creature.reactions} />
          </div>
        </div>
      )}

      {/* Legendary Actions */}
      {creature.legendaryActions && (
        <div className="mt-4 space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-300">
            Легендарні дії
          </div>
          <div className="glass-panel rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2 break-words">
            <FormattedDescription content={creature.legendaryActions} />
          </div>
        </div>
      )}

      {/* Description / Lore */}
      {creature.description && (
        <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-400 italic break-words">
          <FormattedDescription content={creature.description} />
        </div>
      )}
    </div>
  );
}

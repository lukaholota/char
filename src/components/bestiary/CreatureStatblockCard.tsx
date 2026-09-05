"use client";

import { CreaturePortrait } from "@/components/bestiary/CreaturePortrait";
import type { CreatureData } from "@/lib/bestiaryData";
import { findSourceLabel } from "@/lib/refs/source-label";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { cn } from "@/lib/utils";
import { Shield, Heart, Zap, Swords } from "lucide-react";

export function CreatureStatblockCard({
  creature,
  is2024 = false,
}: {
  creature: CreatureData;
  is2024?: boolean;
}) {
  const sourceLabel = findSourceLabel(creature.source);
  const actionTone = is2024 ? "text-amber-400" : "text-arcane-400";

  const abilities = [
    { label: "СИЛ", eng: "STR", val: creature.strength || "10 (+0)" },
    { label: "СПР", eng: "DEX", val: creature.dexterity || "10 (+0)" },
    { label: "СТА", eng: "CON", val: creature.constitution || "10 (+0)" },
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
                  : "bg-gradient-to-r from-arcane-300 via-arcane-100 to-violet-300"
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
              : "border-arcane-500/30 bg-arcane-500/10 text-arcane-300"
          )}
        >
          {sourceLabel}
        </div>
      </div>

      <CreaturePortrait creature={creature} />

      {/* Basic Combat Stats (AC, HP, Initiative, Speed) */}
      <div
        className={cn(
          "mt-3 grid grid-cols-1 gap-2",
          creature.initiative ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
        )}
      >
        <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-slate-900/40 p-2.5 glass-panel">
          <Shield className={cn("h-5 w-5 shrink-0", is2024 ? "text-amber-400" : "text-arcane-400")} />
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
                  is2024 ? "text-amber-200" : "text-arcane-200"
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
            <span className="text-slate-400">Показник небезпеки (CR):</span>{" "}
            <span className={is2024 ? "text-amber-300 font-bold" : "text-arcane-300 font-bold"}>
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

      <ProseSection title="Особливості" content={creature.specialAbilities} />
      <ProseSection title="Дії" content={creature.actions} titleClassName={actionTone} />
      <ProseSection title="Бонусні дії" content={creature.bonusActions} titleClassName={actionTone} />
      <ProseSection title="Реакції" content={creature.reactions} />
      <ProseSection
        title="Легендарні дії"
        content={creature.legendaryActions}
        titleClassName="text-purple-300"
      />
      <ProseSection title="Лігво" content={creature.lairInfo} titleClassName="text-purple-300" />
      <ProseSection
        title="Дії Лігва"
        content={creature.lairActions}
        titleClassName="text-purple-300"
      />
      <ProseSection
        title="Регіональні ефекти"
        content={creature.regionEffects}
        titleClassName="text-purple-300"
      />
      <ProseSection
        title="Міфічні дії"
        content={joinMythicSection(creature)}
        titleClassName="text-purple-300"
      />

      {/* Description / Lore */}
      {creature.description && (
        <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-400 italic break-words">
          <FormattedDescription content={creature.description} />
        </div>
      )}
    </div>
  );
}

/// Умова вмикання міфічних дій і самі дії — одна секція, як їх друкує книга: спершу абзац
/// «якщо риса спрацювала…», далі перелік. Тримати їх двома заголовками означало б вигадати
/// другий заголовок, якого в джерелі немає.
function joinMythicSection(creature: CreatureData): string {
  return [creature.mythicInfo, creature.mythicActions].filter(Boolean).join("");
}

/// Проза статблока — «Особливості», «Дії», лігво — малюється однією секцією, бо всі вони
/// відрізняються лише заголовком. FormattedDescription тут обовʼязковий: він же розгортає
/// маркери Р20 `термін{{English}}` у підказку, а сирий HTML цього не вміє.
function ProseSection({
  title,
  content,
  titleClassName = "text-slate-400",
}: {
  title: string;
  content?: string | null;
  titleClassName?: string;
}) {
  if (!content) return null;

  return (
    <div className="mt-4 space-y-1.5">
      <div className={cn("text-xs font-semibold uppercase tracking-wider", titleClassName)}>{title}</div>
      <div className="glass-panel rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2 break-words">
        <FormattedDescription content={content} />
      </div>
    </div>
  );
}

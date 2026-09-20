"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpellIcon } from "@/components/spells/SpellIcon";
import { Button } from "@/components/ui/button";
import { Settings2, Sparkles, Clock3, ArrowRight, BookOpen } from "lucide-react";

function levelShortLabel(level: number): string {
  return level === 0 ? "Замовляння" : `${level} рівень`;
}

function isPositiveFlag(value: unknown): boolean {
  const flag = String(value ?? "").trim().toLowerCase();
  return flag === "так" || flag === "yes" || flag === "true" || flag === "1";
}

function normalizeCastingTimeShort(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "—";

  const normalized = text.toLocaleLowerCase("uk");
  if (normalized.includes("реакц") || normalized.includes("reaction")) return "реакція";
  if (normalized.includes("бонус") || normalized.includes("bonus action")) return "бонусна дія";
  if (normalized.startsWith("1 дія") || normalized === "дія" || normalized.includes("1 action") || normalized === "action") return "дія";

  return text;
}

function hexToRgbTuple(color: string): [number, number, number] | null {
  const raw = String(color || "").trim().replace("#", "");
  const hex = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

function userBadgeStyle(badgeColor: string) {
  const rgb = hexToRgbTuple(badgeColor) ?? [148, 163, 184];
  const [r, g, b] = rgb;
  return {
    background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.28), rgba(${r}, ${g}, ${b}, 0.12) 62%, rgba(${r}, ${g}, ${b}, 0.05))`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.52)`,
    color: "#f8fafc",
  } as const;
}

type SpellListGroupProps = {
  title: string;
  spells: any[];
  isPending: boolean;
  isReadOnly?: boolean;
  onOpenSpell: (spellId: number) => void;
  onOpenSettings: (persSpell: any) => void;
  subtitleVariant?: "default" | "with-level";
  rightAction?: (persSpell: any) => ReactNode;
  compact?: boolean;
  hideSettings?: boolean;
  rightActionPlacement?: "side" | "belowMeta";
};

export default function SpellListGroup({
  title,
  spells,
  isPending,
  isReadOnly,
  onOpenSpell,
  onOpenSettings,
  subtitleVariant: _subtitleVariant = "default",
  rightAction,
  compact = false,
  hideSettings = false,
  rightActionPlacement = "side",
}: SpellListGroupProps) {
  if (!spells.length) return null;

  const handleOpenSettings = (spellId: number, persSpell: any) => {
    if (!Number.isFinite(spellId) || isReadOnly) return;
    onOpenSettings(persSpell);
  };

  return (
    <Card className="border-white/10 bg-transparent">
      <CardHeader className="pb-2 py-3">
        <CardTitle className="text-base flex justify-between items-center text-slate-200">
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-0">
        {spells.map((ps: any, i: number) => {
          const spell = ps?.spell;
          const spellId = Number(spell?.spellId);
          const badgeText = String(ps?.badgeText ?? "").trim();
          const badgeColor = String(ps?.badgeColor ?? "").trim() || "#94a3b8";
          const hasBadge = badgeText.length > 0;
          const isLongBadge = badgeText.length > 13;
          const showLevelMeta = _subtitleVariant === "with-level";
          const hasRitual = isPositiveFlag(spell?.hasRitual);
          const castingTimeShort = normalizeCastingTimeShort(spell?.castingTime);

          return (
            <div
              key={ps?.persSpellId ?? `${spellId}-${i}`}
              className={
                "group w-full overflow-hidden rounded-lg border border-white/10 bg-slate-950/40 transition-all duration-300 hover:border-white/20 hover:bg-white/5 " +
                (compact ? "p-2" : "p-2 sm:p-3")
              }
            >
              {rightActionPlacement === "belowMeta" ? (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-stretch gap-x-2 gap-y-1.5 sm:gap-x-3">
                  <SpellIcon
                    engName={spell?.engName}
                    school={spell?.school}
                    className={`row-start-1 col-start-1 m-auto ${compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-7 w-7 sm:h-9 sm:w-9"}`}
                  />

                  <button
                    type="button"
                    className="row-start-1 col-start-2 w-full min-w-0 text-left"
                    onClick={() => {
                      if (Number.isFinite(spellId)) onOpenSpell(spellId);
                    }}
                  >
                    <div className={`font-serif leading-tight text-slate-100 transition-colors group-hover:text-white overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${compact ? "text-[12px] sm:text-[15px]" : "text-[12px] sm:text-base"}`}>
                      {spell?.name ?? "—"}
                    </div>
                  </button>

                  <div className="row-start-1 col-start-3 flex items-center justify-end self-start">
                    {rightAction ? (
                      <div className="[&>button]:h-7 sm:[&>button]:h-9 [&>button]:w-[62px] sm:[&>button]:w-[76px] [&>button]:text-[10px] [&>button_span]:text-[10px]">
                        {rightAction(ps)}
                      </div>
                    ) : null}
                  </div>

                  <div className="row-start-2 col-start-1 self-start m-auto">
                    {!hideSettings ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Налаштувати бейдж заклинання"
                        disabled={isPending || !Number.isFinite(spellId) || isReadOnly}
                        title={isReadOnly ? "Режим перегляду" : "Налаштувати бейдж або видалити заклинання"}
                        className={
                          "flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-0 text-slate-200 hover:bg-white/10 " +
                          (compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-7 w-7 sm:h-9 sm:w-9")
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSettings(spellId, ps);
                        }}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="row-start-2 col-start-2 w-full min-w-0 text-left"
                    onClick={() => {
                      if (Number.isFinite(spellId)) onOpenSpell(spellId);
                    }}
                  >
                    <div className={`flex flex-wrap items-center text-slate-400 ${compact ? "gap-x-2 gap-y-0.5 text-[11px]" : "gap-x-3 gap-y-1 text-xs"}`}>
                      {showLevelMeta ? (
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-slate-500`} />
                          {levelShortLabel(Number(spell?.level ?? 0))}
                        </span>
                      ) : null}

                      <span className="inline-flex items-center gap-1">
                        <Clock3 className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-slate-500`} />
                        {castingTimeShort}
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <ArrowRight className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-slate-500`} />
                        {spell?.range ?? "—"}
                      </span>

                      {hasRitual ? (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-amber-500`} />
                          Ритуал
                        </span>
                      ) : null}
                    </div>
                  </button>

                  <div className="row-start-2 col-start-3 flex items-start justify-end self-start">
                    {hasBadge ? (
                      <button
                        type="button"
                        title={badgeText}
                        aria-label={`Налаштувати бейдж заклинання ${spell?.name ?? ""}`.trim()}
                        disabled={isPending || !Number.isFinite(spellId) || isReadOnly}
                        className={
                          "flex h-7 w-[62px] sm:h-9 sm:w-[76px] items-center overflow-hidden whitespace-nowrap rounded-md border text-[10px] font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 " +
                          (isLongBadge ? "justify-start px-2 text-left" : "justify-center px-1.5 text-center")
                        }
                        style={userBadgeStyle(badgeColor)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSettings(spellId, ps);
                        }}
                      >
                        {badgeText}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="shrink-0 flex flex-col items-center gap-1.5">
                    <SpellIcon
                      engName={spell?.engName}
                      school={spell?.school}
                      className={`mt-0.5 shrink-0 ${compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-7 w-7 sm:h-9 sm:w-9"}`}
                    />

                    {!hideSettings ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Налаштувати бейдж заклинання"
                        disabled={isPending || !Number.isFinite(spellId) || isReadOnly}
                        title={isReadOnly ? "Режим перегляду" : "Налаштувати бейдж або видалити заклинання"}
                        className={
                          "shrink-0 rounded-md border border-white/10 bg-white/5 p-0 text-slate-200 hover:bg-white/10 " +
                          (compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-7 w-7 sm:h-9 sm:w-9")
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSettings(spellId, ps);
                        }}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        if (Number.isFinite(spellId)) onOpenSpell(spellId);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`font-serif leading-tight text-slate-100 transition-colors group-hover:text-white overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${compact ? "text-[12px] sm:text-[15px]" : "text-[12px] sm:text-base"}`}>
                          {spell?.name ?? "—"}
                        </div>

                        <div className={`mt-1.5 flex flex-wrap items-center text-slate-400 ${compact ? "gap-x-2 gap-y-0.5 text-[11px]" : "gap-x-3 gap-y-1 text-xs"}`}>
                          {showLevelMeta ? (
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-slate-500`} />
                              {levelShortLabel(Number(spell?.level ?? 0))}
                            </span>
                          ) : null}

                          <span className="inline-flex items-center gap-1">
                            <Clock3 className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-slate-500`} />
                            {castingTimeShort}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <ArrowRight className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-slate-500`} />
                            {spell?.range ?? "—"}
                          </span>

                          {hasRitual ? (
                            <span className="inline-flex items-center gap-1">
                              <BookOpen className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-amber-500`} />
                              Ритуал
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {rightAction ? rightAction(ps) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

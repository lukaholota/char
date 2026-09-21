"use client";

import type { ReactNode } from "react";
import { Minus, Plus, Info, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureDisplayType } from "@prisma/client";
import clsx from "clsx";
import { 
  normalizeFeatureSource, 
  getFeatureSourceLabel, 
  isClassRelatedSource, 
  getFeatureDisplayName, 
  findFeaturePreview
} from "@/lib/utils/features";

export interface FeatureItemData {
  featureId?: number;
  name: string;
  description: string;
  shortDescription?: string | null;
  displayType: FeatureDisplayType[];
  restType?: string | null;
  usesCount?: number | null;
  usesRemaining?: number | null;
  usePrice?: number | null;
  source?: string;
  sourceName?: string;
  magicItem?: any;
}

export type FeatureStateToggle = { isActive: boolean; disabled: boolean; onChange: (next: boolean) => void };

export function ResourceCard({ 
  feature, 
  onSpend, 
  onRestore, 
  onInfo, 
  isPending,
  isReadOnly
}: { 
  feature: FeatureItemData, 
  onSpend?: () => void, 
  onRestore?: () => void,
  onInfo?: () => void,
  isPending?: boolean,
  isReadOnly?: boolean
}) {
  const hasTracker = (feature.restType || feature.usesCount !== null) && feature.usesCount !== null;
  const cost = Math.max(1, Number(feature.usePrice ?? 1));
  const normalizedSource = normalizeFeatureSource(feature.source);
  const isClass = isClassRelatedSource(normalizedSource);

  const displayName = getFeatureDisplayName(feature.name, feature.source);

  // Hide badge if source is PERS (Custom) as per user request
  const sourceLabel = normalizedSource && normalizedSource !== 'PERS' ? getFeatureSourceLabel(normalizedSource) : null;

  return (
    <Card className="bg-purple-900/20 border-purple-500/30 backdrop-blur-sm overflow-hidden border-l-4 border-l-purple-50 shadow-inner group transition-all hover:bg-purple-900/30">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="font-rpg-display font-bold text-purple-50 truncate">{displayName}</div>
            {sourceLabel && (
              <span className={clsx(
                "text-[9px] px-1 py-0 rounded uppercase font-bold tracking-tight shrink-0",
                isClass ? 'bg-purple-500/30 text-purple-100' : 'bg-slate-500/30 text-slate-300'
              )}>
                {sourceLabel}
              </span>
            )}
          </div>
          {findFeaturePreview(feature) && (
            <div className="text-[11px] text-purple-300/80 truncate pr-2">
              {findFeaturePreview(feature)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onInfo && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onInfo(); }} 
              className="p-1.5 rounded-full hover:bg-white/10 text-purple-400 transition"
            >
              <Info className="w-4 h-4" />
            </button>
          )}

          {hasTracker && (
            <div 
              className="flex flex-col items-center bg-black/30 rounded-lg p-1 border border-white/5 min-w-[2.8rem]"
              onClick={(e) => e.stopPropagation()}
            >
              {!isReadOnly && onRestore && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-md hover:bg-white/10 text-purple-300" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRestore(); }}
                  disabled={isPending || (feature.usesRemaining ?? feature.usesCount ?? 0) >= (feature.usesCount ?? 0)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
              <div className="py-0.5 text-center leading-tight">
                <div className="text-[11px] font-black text-white">
                  {feature.usesRemaining ?? feature.usesCount}
                </div>
                <div className="text-[8px] font-bold text-purple-400/80 border-t border-white/10 mt-0.5 pt-0.5">
                  {feature.usesCount}
                </div>
              </div>
              {!isReadOnly && onSpend && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-md hover:bg-white/10 text-purple-300" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSpend(); }}
                  disabled={isPending || (feature.usesRemaining ?? feature.usesCount ?? 0) < cost}
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FeatureCard({ 
  feature, 
  onSpend, 
  onRestore, 
  onClick, 
  isPending,
  isReadOnly,
  stateToggle,
  badgeLabel,
  actions,
  footer
}: { 
  feature: FeatureItemData, 
  onSpend?: () => void, 
  onRestore?: () => void,
  onClick?: () => void,
  isPending?: boolean,
  isReadOnly?: boolean,
  stateToggle?: FeatureStateToggle,
  badgeLabel?: string | null,
  actions?: ReactNode,
  footer?: ReactNode
}) {
  const hasTracker = feature.restType && feature.usesCount !== null;
  const cost = Math.max(1, Number(feature.usePrice ?? 1));
  const normalizedSource = normalizeFeatureSource(feature.source);
  const isClass = isClassRelatedSource(normalizedSource);

  const displayName = getFeatureDisplayName(feature.name, feature.source);

  // Hide badge if source is PERS (Custom) as per user request
  const sourceLabel = badgeLabel ?? (normalizedSource && normalizedSource !== 'PERS' ? getFeatureSourceLabel(normalizedSource) : null);

  return (
    <div 
      className={clsx(
        "p-4 rounded-xl border transition group animate-in fade-in slide-in-from-bottom-2",
        isClass 
          ? 'bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40' 
          : 'bg-slate-900/30 border-white/10 hover:border-white/20',
        stateToggle?.isActive && "border-amber-400/60 bg-amber-500/10",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-rpg-display font-bold text-slate-100 group-hover:text-purple-200 transition truncate">{displayName}</span>
            {sourceLabel && (
              <span className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tight shrink-0",
                isClass ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
              )}>
                {sourceLabel}
              </span>
            )}
          </div>
          {findFeaturePreview(feature) ? (
            <div className="text-xs text-slate-400 line-clamp-2 pr-2">
              {findFeaturePreview(feature)}
            </div>
          ) : (
            <div className="text-[10px] italic text-slate-500">Натисніть для деталей...</div>
          )}
          {stateToggle && <StateToggleButton name={displayName} toggle={stateToggle} />}
        </div>

        {actions && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}

        {hasTracker && (
          <div 
            className="flex flex-col items-center bg-black/40 rounded-xl p-1 border border-white/5 shrink-0 min-w-[2.8rem]"
            onClick={(e) => e.stopPropagation()}
          >
            {!isReadOnly && onRestore && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-white/10 text-white" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRestore(); }}
                disabled={isPending || (feature.usesRemaining ?? feature.usesCount ?? 0) >= (feature.usesCount ?? 0)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
            <div className="py-1 text-center leading-tight">
              <div className="text-sm font-black text-white">
                {feature.usesRemaining ?? feature.usesCount}
              </div>
              <div className="text-[9px] font-bold text-slate-400 border-t border-white/10 mt-1 pt-1 opacity-70">
                {feature.usesCount}
              </div>
            </div>
            {!isReadOnly && onSpend && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-white/10 text-white" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSpend(); }}
                disabled={isPending || (feature.usesRemaining ?? feature.usesCount ?? 0) < cost}
              >
                <Minus className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      {footer}
    </div>
  );
}

/// Одна кнопка замість перемикача з підписом: «Увімкнути» → «Активна».
function StateToggleButton({ name, toggle }: { name: string; toggle: FeatureStateToggle }) {
  return (
    <button
      type="button"
      aria-pressed={toggle.isActive}
      aria-label={toggle.isActive ? `${name}: активна, завершити` : `${name}: увімкнути`}
      disabled={toggle.disabled}
      onClick={(e) => { e.stopPropagation(); toggle.onChange(!toggle.isActive); }}
      className={clsx(
        "mt-2 inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-bold transition active:scale-95 disabled:opacity-40",
        toggle.isActive ? "border-amber-300/70 bg-amber-500/25 text-amber-50" : "border-amber-400/40 text-amber-200 hover:bg-amber-500/10"
      )}
    >
      <Flame className={clsx("h-3.5 w-3.5", toggle.isActive && "fill-amber-300/60")} aria-hidden />
      {toggle.isActive ? "Активна" : "Увімкнути"}
    </button>
  );
}

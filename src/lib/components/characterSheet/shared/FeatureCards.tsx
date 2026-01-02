"use client";

import { Minus, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureDisplayType } from "@prisma/client";
import clsx from "clsx";
import { featTranslations } from "@/lib/refs/translation";

export interface FeatureItemData {
  featureId?: number;
  name: string;
  description: string;
  shortDescription?: string | null;
  displayType: FeatureDisplayType[];
  restType?: string | null;
  usesCount?: number | null;
  usesRemaining?: number | null;
  source?: string;
  sourceName?: string;
  magicItem?: any;
}

// FeatureSource enum values from backend
type FeatureSource = 'CLASS' | 'SUBCLASS' | 'RACE' | 'SUBRACE' | 'BACKGROUND' | 'FEAT' | 'PERS' | 'CHOICE' | 'RACE_CHOICE' | 'INFUSION';

// Normalizes various source string formats to a canonical FeatureSource
function normalizeFeatureSource(raw: unknown): FeatureSource | null {
  if (typeof raw !== 'string' || !raw) return null;
  const upper = raw.toUpperCase().trim();
  
  // Direct enum matches
  if (upper === 'CLASS') return 'CLASS';
  if (upper === 'SUBCLASS') return 'SUBCLASS';
  if (upper === 'RACE') return 'RACE';
  if (upper === 'SUBRACE') return 'SUBRACE';
  if (upper === 'BACKGROUND') return 'BACKGROUND';
  if (upper === 'FEAT') return 'FEAT';
  if (upper === 'PERS') return 'PERS';
  if (upper === 'CHOICE') return 'CHOICE';
  if (upper === 'RACE_CHOICE' || upper === 'RACECHOICE') return 'RACE_CHOICE';
  if (upper === 'INFUSION') return 'INFUSION';
  
  // Legacy/alternative formats
  if (upper.includes('SUBCLASS')) return 'SUBCLASS';
  if (upper.includes('CLASS')) return 'CLASS';
  if (upper.includes('SUBRACE')) return 'SUBRACE';
  if (upper.includes('RACE')) return 'RACE';
  if (upper.includes('BACKGROUND') || upper.includes('BG')) return 'BACKGROUND';
  if (upper.includes('FEAT')) return 'FEAT';
  if (upper.includes('CUSTOM') || upper.includes('PERS')) return 'PERS';
  if (upper.includes('CHOICE')) return 'CHOICE';
  
  return null;
}

// Returns Ukrainian label for feature source
function getFeatureSourceLabel(source: FeatureSource): string {
  switch (source) {
    case 'CLASS': return 'Клас';
    case 'SUBCLASS': return 'Підклас';
    case 'RACE': return 'Раса';
    case 'SUBRACE': return 'Субраса';
    case 'BACKGROUND': return 'Бек';
    case 'FEAT': return 'Риса';
    case 'CHOICE':
    case 'RACE_CHOICE': return 'Вибір';
    case 'PERS': return 'Кастом';
    case 'INFUSION': return 'Вливання';
    default: return '';
  }
}

function translateFeatName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  const normalized = raw
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return featTranslations[raw] ?? featTranslations[raw.toUpperCase()] ?? featTranslations[normalized] ?? raw;
}

// Check if source is class-related for styling
function isClassRelatedSource(source: FeatureSource | null): boolean {
  return source === 'CLASS' || source === 'SUBCLASS';
}

const stripMarkdownPreview = (value: string) => {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[^\S\r\n]+/g, " ") // Collapse horizontal whitespace
    .replace(/\n\s*\n/g, "\n")   // Collapse multiple newlines
    .trim();
};

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
  const normalizedSource = normalizeFeatureSource(feature.source);
  const isClass = isClassRelatedSource(normalizedSource);

  const displayName = normalizedSource === 'FEAT' ? translateFeatName(feature.name) : feature.name;

  // Hide badge if source is PERS (Custom) as per user request
  const sourceLabel = normalizedSource && normalizedSource !== 'PERS' ? getFeatureSourceLabel(normalizedSource) : null;

  return (
    <Card className="bg-purple-900/20 border-purple-500/30 backdrop-blur-sm overflow-hidden border-l-4 border-l-purple-50 shadow-inner group transition-all hover:bg-purple-900/30">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="font-bold text-purple-50 truncate">{displayName}</div>
            {sourceLabel && (
              <span className={clsx(
                "text-[9px] px-1 py-0 rounded uppercase font-bold tracking-tight shrink-0",
                isClass ? 'bg-purple-500/30 text-purple-100' : 'bg-slate-500/30 text-slate-300'
              )}>
                {sourceLabel}
              </span>
            )}
          </div>
          {(feature.shortDescription || feature.description) && (
            <div className="text-[11px] text-purple-300/80 truncate pr-2">
              {stripMarkdownPreview(feature.shortDescription || feature.description)}
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
                  disabled={isPending || (feature.usesRemaining ?? feature.usesCount ?? 0) <= 0}
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
  isReadOnly
}: { 
  feature: FeatureItemData, 
  onSpend?: () => void, 
  onRestore?: () => void,
  onClick?: () => void,
  isPending?: boolean,
  isReadOnly?: boolean
}) {
  const hasTracker = feature.restType && feature.usesCount !== null;
  const normalizedSource = normalizeFeatureSource(feature.source);
  const isClass = isClassRelatedSource(normalizedSource);

  const displayName = normalizedSource === 'FEAT' ? translateFeatName(feature.name) : feature.name;

  // Hide badge if source is PERS (Custom) as per user request
  const sourceLabel = normalizedSource && normalizedSource !== 'PERS' ? getFeatureSourceLabel(normalizedSource) : null;

  return (
    <div 
      className={clsx(
        "p-4 rounded-xl border transition group animate-in fade-in slide-in-from-bottom-2",
        isClass 
          ? 'bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40' 
          : 'bg-slate-900/30 border-white/10 hover:border-white/20',
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-100 group-hover:text-purple-200 transition truncate">{displayName}</span>
            {sourceLabel && (
              <span className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tight shrink-0",
                isClass ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
              )}>
                {sourceLabel}
              </span>
            )}
          </div>
          {feature.shortDescription || feature.description ? (
            <div className="text-xs text-slate-400 line-clamp-2 pr-2">
              {stripMarkdownPreview(feature.shortDescription || feature.description)}
            </div>
          ) : (
            <div className="text-[10px] italic text-slate-500">Натисніть для деталей...</div>
          )}
        </div>

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
                disabled={isPending || (feature.usesRemaining ?? feature.usesCount ?? 0) <= 0}
              >
                <Minus className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

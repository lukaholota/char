"use client";

import { Minus, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { FeatureDisplayType, RestType } from "@prisma/client";
import clsx from "clsx";

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
}

const stripMarkdownPreview = (value: string) => {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
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

  return (
    <Card className="bg-purple-900/20 border-purple-500/30 backdrop-blur-sm overflow-hidden border-l-4 border-l-purple-500 shadow-inner group">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-bold text-purple-50 truncate">{feature.name}</div>
            {onInfo && (
              <button 
                type="button"
                onClick={onInfo} 
                className="p-1 rounded-full hover:bg-white/10 text-purple-400 transition"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {(feature.shortDescription || feature.description) && (
            <div className="text-[11px] text-purple-300/80 truncate">
              {stripMarkdownPreview(feature.shortDescription || feature.description)}
            </div>
          )}
        </div>

        {hasTracker && (
          <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5">
            {!isReadOnly && onSpend && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-md hover:bg-white/10 text-purple-300" 
                onClick={onSpend}
                disabled={isPending || (feature.usesRemaining ?? 0) <= 0}
              >
                <Minus className="w-4 h-4" />
              </Button>
            )}
            <div className="px-2 text-center min-w-[3rem]">
              <div className="text-xs font-bold text-white leading-none">
                {feature.usesRemaining ?? feature.usesCount} / {feature.usesCount}
              </div>
              <div className="text-[8px] uppercase font-bold text-purple-400 mt-0.5">
                {feature.restType === "LR" ? "LR" : feature.restType === "SR" ? "SR" : "uses"}
              </div>
            </div>
            {!isReadOnly && onRestore && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-md hover:bg-white/10 text-purple-300" 
                onClick={onRestore}
                disabled={isPending || (feature.usesRemaining ?? 0) >= (feature.usesCount ?? 0)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
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
  const isClass = feature.source?.includes('class') || feature.source?.includes('subclass');

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
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-100 group-hover:text-purple-200 transition">{feature.name}</span>
            <span className={clsx(
              "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tight",
              isClass ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            )}>
              {isClass ? 'Клас' : 'Раса'}
            </span>
          </div>
          {feature.shortDescription || feature.description ? (
            <div className="text-xs text-slate-400 line-clamp-2">
              {stripMarkdownPreview(feature.shortDescription || feature.description)}
            </div>
          ) : (
            <div className="text-[10px] italic text-slate-500">Натисніть для деталей...</div>
          )}
        </div>

        {hasTracker && (
          <div className="flex flex-col items-center gap-1.5 bg-black/30 rounded-xl p-1.5 border border-white/5 shrink-0">
            <div className="flex items-center gap-1">
              {!isReadOnly && onSpend && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-lg hover:bg-white/10 text-white" 
                  onClick={(e) => { e.stopPropagation(); onSpend(); }}
                  disabled={isPending || (feature.usesRemaining ?? 0) <= 0}
                >
                  <Minus className="w-3 h-3" />
                </Button>
              )}
              <div className="px-1 text-center min-w-[2.5rem]">
                <span className="text-xs font-black text-white">
                  {feature.usesRemaining ?? feature.usesCount} / {feature.usesCount}
                </span>
              </div>
              {!isReadOnly && onRestore && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-lg hover:bg-white/10 text-white" 
                  onClick={(e) => { e.stopPropagation(); onRestore(); }}
                  disabled={isPending || (feature.usesRemaining ?? 0) >= (feature.usesCount ?? 0)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

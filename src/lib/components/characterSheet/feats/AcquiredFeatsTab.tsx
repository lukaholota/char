"use client";

import { Award, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { featCategoryTranslations } from "@/lib/refs/translation";
import { getFeatureDisplayName } from "@/lib/utils/features";
import { FeatureCard } from "@/lib/components/characterSheet/shared/FeatureCards";

export type CharacterFeatItem = {
  persFeatId?: number;
  featId: number;
  feat?: {
    featId?: number;
    engName?: string;
    name: string;
    description: string;
    category?: string | null;
    source?: string;
  };
  name?: string;
  description?: string;
  choices?: Array<{
    choiceOption?: {
      optionName: string;
    };
  }>;
};

export type AcquiredFeatDetail = { name: string; description: string };

type Props = {
  persFeats: CharacterFeatItem[];
  isReadOnly?: boolean;
  isSubmitting: number | null;
  onRemoveFeat: (featId: number, name: string) => void;
  onOpenDetail: (detail: AcquiredFeatDetail) => void;
  onSwitchToCatalog: () => void;
};

export function AcquiredFeatsTab({
  persFeats,
  isReadOnly,
  isSubmitting,
  onRemoveFeat,
  onOpenDetail,
  onSwitchToCatalog,
}: Props) {
  if (persFeats.length === 0) {
    return <EmptyAcquiredFeats isReadOnly={isReadOnly} onSwitchToCatalog={onSwitchToCatalog} />;
  }

  return (
    <div className="space-y-3">
      {persFeats.map((pf, idx) => {
        const name = getFeatureDisplayName(pf.feat?.name || pf.name || "Риса", "FEAT");
        const description = pf.feat?.description || pf.description || "";
        const canRemove = !isReadOnly && Boolean(pf.featId);

        return (
          <FeatureCard
            key={pf.persFeatId || pf.featId || pf.feat?.featId || idx}
            feature={{ name, description, displayType: [] }}
            badgeLabel={findCategoryLabel(pf.feat?.category)}
            onClick={() => onOpenDetail({ name, description })}
            actions={
              canRemove ? (
                <RemoveFeatButton
                  name={name}
                  isRemoving={isSubmitting === pf.featId}
                  onRemove={() => onRemoveFeat(pf.featId, name)}
                />
              ) : null
            }
            footer={<ChosenOptions choices={pf.choices} />}
          />
        );
      })}
    </div>
  );
}

function findCategoryLabel(category: string | null | undefined): string | null {
  if (!category) return null;
  return featCategoryTranslations[category as keyof typeof featCategoryTranslations] || category;
}

function RemoveFeatButton({ name, isRemoving, onRemove }: { name: string; isRemoving: boolean; onRemove: () => void }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isRemoving}
      onClick={onRemove}
      aria-label={`Видалити рису ${name}`}
      className="h-10 w-10 px-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15"
    >
      {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </Button>
  );
}

function ChosenOptions({ choices }: { choices: CharacterFeatItem["choices"] }) {
  const optionNames = (choices ?? []).map((c) => c.choiceOption?.optionName).filter(Boolean);
  if (optionNames.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="text-slate-400">Обрано:</span>
      {optionNames.map((optionName, i) => (
        <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-amber-300 border border-white/10 font-medium">
          {optionName}
        </span>
      ))}
    </div>
  );
}

function EmptyAcquiredFeats({ isReadOnly, onSwitchToCatalog }: { isReadOnly?: boolean; onSwitchToCatalog: () => void }) {
  return (
    <div className="py-12 text-center">
      <Award className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
      <p className="text-sm font-semibold text-slate-300">Немає набутих рис</p>
      <p className="text-xs text-slate-500 mt-1">Персонаж поки не має обраних рис.</p>
      {!isReadOnly && (
        <Button
          size="sm"
          onClick={onSwitchToCatalog}
          className="mt-4 gap-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
        >
          <Plus className="w-4 h-4" /> Додати першу рису
        </Button>
      )}
    </div>
  );
}

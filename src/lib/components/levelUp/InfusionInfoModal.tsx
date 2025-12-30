"use client";

import { useState } from "react";
import { Infusion, MagicItem, Feature } from "@prisma/client";
import { ControlledInfoDialog, InfoGrid, InfoPill } from "@/lib/components/characterCreator/EntityInfoDialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { infusionTargetTranslations } from "@/lib/refs/translation";
import { MagicItemInfoModal } from "./MagicItemInfoModal";

interface Props {
  infusion: Partial<Infusion> & {
    feature?: Partial<Feature> | null;
    replicatedMagicItem?: Partial<MagicItem> | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfusionInfoModal({ infusion, open, onOpenChange }: Props) {
  const [magicItemOpen, setMagicItemOpen] = useState(false);

  const targetLabel = infusion.targetType 
    ? infusionTargetTranslations[infusion.targetType as keyof typeof infusionTargetTranslations] || infusion.targetType
    : "Будь-який";

  return (
    <>
      <ControlledInfoDialog
        open={open}
        onOpenChange={onOpenChange}
        title={infusion.name || "Вливання"}
        subtitle={infusion.engName}
      >
        <div className="space-y-6">
          <InfoGrid>
            <InfoPill label="Ціль" value={targetLabel} />
            <InfoPill label="Рівень" value={`Винахідник ${infusion.minArtificerLevel}+`} />
            <InfoPill label="Налаштування" value={infusion.requiresAttunement ? "Вимагає" : "Ні"} />
          </InfoGrid>

          {infusion.replicatedMagicItem && (
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="text-[10px] uppercase tracking-widest text-indigo-400 mb-1">Репліка предмета</p>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMagicItemOpen(true);
                }}
                className="text-lg font-bold text-white hover:text-indigo-300 transition-colors text-left"
              >
                {infusion.replicatedMagicItem.name}
              </button>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Опис</p>
            <FormattedDescription 
              content={infusion.feature?.description || "Опис відсутній"} 
              className="text-slate-300 leading-relaxed" 
            />
          </div>
        </div>
      </ControlledInfoDialog>

      {infusion.replicatedMagicItem && (
        <MagicItemInfoModal 
          item={infusion.replicatedMagicItem}
          open={magicItemOpen}
          onOpenChange={setMagicItemOpen}
        />
      )}
    </>
  );
}

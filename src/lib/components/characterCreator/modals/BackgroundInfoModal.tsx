"use client";

import {
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  formatLanguages,
  formatToolProficiencies,
  formatSkillProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { backgroundTranslations } from "@/lib/refs/translation";
import { BackgroundI } from "@/lib/types/model-types";

import { ReactNode } from "react";

interface Props {
  background: BackgroundI;
  triggerClassName?: string;
  sourceLabel?: string;
  trigger?: ReactNode;
}

const parseItems = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];

  return (items as unknown[])
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") return item;
      if (typeof item === "object") {
        const name = (item as any).name;
        const quantity = (item as any).quantity;
        if (!name) return null;
        return quantity ? `${name} x${quantity}` : name;
      }
      return null;
    })
    .filter(Boolean) as string[];
};

export const BackgroundInfoModal = ({ background, triggerClassName, sourceLabel, trigger }: Props) => {
  const items = parseItems(background.items);
  const resolvedSource = sourceLabel || (background.source ? translateValue(background.source) : "—");

  return (
    <InfoDialog
      title={backgroundTranslations[background.name as keyof typeof backgroundTranslations] || background.name}
      triggerLabel={`Показати деталі ${backgroundTranslations[background.name as keyof typeof backgroundTranslations] ?? background.name}`}
      triggerClassName={triggerClassName}
      trigger={trigger}
    >
      <InfoGrid>
        <InfoPill label="Джерело" value={resolvedSource} />
        <InfoPill
          label="Навички"
          value={formatSkillProficiencies(background.skillProficiencies)}
        />
        <InfoPill
          label="Інструменти"
          value={formatToolProficiencies(background.toolProficiencies)}
        />
        <InfoPill
          label="Мови"
          value={formatLanguages([], background.languagesToChooseCount)}
        />
        <InfoPill
          label="Особливість"
          value={background.specialAbilityName || "-"}
        />
      </InfoGrid>

      {items.length ? (
        <div className="space-y-1.5">
          <InfoSectionTitle>Стартове спорядження</InfoSectionTitle>
          <ul className="space-y-1 text-sm text-slate-200/90">
            {items.map((item, index) => (
              <li key={`${item}-${index}`} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden />
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(background.specialAbilityName || background.description) && (
        <div className="space-y-1">
          <InfoSectionTitle>Опис особливості</InfoSectionTitle>
          {background.specialAbilityName ? (
            <p className="text-sm font-semibold text-white">
              {background.specialAbilityName}
            </p>
          ) : null}
          {background.description ? (
            <FormattedDescription
              content={background.description}
              className="text-sm leading-relaxed text-slate-200/90"
            />
          ) : null}
        </div>
      )}
    </InfoDialog>
  );
};

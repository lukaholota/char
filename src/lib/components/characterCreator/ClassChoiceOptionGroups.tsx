"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { checkPrerequisite } from "@/lib/logic/prerequisiteUtils";
import { ClassI } from "@/lib/types/model-types";
import clsx from "clsx";
import { HelpCircle } from "lucide-react";

type ChoiceOptions = ClassI["classChoiceOptions"];
type ChoiceOption = ChoiceOptions[number];
type Selections = Record<string, number | number[]>;

type Props = {
  groupedOptions: Array<{ groupName: string; options: ChoiceOptions }>;
  selectionState: {
    charLevel: number;
    charPact?: string;
    groupPickCounts?: Record<string, number>;
    pickCount: number;
    selections: Selections;
  };
  onSelectOption: (groupName: string, optionId: number, options: ChoiceOptions) => void;
  onShowFeatures: (title: string, features?: ChoiceOption["choiceOption"]["features"]) => void;
};

export function ClassChoiceOptionGroups({
  groupedOptions,
  selectionState,
  onSelectOption,
  onShowFeatures,
}: Props) {
  return (
    <div className="space-y-4">
      {groupedOptions.map(({ groupName, options }) => (
        <ClassChoiceOptionGroup
          key={groupName}
          groupName={groupName}
          options={options}
          selectionState={selectionState}
          onSelectOption={onSelectOption}
          onShowFeatures={onShowFeatures}
        />
      ))}
    </div>
  );
}

type GroupProps = {
  groupName: string;
  options: ChoiceOptions;
  selectionState: Props["selectionState"];
  onSelectOption: Props["onSelectOption"];
  onShowFeatures: Props["onShowFeatures"];
};

function ClassChoiceOptionGroup({
  groupName,
  options,
  selectionState,
  onSelectOption,
  onShowFeatures,
}: GroupProps) {
  const required = getRequiredSelections(groupName, selectionState);
  const selectedCount = getSelectedCount(groupName, selectionState.selections);

  return (
    <Card className="">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Група</p>
            <p className="text-base font-semibold text-white">{groupName}</p>
          </div>
          <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
            Обрано: {selectedCount}/{required}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((option) => (
            <ClassChoiceOptionCard
              key={option.choiceOptionId}
              groupName={groupName}
              option={option}
              options={options}
              selectionState={selectionState}
              onSelectOption={onSelectOption}
              onShowFeatures={onShowFeatures}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type CardProps = Omit<GroupProps, "groupName"> & {
  groupName: string;
  option: ChoiceOption;
};

function ClassChoiceOptionCard({
  groupName,
  option,
  options,
  selectionState,
  onSelectOption,
  onShowFeatures,
}: CardProps) {
  const label = getOptionLabel(option);
  const prerequisite = checkPrerequisite(option.choiceOption.prerequisites, {
    classLevel: selectionState.charLevel,
    pact: selectionState.charPact,
    existingChoiceOptionIds: Object.values(selectionState.selections).flat().filter((id) => typeof id === "number") as number[],
  });
  const previewText = getPreviewText(option);

  return (
    <Card
      className={getCardClassName(groupName, option.choiceOptionId, selectionState)}
      onClick={(event) => {
        if ((event.target as HTMLElement | null)?.closest?.("[data-stop-card-click]")) return;
        onSelectOption(groupName, option.choiceOptionId, options);
      }}
    >
      <CardContent className="flex h-full flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="flex-1 break-words text-sm font-semibold text-white">{label}</p>
          <div className="flex items-center gap-2">
            <div onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="glass-panel border-gradient-rpg h-8 w-8 rounded-full text-slate-100 transition-all duration-200 hover:text-white focus-visible:ring-arcane-400/30"
                aria-label={`Інформація про ${label}`}
                onClick={() => onShowFeatures(label || "Опція", option.choiceOption.features)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {!prerequisite.met && (prerequisite.reasons?.length || prerequisite.reason) ? (
          <div className="space-y-0.5 rounded border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-400">
            {prerequisite.reasons ? prerequisite.reasons.map((reason, index) => <div key={index}>{reason}</div>) : <div>{prerequisite.reason}</div>}
          </div>
        ) : null}

        {previewText ? <p className="line-clamp-2 text-sm text-slate-400">{stripMarkdownPreview(previewText)}</p> : null}
      </CardContent>
    </Card>
  );
}

function getRequiredSelections(groupName: string, selectionState: Props["selectionState"]) {
  return Math.max(1, Number(selectionState.groupPickCounts?.[groupName] ?? selectionState.pickCount) || 1);
}

function getSelectedCount(groupName: string, selections: Selections) {
  const selection = selections[groupName];
  return Array.isArray(selection) ? selection.length : selection ? 1 : 0;
}

function getOptionLabel(option: ChoiceOption) {
  const ukrainianLabel = option.choiceOption.optionName;
  const englishLabel = option.choiceOption.optionNameEng;
  return ukrainianLabel || (isEnumLike(englishLabel) ? translateValue(englishLabel) : englishLabel);
}

function getPreviewText(option: ChoiceOption) {
  const features = (option.choiceOption.features || [])
    .map((featureLink) => featureLink.feature)
    .filter(Boolean) as Array<{ shortDescription?: string | null; description?: string | null }>;
  return features.find((feature) => (feature.shortDescription ?? "").trim())?.shortDescription
    || features.find((feature) => (feature.description ?? "").trim())?.description
    || "";
}

function getCardClassName(groupName: string, optionId: number, selectionState: Props["selectionState"]) {
  const required = getRequiredSelections(groupName, selectionState);
  const selected = selectionState.selections[groupName];
  const selectedIds = Array.isArray(selected) ? selected : [];
  const isMulti = required > 1;
  const isSelected = isMulti ? selectedIds.includes(optionId) : selected === optionId;
  const atLimit = isMulti && selectedIds.length >= required;

  return clsx(
    "glass-card cursor-pointer transition-all duration-200",
    isSelected && "glass-active",
    !isSelected && atLimit && "opacity-50 grayscale-[0.5]",
  );
}

function isEnumLike(value?: string | null) {
  return !!value && /^[A-Z0-9_]+$/.test(value);
}

function stripMarkdownPreview(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<a\s+[^>]*>(.*?)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

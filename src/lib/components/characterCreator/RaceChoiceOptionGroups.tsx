"use client";

import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { buildSelectableCardProps } from "@/lib/components/characterCreator/selectable-card-props";

export type RaceChoiceOptionLike = {
  optionId: number;
  subraceId?: number | null;
  choiceGroupName: string;
  optionName: string;
  description?: string | null;
  selectMultiple?: boolean;
  maxSelection?: number;
};

type Props = {
  groupedOptions: { groupName: string; options: RaceChoiceOptionLike[] }[];
  selections: Record<string, number | number[]>;
  onSelectOption: (groupName: string, optionId: number) => void;
};

export function RaceChoiceOptionGroups({ groupedOptions, selections, onSelectOption }: Props) {
  return (
    <div className="space-y-4">
      {groupedOptions.map(({ groupName, options }) => (
        <Card key={groupName}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Група</p>
                <p className="text-base font-semibold text-white">{groupName}</p>
              </div>
              <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                Оберіть 1
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((opt) => {
                const selected = selections[groupName] === opt.optionId;

                return (
                  <Card
                    key={opt.optionId}
                    className={clsx(
                      "glass-card cursor-pointer transition-all duration-200",
                      selected ? "glass-active" : ""
                    )}
                    {...buildSelectableCardProps({
                      isSelected: selected,
                      isMultiSelect: false,
                      onSelect: () => onSelectOption(groupName, opt.optionId),
                    })}
                  >
                    <CardContent className="flex h-full flex-col gap-2 p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-white">{opt.optionName}</p>
                        <Badge
                          variant={selected ? "secondary" : "outline"}
                          className={clsx(
                            "border-white/15 bg-white/5 text-slate-200",
                            selected && "text-slate-100"
                          )}
                        >
                          {selected ? "Обрано" : "Обрати"}
                        </Badge>
                      </div>

                      {opt.description ? (
                        <FormattedDescription
                          content={opt.description}
                          className="text-sm text-slate-200/90"
                        />
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

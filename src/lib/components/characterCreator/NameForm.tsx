"use client";

import { nameSchema } from "@/lib/zod/schemas/persCreateSchema";
import { useStepForm } from "@/hooks/useStepForm";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { raceTranslations, classTranslations, backgroundTranslations } from "@/lib/refs/translation";
import { BackgroundI, ClassI, RaceI, FeatPrisma } from "@/lib/types/model-types";
import { RaceVariant } from "@prisma/client";
import { useCharacterStats } from "@/hooks/useCharacterStats";
import { useFantasyNameGenerator } from "@/hooks/useFantasyNameGenerator";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";

interface Props {
  formId: string;
  race?: RaceI;
  raceVariant?: RaceVariant | null;
  selectedClass?: ClassI;
  background?: BackgroundI;
  feat?: FeatPrisma | null;
  onSuccess?: () => void;
}

const SummaryCard = ({ label, value }: { label: string; value?: string }) => (
  <Card className="shadow-inner">
    <CardHeader className="pb-2">
      <CardDescription className="text-slate-400">{label}</CardDescription>
      <CardTitle className="text-white text-lg">{value ?? "Не обрано"}</CardTitle>
    </CardHeader>
  </Card>
);

const StatsSummary = ({ stats }: { stats: ReturnType<typeof useCharacterStats> }) => {
  const attributes = [
    { key: 'STR', label: 'СИЛ' },
    { key: 'DEX', label: 'СПР' },
    { key: 'CON', label: 'СТА' },
    { key: 'INT', label: 'ІНТ' },
    { key: 'WIS', label: 'МУД' },
    { key: 'CHA', label: 'ХАР' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {attributes.map((attr) => {
        const stat = stats[attr.key];
        return (
          <div key={attr.key} className="flex flex-col items-center rounded-lg border border-white/10 bg-white/5 p-2">
            <span className="text-[10px] font-bold uppercase text-slate-500">{attr.label}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{stat.total}</span>
              {stat.bonus > 0 && (
                <span
                  className="text-[10px] text-indigo-400"
                  title={`База: ${stat.base}, Бонус: +${stat.bonus}`}
                >
                  (+{stat.bonus})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className={clsx(
                "h-5 px-1 text-[10px]",
                stat.mod >= 0 ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"
              )}>
                {stat.mod >= 0 ? `+${stat.mod}` : stat.mod}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const NameForm = ({ formId, race, raceVariant, selectedClass, background, feat, onSuccess }: Props) => {
  const { form, onSubmit } = useStepForm(nameSchema, onSuccess);
  const stats = useCharacterStats({ race, raceVariant, feat });
  const { currentName, generateName } = useFantasyNameGenerator();

  const raceName = race ? raceTranslations[race.name] : undefined;
  const className = selectedClass ? classTranslations[selectedClass.name] : undefined;
  const bgName = background ? backgroundTranslations[background.name] : undefined;

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Ім&apos;я персонажа</CardTitle>
          <CardDescription className="text-slate-400">
            Завершіть створення та перевірте вибір.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="Раса" value={raceName} />
            <SummaryCard label="Клас" value={className} />
            <SummaryCard label="Передісторія" value={bgName} />
          </div>

          <div className="space-y-2">
             <h3 className="text-sm font-medium text-slate-300">Фінальні характеристики</h3>
             <StatsSummary stats={stats} />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300" htmlFor="name">Ім&apos;я</label>
            <div className="flex gap-2">
              <Input
                id="name"
                placeholder={currentName || "Наприклад, Аравор"}
                {...form.register('name')}
                className="border-white/10 bg-white/5 text-white focus-visible:ring-cyan-400/30"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/7"
                onClick={() => generateName()}
                title="Згенерувати інше імʼя"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-slate-200"
                onClick={() => form.setValue('name', currentName, { shouldDirty: true })}
                disabled={!currentName}
                title="Використати запропоноване імʼя"
              >
                Використати
              </Button>
            </div>
            {currentName ? (
              <p className="text-xs text-slate-500">
                Підказка: <span className="text-slate-300">{currentName}</span>
              </p>
            ) : null}
            <p className="text-xs text-slate-500">Це ім&apos;я побачите у підсумку та на листі персонажа.</p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default NameForm;

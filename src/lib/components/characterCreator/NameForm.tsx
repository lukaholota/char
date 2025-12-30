"use client";

import React, { useMemo, useState, forwardRef } from "react";
import { nameSchema } from "@/lib/zod/schemas/persCreateSchema";
import { useStepForm } from "@/hooks/useStepForm";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  backgroundTranslations,
  classTranslations,
  raceTranslations,
  weaponTranslations,
  armorTranslations,
  asiSystemTranslations,
  asiModeTranslations,
  sourceTranslations,
} from "@/lib/refs/translation";
import { BackgroundI, ClassI, RaceI, FeatPrisma } from "@/lib/types/model-types";
import { RaceVariant } from "@prisma/client";
import { useCharacterStats } from "@/hooks/useCharacterStats";
import { useFantasyNameGenerator } from "@/hooks/useFantasyNameGenerator";
import clsx from "clsx";
import { HelpCircle, RefreshCw } from "lucide-react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { Weapon } from "@prisma/client";
import {
  formatArmorProficiencies,
  formatASI,
  formatList,
  formatLanguages,
  formatMulticlassReqs,
  formatSkillProficiencies,
  formatSpeeds,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import {
  ControlledInfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { RaceInfoModal } from "@/lib/components/characterCreator/modals/RaceInfoModal";
import { ClassInfoModal } from "@/lib/components/characterCreator/modals/ClassInfoModal";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";
import { BackgroundInfoModal } from "@/lib/components/characterCreator/modals/BackgroundInfoModal";
import { SubraceInfoModal } from "@/lib/components/characterCreator/modals/SubraceInfoModal";
import { RaceVariantInfoModal } from "@/lib/components/characterCreator/modals/RaceVariantInfoModal";
import { FeatInfoModal } from "@/lib/components/characterCreator/modals/FeatInfoModal";

interface Props {
  formId: string;
  race?: RaceI;
  raceVariant?: RaceVariant | null;
  selectedClass?: ClassI;
  background?: BackgroundI;
  feat?: FeatPrisma | null;
  weapons?: Weapon[];
  onSuccess?: () => void;
}

const SummaryCard = forwardRef<HTMLDivElement, { label: string; value?: string; hasModal?: boolean }>(
  ({ label, value, hasModal, ...props }, ref) => {
    if (!value) return null;
    return (
      <div ref={ref} {...props} className="h-full">
        <Card 
          className={clsx("shadow-inner transition-all duration-200 h-full", hasModal && "relative cursor-pointer hover:bg-white/5 hover:border-white/20 active:scale-[0.98]")}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">{label}</CardDescription>
            <CardTitle className="text-white text-lg flex items-center justify-between">
              {value}
              {hasModal && <HelpCircle className="h-4 w-4 text-slate-500" />}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }
);
SummaryCard.displayName = "SummaryCard";

const FeatureInfoItem = forwardRef<HTMLDivElement, { label: string; value: string; className?: string }>(
  ({ label, value, className, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        {...props} 
        className={clsx("text-sm text-slate-200 cursor-pointer hover:text-cyan-400 transition-colors py-0.5", className)}
      >
        <span className="text-slate-400">{label}:</span> {value}
      </div>
    );
  }
);
FeatureInfoItem.displayName = "FeatureInfoItem";

const SimpleClickableItem = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        {...props} 
        className={clsx("cursor-pointer hover:text-cyan-400 transition-colors", className)}
      >
        {children}
      </div>
    );
  }
);
SimpleClickableItem.displayName = "SimpleClickableItem";

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

export const NameForm = ({ formId, race, raceVariant, selectedClass, background, feat, weapons, onSuccess }: Props) => {
  const { form, onSubmit } = useStepForm(nameSchema, (data) => {
    const trimmed = String(data?.name ?? "").trim();
    if (!trimmed && currentName) {
      form.setValue("name", currentName, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
    onSuccess?.();
  });
  const stats = useCharacterStats({ race, raceVariant, feat });
  const { currentName, generateName } = useFantasyNameGenerator();
  const formData = usePersFormStore((s) => s.formData);

  const [packInfoOpen, setPackInfoOpen] = useState(false);
  const [currentPack, setCurrentPack] = useState<any>(null);

  const raceName = race ? raceTranslations[race.name as keyof typeof raceTranslations] : undefined;
  const className = selectedClass ? classTranslations[selectedClass.name as keyof typeof classTranslations] : undefined;
  const bgName = background ? backgroundTranslations[background.name as keyof typeof backgroundTranslations] : undefined;

  const subrace = (race?.subraces || []).find((sr: any) => sr.subraceId === (formData.subraceId ?? undefined));
  const subraceName = subrace ? translateValue((subrace as any).name) : undefined;
  const raceVariantName = raceVariant ? translateValue((raceVariant as any).name) : undefined;

  const subclass = (selectedClass?.subclasses || []).find((sc: any) => sc.subclassId === (formData.subclassId ?? undefined));
  const subclassName = subclass ? translateValue((subclass as any).name) : undefined;
  const featName = feat ? translateValue((feat as any).name) : undefined;

  const raceChoiceSelections = useMemo(() => {
    const raw = (formData.raceChoiceSelections || {}) as Record<string, number>;
    const availableGroups = new Set(((race as any)?.raceChoiceOptions || []).map((o: any) => o.choiceGroupName));
    return Object.fromEntries(Object.entries(raw).filter(([group]) => availableGroups.has(group)));
  }, [formData.raceChoiceSelections, race]);

  const classChoiceSelections = useMemo(() => {
    const raw = (formData.classChoiceSelections || {}) as Record<string, number>;
    const availableGroups = new Set((selectedClass?.classChoiceOptions || []).map((o: any) => o.choiceOption?.groupName));
    return Object.fromEntries(Object.entries(raw).filter(([group]) => availableGroups.has(group)));
  }, [formData.classChoiceSelections, selectedClass]);

  const subclassChoiceSelections = useMemo(() => {
    const raw = (formData.subclassChoiceSelections || {}) as Record<string, number>;
    const availableGroups = new Set(((subclass as any)?.subclassChoiceOptions || []).map((o: any) => o.choiceOption?.groupName));
    return Object.fromEntries(Object.entries(raw).filter(([group]) => availableGroups.has(group)));
  }, [formData.subclassChoiceSelections, subclass]);

  const featChoiceSelections = useMemo(() => {
    const raw = (formData.featChoiceSelections || {}) as Record<string, number>;
    const availableGroups = new Set(((feat as any)?.featChoiceOptions || []).map((o: any) => o.choiceOption?.groupName));
    return Object.fromEntries(Object.entries(raw).filter(([group]) => availableGroups.has(group)));
  }, [formData.featChoiceSelections, feat]);

  const skills = (formData.skills || []) as Array<string>;
  const expertise = ((formData.expertiseSchema as any)?.expertises || []) as Array<string>;

  const optionalDecisions = (formData.classOptionalFeatureSelections || {}) as Record<string, boolean>;
  const acceptedOptional = (selectedClass?.classOptionalFeatures || [])
    .filter((item: any) => item.optionalFeatureId != null)
    .filter((item: any) => optionalDecisions[String(item.optionalFeatureId)] === true)
    .map((item: any) => ({
      id: String(item.optionalFeatureId),
      title: String(item.title || item.feature?.name || item.optionalFeatureId),
      feature: item.feature,
    }));

  const choiceGroupToId = ((formData.equipmentSchema as any)?.choiceGroupToId || {}) as Record<string, number[]>;
  const anyWeaponSelection = ((formData.equipmentSchema as any)?.anyWeaponSelection || {}) as Record<string, number[]>;

  const startingEquipment = selectedClass?.startingEquipmentOption || [];
  const equipmentByOptionId = new Map<number, any>();
  for (const item of startingEquipment as any[]) {
    const id = Number(item.optionId);
    if (Number.isFinite(id)) equipmentByOptionId.set(id, item);
  }

  const weaponById = useMemo(() => {
    const map = new Map<number, Weapon>();
    for (const w of weapons || []) map.set(w.weaponId, w);
    return map;
  }, [weapons]);

  const resolveChoiceOptionLabel = (opt: any) => {
    const ukr = opt?.choiceOption?.optionName;
    const eng = opt?.choiceOption?.optionNameEng;
    return String(ukr || (eng ? translateValue(eng) : opt?.choiceOption?.optionNameEng) || opt?.choiceOptionId || opt?.optionId || "");
  };

  const resolveRaceChoiceLabel = (optionId: number) => {
    const raw = ((race as any)?.raceChoiceOptions || []) as any[];
    const found = raw.find((x) => Number(x.optionId) === Number(optionId));
    return found;
  };

  const resolveClassChoiceLabel = (optionId: number) => {
    const list = (selectedClass?.classChoiceOptions || []) as any[];
    const found = list.find((x) => Number(x.optionId ?? x.choiceOptionId) === Number(optionId));
    return found;
  };

  const resolveSubclassChoiceLabel = (optionId: number) => {
    const list = ((subclass as any)?.subclassChoiceOptions || []) as any[];
    const found = list.find((x) => Number(x.optionId ?? x.choiceOptionId) === Number(optionId));
    return found;
  };

  const resolveFeatChoiceLabel = (optionId: number) => {
    const list = ((feat as any)?.featChoiceOptions || []) as any[];
    const found = list.find((x) => Number(x.choiceOptionId ?? x.optionId) === Number(optionId));
    return found;
  };

  const resolveEquipmentOptionLabel = (optionId: number) => {
    const item = equipmentByOptionId.get(Number(optionId));
    const parts: string[] = [];
    const weapon = (item as any)?.weapon;
    const armor = (item as any)?.armor;
    const pack = (item as any)?.equipmentPack;
    const desc = (item as any)?.description;
    const qty = Number((item as any)?.quantity);
    
    if (typeof desc === "string" && desc.trim()) parts.push(desc.trim());
    if (weapon?.name) parts.push(weaponTranslations[weapon.name as keyof typeof weaponTranslations] ?? String(weapon.name));
    if (armor?.name) parts.push(armorTranslations[armor.name as keyof typeof armorTranslations] ?? String(armor.name));
    if (pack?.name) parts.push(translateValue(pack.name));
    
    const label = parts.filter(Boolean).join(" • ");
    const q = Number.isFinite(qty) && qty > 1 ? ` x${qty}` : "";
    return label ? `${label}${q}` : String(optionId);
  };


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
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {race && (
              <RaceInfoModal race={race} trigger={<SummaryCard label="Раса" value={raceName} hasModal />} />
            )}
            {subrace && (
              <SubraceInfoModal subrace={subrace} trigger={<SummaryCard label="Підраса" value={subraceName} hasModal />} />
            )}
            {raceVariant && (
              <RaceVariantInfoModal variant={raceVariant} trigger={<SummaryCard label="Варіант раси" value={raceVariantName} hasModal />} />
            )}
            {selectedClass && (
              <ClassInfoModal cls={selectedClass} trigger={<SummaryCard label="Клас" value={className} hasModal />} />
            )}
            {subclass && (
              <SubclassInfoModal subclass={subclass} trigger={<SummaryCard label="Підклас" value={subclassName} hasModal />} />
            )}
            {background && (
              <BackgroundInfoModal background={background} trigger={<SummaryCard label="Передісторія" value={bgName} hasModal />} />
            )}
            {feat && (
              <FeatInfoModal feat={feat as any} trigger={<SummaryCard label="Риса" value={featName} hasModal />} />
            )}
          </div>

          <div className="space-y-2">
             <h3 className="text-sm font-medium text-slate-300">Фінальні характеристики</h3>
             <StatsSummary stats={stats} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {Object.keys(raceChoiceSelections).length > 0 && (
              <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Опції раси</div>
                <div className="mt-2 space-y-1">
                  {Object.entries(raceChoiceSelections).map(([group, optionId]) => {
                    const opt = resolveRaceChoiceLabel(Number(optionId));
                    const label = String(opt?.optionName || opt?.description || optionId);
                    const feature = opt?.traits?.create?.[0]?.feature?.connect || opt?.traits?.[0]?.feature;
                    
                    if (feature) {
                      return (
                        <FeatInfoModal 
                          key={group} 
                          feat={feature as any} 
                          trigger={<FeatureInfoItem label={group} value={label} />} 
                        />
                      );
                    }

                    return (
                      <div key={group} className="text-sm text-slate-200">
                        <span className="text-slate-400">{group}:</span> {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {Object.keys(classChoiceSelections).length > 0 && (
              <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Опції класу</div>
                <div className="mt-2 space-y-1">
                  {Object.entries(classChoiceSelections).map(([group, optionId]) => {
                    const opt = resolveClassChoiceLabel(Number(optionId));
                    const label = opt ? resolveChoiceOptionLabel(opt) : String(optionId);
                    const feature = opt?.choiceOption?.features?.create?.[0]?.feature?.connect || opt?.choiceOption?.features?.[0]?.feature;

                    if (feature) {
                      return (
                        <FeatInfoModal 
                          key={group} 
                          feat={feature as any} 
                          trigger={<FeatureInfoItem label={group} value={label} />} 
                        />
                      );
                    }

                    return (
                      <div key={group} className="text-sm text-slate-200">
                        <span className="text-slate-400">{group}:</span> {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {Object.keys(subclassChoiceSelections).length > 0 && (
              <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Опції підкласу</div>
                <div className="mt-2 space-y-1">
                  {Object.entries(subclassChoiceSelections).map(([group, optionId]) => {
                    const opt = resolveSubclassChoiceLabel(Number(optionId));
                    const label = opt ? resolveChoiceOptionLabel(opt) : String(optionId);
                    const feature = opt?.choiceOption?.features?.create?.[0]?.feature?.connect || opt?.choiceOption?.features?.[0]?.feature;

                    if (feature) {
                      return (
                        <FeatInfoModal 
                          key={group} 
                          feat={feature as any} 
                          trigger={<FeatureInfoItem label={group} value={label} />} 
                        />
                      );
                    }

                    return (
                      <div key={group} className="text-sm text-slate-200">
                        <span className="text-slate-400">{group}:</span> {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {Object.keys(featChoiceSelections).length > 0 && (
              <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Опції риси</div>
                <div className="mt-2 space-y-1">
                  {Object.entries(featChoiceSelections).map(([group, optionId]) => {
                    const opt = resolveFeatChoiceLabel(Number(optionId));
                    const label = opt ? resolveChoiceOptionLabel(opt) : String(optionId);
                    const feature = opt?.choiceOption?.features?.create?.[0]?.feature?.connect || opt?.choiceOption?.features?.[0]?.feature;

                    if (feature) {
                      return (
                        <FeatInfoModal 
                          key={group} 
                          feat={feature as any} 
                          trigger={<FeatureInfoItem label={group} value={label} />} 
                        />
                      );
                    }

                    return (
                      <div key={group} className="text-sm text-slate-200">
                        <span className="text-slate-400">{group}:</span> {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {skills.length > 0 && (
              <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Навички</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {skills.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-white/5 text-slate-200 border-white/10">
                      {translateValue(s)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {expertise.length > 0 && (
              <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Експертиза</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {expertise.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                      {translateValue(s)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {acceptedOptional.length > 0 && (
              <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Додаткові риси класу (взяті)</div>
                <div className="mt-2 space-y-1">
                  {acceptedOptional.map((x) => {
                    if (x.feature) {
                      return (
                        <FeatInfoModal 
                          key={x.id} 
                          feat={x.feature} 
                          trigger={<SimpleClickableItem className="text-sm text-slate-200">{x.title}</SimpleClickableItem>} 
                        />
                      );
                    }
                    return (
                      <div key={x.id} className="text-sm text-slate-200">
                        {x.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">ASI</div>
              <div className="mt-2 space-y-1 text-sm text-slate-200">
                <div><span className="text-slate-400">Система:</span> {asiSystemTranslations[formData.asiSystem ?? ""] ?? String(formData.asiSystem ?? "—")}</div>
                <div><span className="text-slate-400">Режим:</span> {asiModeTranslations[(formData.isDefaultASI ?? true) ? "BASIC" : "TASHA"]}</div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Спорядження</div>
            <div className="mt-2 space-y-2">
              {Object.keys(choiceGroupToId).length ? (
                Object.entries(choiceGroupToId).map(([group, optionIds]) => (
                  <div key={group} className="space-y-1 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <div className="text-sm text-slate-200"><span className="text-slate-400">Опція {group}:</span></div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-200">
                      {(optionIds || []).map((id, idx) => {
                        const item = equipmentByOptionId.get(Number(id));
                        const label = resolveEquipmentOptionLabel(Number(id));
                        const pack = (item as any)?.equipmentPack;
                        
                        return (
                          <span key={id}>
                            {pack ? (
                              <button 
                                type="button"
                                onClick={() => {
                                  setCurrentPack(pack);
                                  setPackInfoOpen(true);
                                }}
                                className="text-left text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/30"
                              >
                                {label}
                              </button>
                            ) : (
                              label
                            )}
                            {idx < (optionIds || []).length - 1 && " • "}
                          </span>
                        );
                      })}
                    </div>

                    {Array.isArray(anyWeaponSelection[group]) && anyWeaponSelection[group].length ? (
                      <div className="text-xs text-slate-400">
                        Зброя: {(anyWeaponSelection[group] || [])
                          .map((wid) => weaponById.get(Number(wid)))
                          .filter(Boolean)
                          .map((w) => weaponTranslations[(w as Weapon).name as keyof typeof weaponTranslations] ?? (w as Weapon).name)
                          .join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400">Немає</div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500">Це ім&apos;я побачите у підсумку та на листі персонажа.</p>
        </CardContent>
      </Card>

      <ControlledInfoDialog
        open={packInfoOpen}
        onOpenChange={setPackInfoOpen}
        title={currentPack?.name ?? "Набір спорядження"}
      >
        <div className="space-y-4">
          <FormattedDescription content={currentPack?.description} />
          <div className="space-y-2">
            <InfoSectionTitle>Вміст набору</InfoSectionTitle>
            <ul className="list-inside list-disc space-y-1">
              {(currentPack?.items || []).map((item: any, idx: number) => (
                <li key={idx} className="text-sm text-slate-300">
                  {item.name} {item.quantity > 1 ? `x${item.quantity}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ControlledInfoDialog>
    </form>
  );
};

export default NameForm;

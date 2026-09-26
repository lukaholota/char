"use client";

import { ClassI } from "@/lib/types/model-types";
import {
  ControlledInfoDialog,
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  formatAbilityList,
  formatArmorProficiencies,
  formatLanguages,
  formatMulticlassReqs,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { classTranslations, attributesUkrShort } from "@/lib/refs/translation";
import { buildClassTable } from "@/rules/class-table";
import { ClassTableView } from "@/components/classes/ClassTableView";
import { Button } from "@/components/ui/button";
import { Layers3 } from "lucide-react";
import { SubclassListDialogBody } from "@/lib/components/characterCreator/modals/SubclassListDialogBody";
import { splitSubclassesForStep, type SubclassCard } from "@/lib/logic/legacy-subclass-visibility";
import { getSubclassesByClassId } from "@/lib/actions/class-actions";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";

interface Props {
  cls: ClassI;
  triggerClassName?: string;
  trigger?: ReactNode;
  asyncFetchSubclasses?: boolean;
}

export const ClassInfoModal = ({
  cls,
  triggerClassName,
  trigger,
  asyncFetchSubclasses = false,
}: Props) => {
  const [classTableOpen, setClassTableOpen] = useState(false);
  const [subclassesOpen, setSubclassesOpen] = useState(false);
  const [isLoadingSubclasses, setIsLoadingSubclasses] = useState(false);

  const preloadedSubclasses = useMemo(() => {
    const raw = Array.isArray((cls as any)?.subclasses)
      ? (cls as any).subclasses
      : [];
    return raw;
  }, [cls]);

  const [loadedSubclasses, setLoadedSubclasses] = useState<any[] | null>(
    asyncFetchSubclasses ? null : preloadedSubclasses,
  );

  useEffect(() => {
    setLoadedSubclasses(asyncFetchSubclasses ? null : preloadedSubclasses);
    setIsLoadingSubclasses(false);
  }, [asyncFetchSubclasses, cls.classId, preloadedSubclasses]);

  const ensureSubclassesLoaded = useCallback(async () => {
    if (!asyncFetchSubclasses) return;
    if (loadedSubclasses !== null || isLoadingSubclasses) return;

    setIsLoadingSubclasses(true);
    try {
      const subclasses = await getSubclassesByClassId(cls.classId);
      setLoadedSubclasses(Array.isArray(subclasses) ? subclasses : []);
    } catch (error) {
      console.error("Failed to fetch subclasses:", error);
      setLoadedSubclasses([]);
    } finally {
      setIsLoadingSubclasses(false);
    }
  }, [
    asyncFetchSubclasses,
    cls.classId,
    isLoadingSubclasses,
    loadedSubclasses,
  ]);

  const handleOpenClassTable = async () => {
    setClassTableOpen(true);
    await ensureSubclassesLoaded();
  };

  const handleOpenSubclasses = async () => {
    setSubclassesOpen(true);

    await ensureSubclassesLoaded();
  };

  const features = [...(cls.features || [])].sort((a, b) => {
    const lvlA = a.levelGranted ?? 0;
    const lvlB = b.levelGranted ?? 0;
    if (lvlA !== lvlB) return lvlA - lvlB;
    return (a.classFeatureId || 0) - (b.classFeatureId || 0);
  });

  const subclassesForTable = useMemo(() => {
    return loadedSubclasses ?? preloadedSubclasses;
  }, [loadedSubclasses, preloadedSubclasses]);

  const classTable = useMemo(() => buildClassTable(cls, subclassesForTable), [cls, subclassesForTable]);

  const subclassBlocks = useMemo(
    () => splitSubclassesForStep(loadedSubclasses ?? [], true, (subclass: SubclassCard) => translateValue(subclass.name) || subclass.name),
    [loadedSubclasses],
  );

  const showSubclassCount = !asyncFetchSubclasses || loadedSubclasses !== null;

  const title =
    classTranslations[cls.name as keyof typeof classTranslations] || cls.name;

  return (
    <>
      <InfoDialog
        title={title}
        triggerLabel={`Показати деталі ${title}`}
        triggerClassName={triggerClassName}
        trigger={trigger}
      >
        <InfoGrid>
          <InfoPill label="Кістка хітів" value={`d${cls.hitDie}`} />
          <InfoPill
            label="Чаклунство"
            value={translateValue(cls.spellcastingType)}
          />
          <InfoPill
            label="Підклас з рівня"
            value={`Рівень ${cls.subclassLevel}`}
          />
          <InfoPill
            label="Рятунки"
            value={formatAbilityList(cls.savingThrows)}
          />
          <InfoPill
            label="Навички"
            value={formatSkillProficiencies(cls.skillProficiencies)}
          />
          <InfoPill
            label="Інструменти"
            value={formatToolProficiencies(
              cls.toolProficiencies,
              cls.toolToChooseCount,
            )}
          />
          <InfoPill
            label="Зброя"
            value={formatWeaponProficiencies(
              cls.weaponProficiencies,
              cls.weaponProficienciesSpecial,
            )}
          />
          <InfoPill
            label="Броня"
            value={formatArmorProficiencies(cls.armorProficiencies)}
          />
          <InfoPill
            label="Мови"
            value={formatLanguages(cls.languages, cls.languagesToChooseCount)}
          />
          <InfoPill
            label="Мультиклас"
            value={formatMulticlassReqs(cls.multiclassReqs)}
          />
          {cls.primaryCastingStat && (
            <InfoPill
              label="Ключова характеристика"
              value={
                attributesUkrShort[
                  cls.primaryCastingStat as keyof typeof attributesUkrShort
                ]
              }
            />
          )}
        </InfoGrid>

        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="glass-panel border-gradient-rpg w-full justify-between text-slate-100 hover:text-white"
            onClick={handleOpenClassTable}
          >
            <span>Таблиця класу</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="glass-panel border-gradient-rpg w-full justify-between text-slate-100 hover:text-white"
            onClick={handleOpenSubclasses}
          >
            <span className="inline-flex items-center gap-2">
              <Layers3 className="h-4 w-4" />
              Підкласи
            </span>
            {showSubclassCount ? (
              <span className="text-xs text-slate-300">
                {subclassBlocks.current.length + subclassBlocks.legacy.length}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="space-y-4">
          {Array.from(new Set(features.map((f) => f.levelGranted)))
            .sort((a, b) => (a || 0) - (b || 0))
            .map((lvl) => (
              <div key={lvl} className="space-y-2">
                <InfoSectionTitle>Вміння {lvl}-го рівня</InfoSectionTitle>
                <div className="space-y-2">
                  {features
                    .filter((f) => f.levelGranted === lvl)
                    .map((f: any) => (
                      <div
                        key={f.classFeatureId}
                        className="glass-panel border-gradient-rpg rounded-lg px-3 py-2.5"
                      >
                        <p className="font-bold text-slate-200">
                          {f.feature.name}
                        </p>
                        <FormattedDescription
                          content={f.feature.description}
                          className="text-sm text-slate-400"
                        />
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </InfoDialog>

      <ControlledInfoDialog
        open={classTableOpen}
        onOpenChange={setClassTableOpen}
        title={`Таблиця класу: ${title}`}
        contentClassName="w-[95vw] max-w-[95vw] sm:max-w-[860px]"
      >
        <ClassTableView table={classTable} className="max-h-[72vh]" />
      </ControlledInfoDialog>

      <ControlledInfoDialog
        open={subclassesOpen}
        onOpenChange={setSubclassesOpen}
        title={`Підкласи: ${title}`}
        contentClassName="w-[95vw] max-w-[95vw] sm:max-w-2xl overflow-x-hidden"
      >
        <SubclassListDialogBody current={subclassBlocks.current} legacy={subclassBlocks.legacy} isLoading={isLoadingSubclasses} />
      </ControlledInfoDialog>
    </>
  );
};

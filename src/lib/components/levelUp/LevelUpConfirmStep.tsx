"use client";

import type { Pers } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BastionLevelUpNote } from "@/components/bastions/BastionLevelUpNote";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import type { ClassI, SubclassI, FeatPrisma } from "@/lib/types/model-types";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { translateSubclassName } from "@/lib/refs/subclass-name";
import { attributesUkrShort } from "@/lib/refs/translation";
import { ABILITY_KEYS } from "@/rules/feat-grants";
import { findAbilityScoresAfterLevelUp } from "@/rules/levelup-ability-scores";
import { SelectedSpellSummary } from "@/lib/components/wizard/SelectedSpellSummary";
import { collectCreationSpellGroups } from "@/lib/components/characterCreator/CreationSelectionSummary";
import type { HitPointSource } from "./levelup-hit-point-sources";

type NamedFeature = { featureId: number; feature: { name: string } };
type Character = Pick<Pers, "persId" | "level" | "ruleset" | "str" | "dex" | "con" | "int" | "wis" | "cha"> & {
  feats?: readonly { feat: { name: string } }[];
};
type Props = {
  totalLevel: number;
  className: string;
  classLevelAfter: number;
  formData: Partial<PersFormData>;
  pers: Character;
  allFeats: readonly FeatPrisma[];
  traitHitPointsPerLevel: number;
  hitPointSources?: readonly HitPointSource[];
  selectedClass: ClassI | null;
  effectiveSubclass: SubclassI | null;
  newFeatures: readonly NamedFeature[];
};

export function LevelUpConfirmStep({ totalLevel, className, classLevelAfter, formData, pers, allFeats,
  traitHitPointsPerLevel, hitPointSources = [], selectedClass, effectiveSubclass, newFeatures }: Props) {
  const selectedFeat = allFeats.find((feat) => feat.featId === Number(formData.featId));
  const before = { STR: pers.str, DEX: pers.dex, CON: pers.con, INT: pers.int, WIS: pers.wis, CHA: pers.cha };
  const after = findAbilityScoresAfterLevelUp({ scores: before, ruleset: pers.ruleset,
    classIncreases: formData.customAsi, feat: selectedFeat, featChoiceSelections: formData.featChoiceSelections });
  const conMod = Math.floor((after.CON - 10) / 2);
  const retroactive = (conMod - Math.floor((pers.con - 10) / 2)) * pers.level;
  const tough = selectedFeat?.name === "TOUGH" ? 2 * totalLevel : pers.feats?.some((owned) => owned.feat.name === "TOUGH") ? 2 : 0;
  const hitDie = Number(formData.levelUpHpIncrease) || 0;
  const hpParts = [
    `Кістка ${hitDie}`, `СТА ${formatSigned(conMod)}`,
    ...(tough ? [`Здоровань +${tough}`] : []),
    ...(hitPointSources.length > 0 ? hitPointSources.map((source) => `${source.name} +${source.amount}`)
      : traitHitPointsPerLevel ? [`Від умінь +${traitHitPointsPerLevel}`] : []),
    ...(retroactive ? [`За попередні рівні ${formatSigned(retroactive)}`] : []),
  ];
  const groups = [
    { title: "Нові вміння", names: [...new Map(newFeatures.map((link) => [link.featureId, link.feature.name])).values()] },
    { title: "Підклас", names: formData.subclassId && effectiveSubclass ? [translateSubclassName(effectiveSubclass.name)] : [] },
    { title: "Риса", names: selectedFeat ? [translateValue(selectedFeat.name)] : [] },
    { title: "Характеристики", names: ABILITY_KEYS.filter((ability) => before[ability] !== after[ability])
      .map((ability) => `${attributesUkrShort[ability]}: ${before[ability]} → ${after[ability]}`) },
    { title: "Опції класу", names: collectSelectedNames(formData.classChoiceSelections, selectedClass?.classChoiceOptions) },
    { title: "Опції підкласу", names: collectSelectedNames(formData.subclassChoiceSelections, effectiveSubclass?.subclassChoiceOptions) },
    { title: "Опції риси", names: collectSelectedNames(formData.featChoiceSelections, selectedFeat?.featChoiceOptions) },
    { title: "Додаткові вміння", names: (selectedClass?.classOptionalFeatures ?? [])
      .filter((option) => formData.classOptionalFeatureSelections?.[option.optionalFeatureId])
      .map((option) => option.title || option.feature?.name || "Додаткове вміння") },
    { title: "Навички", names: (formData.skills ?? []).map(translateValue) },
    { title: "Експертиза", names: (formData.expertiseSchema?.expertises ?? []).map(translateValue) },
    { title: "Мови", names: (formData.languagesSchema?.languages ?? []).map(translateValue) },
  ];

  return <Card className="glass-card">
    <CardHeader><CardTitle className="text-xl text-slate-100">Перевірка змін</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      <div className="space-y-1 text-slate-200">
        <p>Новий загальний рівень: <strong>{totalLevel}</strong></p>
        <p>{className}: <strong>{classLevelAfter}-й рівень</strong></p>
      </div>
      {groups.filter((group) => group.names.length > 0).map((group) => <section key={group.title} aria-label={group.title}>
        <h3 className="mb-1 text-sm font-semibold text-slate-100">{group.title}</h3>
        <ul className="space-y-1 text-sm text-slate-300">
          {group.names.map((name, index) => <li key={`${index}:${name}`} className="break-words"><FormattedDescription content={name} /></li>)}
        </ul>
      </section>)}
      {typeof formData.levelUpHpIncrease === "number" && <section aria-label="Приріст HP" className="border-t border-white/10 pt-3">
        <p className="font-semibold tabular-nums text-slate-100">Приріст HP: {formatSigned(hitDie + conMod + tough + traitHitPointsPerLevel + retroactive)}</p>
        <p className="mt-1 text-sm text-slate-400">{hpParts.join(" + ")}</p>
      </section>}
      <SelectedSpellSummary ruleset={pers.ruleset} groups={[
        ...collectCreationSpellGroups(formData),
        { label: "Заклинання риси рівня", ids: formData.featSpellIds ?? [] },
      ]} />
      <BastionLevelUpNote persId={pers.persId} ruleset={pers.ruleset} fromLevel={pers.level} toLevel={totalLevel} />
    </CardContent>
  </Card>;
}

function formatSigned(amount: number): string {
  return amount >= 0 ? `+${amount}` : String(amount);
}

function collectSelectedNames(selections: Record<string, number | number[]> | undefined,
  options: readonly { choiceOptionId: number; choiceOption: { optionName: string } }[] | undefined): string[] {
  const ids = new Set(Object.values(selections ?? {}).flat());
  return (options ?? []).filter((option) => ids.has(option.choiceOptionId)).map((option) => option.choiceOption.optionName);
}

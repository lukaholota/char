import type { PersWithRelations } from "@/lib/actions/pers";
import { formatArmorProficiencies, formatList } from "@/lib/components/characterCreator/infoUtils";
import { collectActiveFeatures } from "@/lib/logic/bonus-calculator";
import { collectDerivedProficiencies, type DerivedProficiencies, type ProficiencySource } from "@/rules/derived-proficiencies";
import { collectOriginLanguages } from "@/rules/languages";
import { findMulticlassProficiencies } from "@/rules/multiclass-proficiencies";

export type PersProficiencyLines = {
  proficiencies: string[];
  languages: string;
};

export function calculatePersProficiencies(pers: PersWithRelations): DerivedProficiencies {
  return collectDerivedProficiencies([
    ...collectOriginSources(pers),
    ...collectClassSources(pers),
    ...collectFeatSources(pers),
    ...collectActiveFeatures(pers).map(toFeatureSource),
  ]);
}

export function formatPersProficiencyLines(derived: DerivedProficiencies): PersProficiencyLines {
  const weaponLine = [...derived.weaponTypes, ...derived.weapons];
  return {
    proficiencies: [
      derived.armor.length ? `Обладунки: ${formatArmorProficiencies(derived.armor)}` : "",
      weaponLine.length ? `Зброя: ${formatList(weaponLine)}` : "",
      derived.tools.length ? `Інструменти: ${formatList(derived.tools)}` : "",
    ].filter(Boolean),
    languages: derived.languages.length ? formatList(derived.languages) : "",
  };
}

function collectOriginSources(pers: PersWithRelations): ProficiencySource[] {
  const race = pers.race;
  const subrace = pers.subrace;
  return [
    { languages: collectOriginLanguages(pers.ruleset, []) },
    race
      ? { armor: race.armorProficiencies, weapons: race.weaponProficiencies, tools: race.toolProficiencies, languages: race.languages }
      : {},
    subrace
      ? { armor: subrace.armorProficiencies, weapons: subrace.weaponProficiencies, tools: subrace.toolProficiencies, languages: subrace.additionalLanguages }
      : {},
    ...(pers.raceChoiceOptions ?? []).map((option) => ({ languages: option.languages })),
    { tools: pers.background?.toolProficiencies },
  ];
}

function collectClassSources(pers: PersWithRelations): ProficiencySource[] {
  const mainClass = pers.class;
  const multiclassPackages = (pers.multiclasses ?? []).map((multiclass) => {
    const entry = findMulticlassProficiencies(multiclass.class.name);
    return entry
      ? { armor: entry.armor, weapons: { type: entry.weapons?.type ?? [] }, weaponsSpecial: { specific: entry.weapons?.specific ?? [] }, tools: entry.tools }
      : {};
  });
  const subclasses = [pers.subclass, ...(pers.multiclasses ?? []).map((multiclass) => multiclass.subclass)];

  return [
    mainClass
      ? {
          armor: mainClass.armorProficiencies,
          weapons: mainClass.weaponProficiencies,
          weaponsSpecial: mainClass.weaponProficienciesSpecial,
          tools: mainClass.toolProficiencies,
          languages: mainClass.languages,
        }
      : {},
    ...multiclassPackages,
    ...subclasses.map((subclass) =>
      subclass ? { armor: subclass.armorProficiencies, weapons: subclass.weaponProficiencies, tools: subclass.toolProficiencies } : {},
    ),
  ];
}

function collectFeatSources(pers: PersWithRelations): ProficiencySource[] {
  return (pers.feats ?? []).map(({ feat }) => ({
    armor: feat.grantedArmorProficiencies,
    weapons: feat.grantedWeaponProficiencies,
    tools: feat.grantedToolProficiencies,
    languages: feat.grantedLanguages,
  }));
}

function toFeatureSource(feature: ReturnType<typeof collectActiveFeatures>[number]): ProficiencySource {
  return {
    armor: feature.armorProficiencies,
    weapons: feature.weaponProficiencies,
    weaponsSpecial: feature.weaponProficienciesSpecial,
    tools: feature.toolProficiencies,
    languages: feature.givesLanguages,
  };
}

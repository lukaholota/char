import type { PersWithRelations } from "@/lib/actions/pers";
import { formatArmorProficiencies, formatList } from "@/lib/components/characterCreator/infoUtils";
import { collectActiveFeatures } from "@/lib/logic/bonus-calculator";
import { collectDerivedProficiencies, type DerivedProficiencies, type ProficiencySource } from "@/rules/derived-proficiencies";
import { collectOriginLanguages } from "@/rules/languages";
import { findMulticlassProficiencies } from "@/rules/multiclass-proficiencies";

/// Лист, друк і пул майстерності читають персонажа тим самим запитом; власник рядка тут не потрібен.
export type ProficiencyPers = Omit<PersWithRelations, "user">;

export type PersProficiencyText = {
  proficiencies: string;
  languages: string;
};

export function calculatePersProficiencies(pers: ProficiencyPers): DerivedProficiencies {
  return collectDerivedProficiencies([
    ...collectOriginSources(pers),
    ...collectClassSources(pers),
    ...collectFeatSources(pers),
    ...collectActiveFeatures(pers).map(toFeatureSource),
  ]);
}

/// Надання з джерел (вид, клас, риси) дописуються в текст персонажа тим, чого там ще немає.
/// Окремий блок над полем дублював текст і ніколи не був повним: мови «на вибір» живуть лише
/// в тексті (власник, 2026-09-13).
export function appendMissingProficiencies(saved: PersProficiencyText, derived: DerivedProficiencies): PersProficiencyText {
  return {
    proficiencies: appendLines(saved.proficiencies, buildMissingProficiencyLines(saved.proficiencies, derived)),
    languages: appendLines(saved.languages, findMissingTerms(saved.languages, derived.languages.map(translateTerm))),
  };
}

export function appendToolProficiencies(text: string, toolLabels: readonly string[]): string {
  const missing = findMissingTerms(text, [...toolLabels]);
  return appendLines(text, missing.length ? [`Інструменти: ${missing.join(", ")}`] : []);
}

export function findMentionedTerms(text: string, terms: Record<string, string>): string[] {
  const haystack = normalizeTerm(text);
  return Object.values(terms).filter((label) => haystack.includes(normalizeTerm(label)));
}

export function splitTermTokens(text: string): string[] {
  return text.split(/[\n,]/g).map((token) => token.trim()).filter(Boolean);
}

function buildMissingProficiencyLines(text: string, derived: DerivedProficiencies): string[] {
  const armor = findMissingTerms(text, derived.armor.map((code) => formatArmorProficiencies([code])));
  const weapons = findMissingTerms(text, [...derived.weaponTypes, ...derived.weapons].map(translateTerm));
  const tools = findMissingTerms(text, derived.tools.map(translateTerm));
  return [
    armor.length ? `Обладунки: ${armor.join(", ")}` : "",
    weapons.length ? `Зброя: ${weapons.join(", ")}` : "",
    tools.length ? `Інструменти: ${tools.join(", ")}` : "",
  ].filter(Boolean);
}

function findMissingTerms(text: string, terms: string[]): string[] {
  const haystack = normalizeTerm(text);
  return Array.from(new Set(terms)).filter((term) => term && !haystack.includes(normalizeTerm(term)));
}

function appendLines(text: string, lines: string[]): string {
  if (lines.length === 0) return text;
  const trimmed = text.replace(/\s+$/, "");
  return trimmed ? `${trimmed}\n${lines.join("\n")}` : lines.join("\n");
}

const translateTerm = (code: string): string => formatList([code], "");

const normalizeTerm = (value: string): string => value.toLocaleLowerCase("uk").replace(/['’ʼ]/g, "ʼ").replace(/\s+/g, " ");

function collectOriginSources(pers: ProficiencyPers): ProficiencySource[] {
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

function collectClassSources(pers: ProficiencyPers): ProficiencySource[] {
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

function collectFeatSources(pers: ProficiencyPers): ProficiencySource[] {
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

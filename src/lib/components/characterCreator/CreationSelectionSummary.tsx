"use client";

import type { Weapon } from "@prisma/client";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { translateValue } from "./infoUtils";
import { SelectedSpellSummary } from "@/lib/components/wizard/SelectedSpellSummary";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { Ruleset } from "@/rules/types";

export function CreationSelectionSummary({ ruleset, weapons }: { ruleset: Ruleset; weapons: readonly Weapon[] }) {
  const formData = usePersFormStore((state) => state.formData);
  const languages = formData.languagesSchema?.languages ?? [];
  const masteries = (formData.weaponMasteryWeaponIds ?? []).flatMap((id) => {
    const weapon = weapons.find((candidate) => candidate.weaponId === id);
    return weapon ? [translateValue(weapon.name)] : [];
  });
  return <div className="space-y-4">
    {languages.length > 0 && <section aria-label="Вибрані мови"><h3 className="text-sm font-semibold text-slate-200">Вибрані мови</h3><p className="mt-1 text-sm text-slate-300">{languages.map(translateValue).join(", ")}</p></section>}
    {masteries.length > 0 && <section aria-label="Майстерності зброї"><h3 className="text-sm font-semibold text-slate-200">Майстерності зброї</h3><p className="mt-1 text-sm text-slate-300">{masteries.join(", ")}</p></section>}
    <SelectedSpellSummary ruleset={ruleset} groups={collectCreationSpellGroups(formData)} />
  </div>;
}

export function collectCreationSpellGroups(formData: Partial<PersFormData>) {
  const sourceLabels: Record<string, string> = { BACKGROUND_ORIGIN: "Риса походження", SPECIES_VERSATILITY: "Риса раси" };
  return [
    { label: "Класові замовляння", ids: formData.classSpells?.cantripIds ?? [] },
    { label: "Класові заклинання", ids: formData.classSpells?.preparedIds ?? [] },
    { label: "Книга заклинань", ids: formData.classSpells?.spellbookIds ?? [] },
    { label: "Заклинання від опцій класу", ids: formData.classOptionSpellIds ?? [] },
    { label: "Заклинання раси", ids: formData.raceSpellIds ?? [] },
    ...Object.entries(formData.featSpellSelections ?? {}).map(([source, ids]) => ({ label: sourceLabels[source] ?? "Заклинання риси", ids: ids ?? [] })),
  ];
}

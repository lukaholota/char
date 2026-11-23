import { ModeLink } from "@/components/no-ai/ModeLink";
import { matchesSourceSelection, type SourceSelection } from "@/lib/catalog-source-filter";
import type { HomebrewCatalogEntry, HomebrewItemEntry } from "@/lib/logic/homebrew-view";
import { damageTypeTranslations } from "@/lib/refs/translation";
import { parseWeaponProfile } from "@/rules/weapon-profile";

export function findHomebrewWeaponRows(entries: HomebrewCatalogEntry[], source: SourceSelection, search: string, damageTypes: Set<string>) {
  const query = search.trim().toLocaleLowerCase("uk");
  return entries.filter((entry): entry is HomebrewItemEntry => {
    if (entry.kind !== "ITEM" || entry.item.itemType !== "WEAPON" || !entry.item.isMundane || !matchesSourceSelection(entry.item.source, source)) return false;
    const profile = parseWeaponProfile(entry.item.weaponProfile);
    if (damageTypes.size && (!profile?.damageType || !damageTypes.has(profile.damageType))) return false;
    return `${entry.name} ${profile?.damage ?? ""}`.toLocaleLowerCase("uk").includes(query);
  });
}

export function HomebrewWeaponRow({ weapon, is2024 }: { weapon: HomebrewItemEntry; is2024: boolean }) {
  const profile = parseWeaponProfile(weapon.item.weaponProfile);
  const details = [profile?.damage, profile?.damageType ? damageTypeTranslations[profile.damageType] : null, "Хоумбрю"].filter(Boolean).join(" · ");
  return (
    <ModeLink href={`/homebrew/${weapon.entryId}${is2024 ? "?edition=2024" : ""}`} prefetch={false} className="my-2 flex min-h-11 flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
      <span className="font-semibold text-slate-100">{weapon.name}</span>
      <span className="text-xs text-slate-400">{details}</span>
    </ModeLink>
  );
}

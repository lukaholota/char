"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Search, Swords, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { weaponTranslations, weaponTranslationsEng } from "@/lib/refs/translation";
import { normalizeUkrainianApostrophes } from "@/lib/refs/ukrainian-apostrophe";
import {
  findWeaponMasteryDescription,
  findWeaponMasteryName,
  formatWeaponMasteryLabel,
  weaponMasteryEngNames,
} from "@/lib/refs/weapon-mastery";

export type PickableMasteryWeapon = {
  weaponId: number;
  name: string;
  mastery: string | null;
};

type Props = {
  options: readonly PickableMasteryWeapon[];
  selectedWeaponIds: readonly number[];
  capacity: number;
  onToggle: (weaponId: number) => void;
};

/// Короткий список видно цілком, і поле пошуку над ним було б зайвим рядком; у воїна зброї
/// з майстерністю більше двох десятків, і без пошуку вибір перетворюється на гортання.
const SEARCH_FROM_OPTION_COUNT = 8;

/**
 * Один список вибору майстерності на три місця: крок конструктора, крок підвищення рівня й
 * редактор на листі персонажа. Розійшлися б копії — розійшлися б і правила показу.
 */
export function WeaponMasteryPicker({ options, selectedWeaponIds, capacity, onToggle }: Props) {
  const [query, setQuery] = useState("");

  const matching = useMemo(() => findMatchingWeapons(options, query), [options, query]);

  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-yellow-500/40 p-4 text-center text-sm text-slate-300">
        Для цього класу немає зброї з властивістю майстерності.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {options.length >= SEARCH_FROM_OPTION_COUNT && (
        <WeaponMasterySearchField query={query} onQueryChange={setQuery} />
      )}

      {matching.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">
          За запитом «{query}» зброї з майстерністю немає.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {matching.map((weapon) => {
            const isSelected = selectedWeaponIds.includes(weapon.weaponId);
            const isDisabled = !isSelected && selectedWeaponIds.length >= capacity;
            return (
              <button
                type="button"
                key={weapon.weaponId}
                onClick={() => onToggle(weapon.weaponId)}
                disabled={isDisabled}
                className={clsx(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                  isSelected ? "border-amber-500/50 bg-amber-500/10" : "border-white/10 bg-white/5 hover:bg-white/10",
                  isDisabled && "cursor-not-allowed opacity-40",
                )}
              >
                <Swords className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold text-slate-100">
                    <span className="truncate">{translateWeaponName(weapon.name)}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-amber-300" />}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-amber-300">
                    {formatWeaponMasteryLabel(weapon.mastery)}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                    {findWeaponMasteryDescription(weapon.mastery)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/// Поле саме `text`: із `type="search"` Chromium домальовує власний хрестик поруч із нашим,
/// а рідний замалий для пальця.
function WeaponMasterySearchField({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (next: string) => void;
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <Input
        type="text"
        inputMode="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Пошук за назвою або властивістю"
        aria-label="Пошук зброї з майстерністю"
        data-testid="weapon-mastery-search"
        className="h-10 border-white/10 bg-white/5 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:ring-arcane-400/30"
      />
      {query !== "" && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400 hover:text-white"
          onClick={() => onQueryChange("")}
          aria-label="Очистити пошук зброї"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/// Гравець шукає і «кинджал», і «dagger», і «кидок», і «nick»: у картці зброї видно обидві
/// мови, тож шукатися мають теж обидві. Апостроф зводиться до канонічного — з клавіатури
/// приходить `'`.
export function findMatchingWeapons(
  options: readonly PickableMasteryWeapon[],
  query: string,
): readonly PickableMasteryWeapon[] {
  const needle = normalizeForSearch(query);
  if (needle === "") return options;

  return options.filter((weapon) =>
    listSearchableText(weapon).some((text) => normalizeForSearch(text).includes(needle)),
  );
}

function listSearchableText(weapon: PickableMasteryWeapon): string[] {
  return [
    translateWeaponName(weapon.name),
    weaponTranslationsEng[weapon.name as keyof typeof weaponTranslationsEng] ?? weapon.name,
    findWeaponMasteryName(weapon.mastery) ?? "",
    weaponMasteryEngNames[weapon.mastery as keyof typeof weaponMasteryEngNames] ?? "",
  ];
}

function translateWeaponName(name: string): string {
  return weaponTranslations[name as keyof typeof weaponTranslations] || name;
}

function normalizeForSearch(text: string): string {
  return normalizeUkrainianApostrophes(text).trim().toLowerCase();
}

export default WeaponMasteryPicker;

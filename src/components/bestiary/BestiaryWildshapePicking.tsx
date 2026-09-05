"use client";

import { PawPrint, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { classTranslations, subclassTranslations } from "@/lib/refs/translation";
import type { WildshapePicking } from "@/components/bestiary/useWildshapePicking";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import type { WildshapeEligibility } from "@/rules/wildshape";
import type { WildshapeCharacter, WildshapeStanding } from "@/server/db/wildshape";
import { cn } from "@/lib/utils";

/// Придатність тут тільки малюється. Рахує її `findWildshapeEligibility`, а текст причини пише
/// модуль правил — саме тому непридатна форма може лишитися в списку й додатися з попередженням
/// ([Р-3]), а не зникнути мовчки.

export function WildshapeUnavailableBadge({ eligibility }: { eligibility: WildshapeEligibility }) {
  const blocking = eligibility.reasons.filter((reason) => reason.blocking);
  if (blocking.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
      <span className="font-semibold">Недоступна</span>
      <span className="text-amber-200/80">{blocking.map((reason) => reason.text).join(" · ")}</span>
    </span>
  );
}

/// Непридатний звір із вимкненим фільтром лишається в списку з причиною ([Р-3]): саме мовчазне
/// зникнення форм і породило колись підозру на баг лазання.
export function WildshapeRowNote({
  creature,
  wildshape,
}: {
  creature: CreatureIndexEntry;
  wildshape: WildshapePicking;
}) {
  const eligibility = wildshape.findEligibility(creature);
  if (!eligibility || eligibility.eligible) return null;

  return (
    <div className="mt-1.5">
      <WildshapeUnavailableBadge eligibility={eligibility} />
    </div>
  );
}

export function WildshapeAddFormButton({
  eligibility,
  isAttached,
  isPending,
  onAdd,
}: {
  eligibility: WildshapeEligibility;
  isAttached: boolean;
  isPending: boolean;
  onAdd: () => void;
}) {
  const explanatory = eligibility.reasons.filter((reason) => !reason.blocking);

  return (
    <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <PawPrint className="h-4 w-4" />
          Дика форма
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={isAttached || isPending}
          onClick={onAdd}
          className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
        >
          <Plus className="h-3.5 w-3.5" />
          {isAttached ? "Уже прикріплена" : "Додати як звірину форму"}
        </Button>
      </div>

      <WildshapeUnavailableBadge eligibility={eligibility} />

      {explanatory.map((reason) => (
        <p key={reason.kind} className="text-[11px] text-slate-400">
          {reason.text}
        </p>
      ))}
    </div>
  );
}

/// Секція звичайних фільтрів каталогу, а не режим вбудовування: гравець, який зайшов у бестіарій
/// сам, обирає свого друїда тут і бачить те саме, що побачив би з листа.
export function WildshapeFilterSection({
  characters,
  standing,
  persId,
  onlyEligible,
  onSelectPers,
  onShowOnlyEligible,
}: {
  characters: WildshapeCharacter[];
  standing: WildshapeStanding | null;
  persId: number | null;
  onlyEligible: boolean;
  onSelectPers: (persId: number | null) => void;
  onShowOnlyEligible: (value: boolean) => void;
}) {
  /// Гравцеві без друїда секція нічого не дає — краще її не показувати, ніж пояснювати порожнечу.
  if (characters.length === 0 && persId === null) return null;

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        Дика форма
      </label>

      {characters.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {characters.map((character) => (
            <button
              key={character.persId}
              onClick={() => onSelectPers(character.persId === persId ? null : character.persId)}
              className={cn(
                "truncate rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all",
                character.persId === persId
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
                  : "border-white/5 bg-slate-900/60 text-slate-300 hover:bg-white/5"
              )}
            >
              <span className="block truncate">{character.name}</span>
              <span className="block truncate text-[11px] text-slate-400">
                {describeDruid(character)}
              </span>
            </button>
          ))}
        </div>
      )}

      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2">
        <span className="text-xs font-medium text-slate-200">Лише придатні мені форми</span>
        <Switch checked={onlyEligible} disabled={persId === null} onCheckedChange={onShowOnlyEligible} />
      </label>

      {standing && standing.limitNotes.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">{standing.limitNotes.join(" · ")}</p>
      )}
    </div>
  );
}

/// Назви класу й підкласу — з реєстру перекладів ([Р18](docs/DECISIONS.md#р18)), не літералом.
function describeDruid(character: WildshapeCharacter): string {
  const circle = character.isMoonCircle ? ` · ${subclassTranslations.CIRCLE_OF_THE_MOON}` : "";
  return `${classTranslations.DRUID_2014} ${character.druidLevel}${circle}`;
}

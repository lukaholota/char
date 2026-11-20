"use client";

import { useMemo, useState } from "react";
import { Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { PersWithRelations } from "@/lib/actions/pers";
import { itemRarityTranslations, magicItemTypeTranslations } from "@/lib/refs/translation";
import { fillDefaultCharges, findItemChargeRules } from "@/rules/magic-item-charge-text";
import { describeMissingSteps, findMissingActivationSteps } from "@/lib/logic/magic-item-activation";
import { hasCountedEffects } from "@/lib/logic/magic-item-effect-text";
import { findMagicItemEffects } from "@/rules/magic-item-effects";
import { describeDrinkVerb, isDrinkableMagicItem } from "@/rules/potions";
import { findMagicWeaponTraits } from "@/rules/magic-weapons";
import { findItemSpellUse } from "@/rules/magic-item-spell-uses";
import { findItemRolls } from "@/rules/magic-item-action-rolls";
import { findMagicItemState } from "@/rules/magic-item-states";
import { ContentImage } from "@/components/no-ai/ContentImage";
import { buildMediaImageUrl } from "@/lib/media-url";
import { MagicItemChargesControl } from "./MagicItemChargesControl";

export type PersMagicItemLink = PersWithRelations["magicItems"][number];
export type MagicItemLinkUpdates = { isEquipped?: boolean; isAttuned?: boolean; persWeaponId?: number | null };

type Props = {
  pmi: PersMagicItemLink;
  isReadOnly?: boolean;
  isRemoving: boolean;
  isPending: boolean;
  onDelete: () => void;
  onUpdate: (updates: MagicItemLinkUpdates) => void;
  onSelect: () => void;
  onChargesChanged: () => void;
};

const translate = (dictionary: Record<string, string>, key: string) => dictionary[key] ?? key;

export function MagicItemRow({ pmi, isReadOnly, isRemoving, isPending, onDelete, onUpdate, onSelect, onChargesChanged }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = pmi.magicItem;
  const isConsumable = isConsumableItem(item);
  const chargeRules = useMemo(() => findItemChargeRules(item.description), [item.description]);
  const charges = fillDefaultCharges({ chargesMax: pmi.chargesMax, chargesCurrent: pmi.chargesCurrent }, chargeRules);
  const showsCharges = charges.chargesMax !== null || /заряд/.test(item.description ?? "") || findItemSpellUse(item) !== null;
  const inactiveHint = useMemo(() => findInactiveHint(pmi), [pmi]);

  return (
    <div className={`w-full overflow-hidden transition-all duration-300 ${isRemoving ? "opacity-0 translate-x-2 max-h-0 py-0" : "opacity-100 translate-x-0 max-h-96 mb-2"}`}>
      <div className="flex flex-col gap-2 p-3 rounded-lg border border-white/5 bg-slate-800/40 hover:bg-slate-800/60 transition group cursor-pointer" onClick={onSelect}>
        <div className="flex min-w-0 items-start gap-3">
          {item.imageKey ? (
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-white/10">
              <ContentImage src={buildMediaImageUrl(item.imageKey, "thumbnail")} alt="" provenance="manual" fill sizes="40px" className="object-cover" />
            </span>
          ) : null}
          <div className="min-w-0">
            <div className="font-bold text-slate-50 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-violet-200 break-words">{item.name}</span>
              {isReadOnly && pmi.isEquipped && <span className="text-xs font-medium bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30">Екіпіровано</span>}
              {isReadOnly && pmi.isAttuned && <span className="text-xs font-medium bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">Налаштовано</span>}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {translate(magicItemTypeTranslations, item.itemType)} • {translate(itemRarityTranslations, item.rarity)}
            </div>
            {inactiveHint ? <p className="mt-1 text-xs text-amber-300/90">{inactiveHint}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {showsCharges && <div onClick={(e) => e.stopPropagation()}>
            <MagicItemChargesControl
              persId={pmi.persId}
              persMagicItemId={pmi.persMagicItemId}
              itemName={item.name}
              recovery={chargeRules.recovery}
              charges={charges}
              isReadOnly={isReadOnly}
              onChanged={onChargesChanged}
            />
          </div>}
          {!isReadOnly && (
            <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
              {isDrinkableMagicItem(item) && (
                <Button variant="secondary" size="sm" className="h-9" onClick={onSelect}>
                  {describeDrinkVerb(item)}
                </Button>
              )}
              {item.requiresAttunement && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 gap-1.5 px-2 text-xs ${pmi.isAttuned ? "text-amber-300 bg-amber-400/10" : "text-slate-400 hover:text-amber-300"}`}
                  disabled={isPending}
                  onClick={() => onUpdate({ isAttuned: !pmi.isAttuned })}
                  aria-pressed={pmi.isAttuned}
                  aria-label={pmi.isAttuned ? `Скасувати налаштування: ${item.name}` : `Налаштуватися: ${item.name}`}
                >
                  <Zap className="w-4 h-4" />
                  {pmi.isAttuned ? "Налаштовано" : "Налаштуватися"}
                </Button>
              )}
              {!isConsumable && (
                <label className="flex h-9 cursor-pointer items-center gap-1 text-xs text-slate-400">
                  <Switch
                    checked={pmi.isEquipped}
                    disabled={isPending}
                    onCheckedChange={(isEquipped) => onUpdate({ isEquipped })}
                    aria-label={`Екіпіровано: ${item.name}`}
                    className="scale-75"
                  />
                  Екіпіровано
                </label>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 transition-all duration-300 ${confirmDelete ? "text-red-500 bg-red-500/20 border border-red-500/30" : "text-slate-500 hover:text-red-400"}`}
                aria-label={confirmDelete ? `Підтвердити видалення: ${item.name}` : `Видалити: ${item.name}`}
                onClick={() => {
                  if (confirmDelete) return onDelete();
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const PICK_WEAPON_HINT = "Бонус до зброї ще не діє — торкніться предмета й оберіть, яка це зброя на листі.";

function findInactiveHint(pmi: PersMagicItemLink): string | null {
  const steps = findMissingActivationSteps(pmi);
  if (steps.length === 0 && pmi.persWeaponId === null && findMagicWeaponTraits(pmi.magicItem)) return PICK_WEAPON_HINT;
  if (steps.length === 0) return null;
  if (hasCountedEffects(findMagicItemEffects(pmi.magicItem))) return `Бонуси ще не діють — ${describeMissingSteps(steps)}.`;
  return hasSheetUse(pmi.magicItem) ? `Щоб користуватися, ${describeMissingSteps(steps)}.` : null;
}

/// Предмет, яким користуються з листа (кидки з опису, панель заклинання, стан), — працює лише екіпірованим.
export function hasSheetUse(item: PersMagicItemLink["magicItem"]): boolean {
  if (isConsumableItem(item)) return false;
  return findMagicItemState(item) !== null || findItemSpellUse(item) !== null || findItemRolls(item.description ?? "").length > 0;
}

const isConsumableItem = (item: { itemType: string }) => item.itemType === "POTION" || item.itemType === "SCROLL";

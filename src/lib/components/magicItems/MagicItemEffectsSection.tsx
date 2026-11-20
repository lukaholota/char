import type { ReactNode } from "react";
import { describeMagicItemEffect, describeMagicWeaponTraits, isCountedBySheet } from "@/lib/logic/magic-item-effect-text";
import { findMagicItemEffects, type MagicItemEffectSource } from "@/rules/magic-item-effects";
import { findMagicWeaponTraits } from "@/rules/magic-weapons";

type EffectsItem = MagicItemEffectSource & { description?: string | null; weaponBonus?: number | null };

export function MagicItemEffectsSection({ item, sheetStatus }: { item: EffectsItem; sheetStatus?: ReactNode }) {
  const effects = findMagicItemEffects(item);
  const weaponTraits = findMagicWeaponTraits(item);
  const counted = [...effects.filter(isCountedBySheet).map(describeMagicItemEffect), ...(weaponTraits ? describeMagicWeaponTraits(weaponTraits) : [])];
  const notes = effects.filter((effect) => !isCountedBySheet(effect));
  if (counted.length === 0 && notes.length === 0 && !sheetStatus) return null;

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      {sheetStatus}
      {counted.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-slate-100">Що дає</h3>
          <ul className="mt-1.5 space-y-1 text-sm text-slate-200">
            {counted.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      {notes.length > 0 && (
        <ul className={`space-y-1 text-xs leading-relaxed text-slate-400 ${counted.length > 0 ? "mt-2" : ""}`}>
          {notes.map((effect) => (
            <li key={describeMagicItemEffect(effect)}>{describeMagicItemEffect(effect)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

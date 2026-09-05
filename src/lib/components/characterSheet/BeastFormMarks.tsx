"use client";

import type { Ability } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import { type BeastFormLayer, hasBeastHitPointStack } from "@/lib/logic/beast-form";

/**
 * Позначки другого шару на листі. Зелене кільце означає «перераховано від звіра», бурштинове —
 * «це взагалі не твій стос хітів»; кольори різні свідомо
 * ([Р-6](docs/o24-wildshape-second-layer/README.md)).
 *
 * Змінене значення несе поруч власне — дрібним і менш контрастним
 * ([Р-5](docs/o24-wildshape-second-layer/README.md)). Незмінені значення другого числа не
 * отримують: сенс саме в тому, щоб з одного погляду було видно, що змінилося.
 */

export type BeastFormView = {
  layer: BeastFormLayer;
  /// Лист поза формою: звідки беруться і власні числа поруч, і дані для будь-якого запису.
  ownPers: PersWithRelations;
  beastAbilities: Ability[];
  onChanged: () => void;
};

export const BEAST_VALUE_RING = "ring-1 ring-emerald-400/70";
export const BEAST_HITPOINTS_RING = "ring-1 ring-amber-400/80";

const OWN_VALUE_TITLE = "Ваше значення поза формою";

export function OwnValue({ value }: { value: string | number }) {
  return (
    <span className="font-mono text-[9px] leading-none text-slate-500" title={OWN_VALUE_TITLE}>
      {value}
    </span>
  );
}

export function isBeastAbility(beastForm: BeastFormView | undefined, ability: Ability): boolean {
  return Boolean(beastForm?.beastAbilities.includes(ability));
}

/// Бурштиновий блок хітів малюється лише там, де стос звіра справді існує: у 2024 хіти
/// лишаються персонажеві, тож блок звичайний, а тимчасові показуються так само, як будь-які інші.
export function hasBeastHitPoints(beastForm: BeastFormView | undefined): boolean {
  return Boolean(beastForm && hasBeastHitPointStack(beastForm.layer));
}

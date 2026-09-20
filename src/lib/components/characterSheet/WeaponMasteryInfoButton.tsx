"use client";

import { useState } from "react";
import clsx from "clsx";
import { ControlledInfoDialog } from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  findWeaponMasteryDescription,
  formatWeaponMasteryLabel,
  isWeaponMastery,
} from "@/lib/refs/weapon-mastery";

type Props = {
  mastery: unknown;
  className?: string;
};

/**
 * Підпис властивості майстерності відкриває її опис на місці. `swiper-no-swiping` обовʼязковий:
 * слайди листа гасять pointerdown, і без нього тригер у картці не відкривається.
 */
export function WeaponMasteryInfoButton({ mastery, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isWeaponMastery(mastery)) return null;

  const label = formatWeaponMasteryLabel(mastery) ?? "";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Опис властивості «${label}»`}
        className={clsx(
          "swiper-no-swiping underline decoration-dotted underline-offset-2 transition hover:text-amber-100",
          className,
        )}
      >
        {label}
      </button>
      <ControlledInfoDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={label}
        subtitle="Властивість майстерності зброї"
      >
        <p className="text-sm leading-relaxed text-slate-200/90">{findWeaponMasteryDescription(mastery)}</p>
      </ControlledInfoDialog>
    </>
  );
}

export default WeaponMasteryInfoButton;

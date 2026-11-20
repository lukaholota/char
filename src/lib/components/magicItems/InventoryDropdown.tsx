"use client";

import { useState, type ReactNode } from "react";
import { Check, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import { getUserPersesMagicItemIndex } from "@/lib/actions/pers";
import { toggleMagicItemForPers } from "@/lib/actions/magic-item-actions";
import { describeMissingSteps, findMissingActivationSteps } from "@/lib/logic/magic-item-activation";
import { hasCountedEffects } from "@/lib/logic/magic-item-effect-text";
import { findMagicItemEffects, type MagicItemEffectSource } from "@/rules/magic-item-effects";
import type { Ruleset } from "@/lib/prisma-enums";

export type PersIndexItem = { persId: number; name: string; magicItemIds: number[] };

export type ToggledMagicItem = MagicItemEffectSource & { magicItemId: number; name: string; requiresAttunement: boolean };

type Props = {
  item: ToggledMagicItem;
  ruleset: Ruleset;
  persIndex: PersIndexItem[] | null;
  setPersIndex: (value: PersIndexItem[] | null) => void;
  trigger?: ReactNode;
};

export function InventoryDropdown({ item, ruleset, persIndex, setPersIndex, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useModalBackButton(open, () => setOpen(false));

  const load = async () => {
    if (persIndex) return;
    setLoading(true);
    try {
      setPersIndex(await getUserPersesMagicItemIndex(ruleset));
    } finally {
      setLoading(false);
    }
  };

  const toggleFor = async (pers: PersIndexItem) => {
    const res = await toggleMagicItemForPers({ persId: pers.persId, magicItemId: item.magicItemId });
    if (!res.success) return void toast.error(res.error);
    announceMagicItemToggle(item, res.added, () => router.push(`/char/${pers.persId}`));
    setPersIndex(
      (persIndex || []).map((entry) =>
        entry.persId !== pers.persId
          ? entry
          : { ...entry, magicItemIds: res.added ? [...entry.magicItemIds, item.magicItemId] : entry.magicItemIds.filter((id) => id !== item.magicItemId) }
      )
    );
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:text-arcane-300 md:h-8 md:w-8"
            aria-label="Додати до персонажа"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Додати до персонажа</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="px-2 py-2 text-xs text-slate-400 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Завантаження…
          </div>
        ) : persIndex && persIndex.length === 0 ? (
          <div className="space-y-1 px-2 py-2 text-xs text-slate-400">
            <p>Немає персонажів редакції {ruleset === "RULES_2024" ? "2024" : "2014"}.</p>
            <ModeLink href="/char/create" className="inline-flex min-h-9 items-center text-arcane-300 underline-offset-2 hover:underline">Створити персонажа</ModeLink>
          </div>
        ) : (
          persIndex?.map((pers) => (
            <DropdownMenuItem
              key={pers.persId}
              className="flex items-center justify-between gap-2 cursor-pointer"
              onSelect={(event) => {
                event.preventDefault();
                void toggleFor(pers);
              }}
            >
              <span className="truncate">{pers.name || `Персонаж #${pers.persId}`}</span>
              {pers.magicItemIds.includes(item.magicItemId) ? <Check className="h-4 w-4 text-arcane-400" /> : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function announceMagicItemToggle(item: ToggledMagicItem, isAdded: boolean, openSheet?: () => void) {
  if (!isAdded) return void toast(`Прибрано з персонажа: ${item.name}`);
  const steps = findMissingActivationSteps({ isEquipped: false, isAttuned: false, magicItem: item });
  toast.success(`Додано: ${item.name}`, {
    description: hasCountedEffects(findMagicItemEffects(item)) ? `Щоб бонуси почали діяти, на листі ${describeMissingSteps(steps)}.` : undefined,
    action: openSheet ? { label: "Відкрити лист", onClick: openSheet } : undefined,
  });
}

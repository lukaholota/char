"use client";

import { useState } from "react";
import { Check, Loader2, UserPlus } from "lucide-react";
import type { Ruleset } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserPersesSpellIndex } from "@/lib/actions/pers";
import { setSpellPresenceForPersByLink } from "@/lib/actions/spell-actions";
import { setHomebrewSpellPresence } from "@/lib/actions/pers-homebrew-spells";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import type { SpellLink } from "@/lib/spell-link";

export type SpellbookTarget =
  | { kind: "CATALOG"; ruleset: Ruleset; spellKey: string; link: SpellLink }
  | { kind: "HOMEBREW"; ruleset: Ruleset | "ANY"; spellKey: string; entryId: number };

export function setSpellbookPresence(target: SpellbookTarget, persId: number, present: boolean) {
  return target.kind === "HOMEBREW"
    ? setHomebrewSpellPresence({ persId, entryId: target.entryId, present })
    : setSpellPresenceForPersByLink({ persId, link: target.link, present });
}

export type PersIndexItem = {
  persId: number;
  name: string;
  spellIds: number[];
  spellKeys: string[];
};

export function SpellbookDropdown({
  target,
  persIndex,
  setPersIndex,
  trigger,
}: {
  trigger?: React.ReactNode;
  target: SpellbookTarget;
  persIndex: PersIndexItem[] | null;
  setPersIndex: (value: PersIndexItem[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useModalBackButton(open, () => setOpen(false));

  const load = async () => {
    if (persIndex) return;
    setLoading(true);
    try {
      const data = await loadPersIndex(target.ruleset);
      setPersIndex(data);
    } finally {
      setLoading(false);
    }
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
          <div className="px-2 py-2 text-xs text-slate-400">Немає персонажів</div>
        ) : (
          persIndex?.map((p) => {
            const has = p.spellKeys.includes(target.spellKey);
            const label = p.name || `Персонаж #${p.persId}`;
            return (
              <DropdownMenuItem
                key={p.persId}
                className="flex items-center justify-between gap-2 cursor-pointer"
                onSelect={async (e) => {
                  e.preventDefault();
                  const res = await setSpellbookPresence(target, p.persId, !has);
                  if (!res.success) return;

                  setPersIndex(
                    (persIndex || []).map((item) =>
                      item.persId !== p.persId
                        ? item
                        : {
                            ...item,
                            spellKeys: res.present
                              ? [...item.spellKeys, target.spellKey]
                              : item.spellKeys.filter((key) => key !== target.spellKey),
                          }
                    )
                  );
                }}
              >
                <span className="truncate">{label}</span>
                {has ? <Check className="h-4 w-4 text-arcane-400" /> : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function loadPersIndex(ruleset: SpellbookTarget["ruleset"]): Promise<PersIndexItem[]> {
  if (ruleset !== "ANY") return getUserPersesSpellIndex(ruleset);
  const [older, newer] = await Promise.all([getUserPersesSpellIndex("RULES_2014"), getUserPersesSpellIndex("RULES_2024")]);
  return [...older, ...newer];
}

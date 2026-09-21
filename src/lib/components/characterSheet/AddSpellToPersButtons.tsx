"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, UserPlus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setSpellPresenceForPersByLink } from "@/lib/actions/spell-actions";
import { getUserPersesSpellIndex } from "@/lib/actions/pers";
import type { SpellLink } from "@/lib/spell-link";
import { useModalBackButton } from "@/hooks/useModalBackButton";

type PersIndexItem = {
  persId: number;
  name: string;
  spellIds: number[];
  spellKeys: string[];
};

function hasSpellLink(pers: PersIndexItem, link: SpellLink): boolean {
  return pers.spellKeys.includes(link.spellKey);
}

function notifyEmbeddingSheet(persId: number, spellId: number, spellLevel: number | undefined, added: boolean) {
  if (window.parent === window) return;
  window.parent.postMessage({ type: "SPELL_TOGGLED", persId, spellId, spellLevel, added }, "*");
}

export function AddToPersDropdown({ link, spellLevel }: { link: SpellLink; spellLevel?: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [persIndex, setPersIndex] = useState<PersIndexItem[] | null>(null);

  useModalBackButton(open, () => setOpen(false));

  const load = async () => {
    if (persIndex) return;
    setLoading(true);
    try {
      const data = await getUserPersesSpellIndex(link.ruleset);
      setPersIndex(data);
    } finally {
      setLoading(false);
    }
  };

  const toggleForPers = async (pers: PersIndexItem) => {
    const present = !hasSpellLink(pers, link);
    const res = await setSpellPresenceForPersByLink({ persId: pers.persId, link, present });
    if (!res.success) return;

    setPersIndex(
      (persIndex || []).map((item) =>
        item.persId !== pers.persId
          ? item
          : {
              ...item,
              spellKeys: res.present
                ? Array.from(new Set([...item.spellKeys, link.spellKey]))
                : item.spellKeys.filter((key) => key !== link.spellKey),
            }
      )
    );
    notifyEmbeddingSheet(pers.persId, res.spellId, spellLevel, res.present);
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
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:text-arcane-300 md:h-9 md:w-9"
          aria-label="Додати до персонажа"
        >
          <UserPlus className="h-4 w-4" />
        </button>
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
            const has = hasSpellLink(p, link);
            const label = p.name || `Персонаж #${p.persId}`;
            return (
              <DropdownMenuItem
                key={p.persId}
                className="flex items-center justify-between gap-2"
                onSelect={async (e) => {
                  e.preventDefault();
                  await toggleForPers(p);
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

const OPEN_ANIMATION_SETTLE_MS = 350;

export function AddToSinglePersButton({ link, persId, spellLevel }: { link: SpellLink; persId: number; spellLevel?: number }) {
  const [loading, setLoading] = useState(false);
  const [has, setHas] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setLoading(true);
      try {
        const data = await getUserPersesSpellIndex(link.ruleset);
        if (cancelled) return;
        const p = data.find((item) => item.persId === persId);
        setHas(p ? hasSpellLink(p, link) : false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    // Серверна дія й перемальовка від її відповіді — після анімації відкриття, а не посеред неї.
    const timer = setTimeout(() => void check(), OPEN_ANIMATION_SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [link, persId]);

  const handleToggle = async () => {
    if (loading) return;
    const nextHas = !has;
    setLoading(true);
    try {
      const res = await setSpellPresenceForPersByLink({ persId, link, present: nextHas });
      if (res.success) {
        setHas(res.present);
        notifyEmbeddingSheet(persId, res.spellId, spellLevel, res.present);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:text-arcane-300 md:h-9 md:w-9 disabled:opacity-50"
      aria-label="Додати до персонажа"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : has ? (
        <Check className="h-4 w-4 text-arcane-400" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
    </button>
  );
}

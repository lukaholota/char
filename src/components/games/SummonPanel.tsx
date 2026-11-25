"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { listSummonSpellsAction, type SummonSpellOption } from "@/lib/actions/game-area-spells";
import { summonMapCreatureAction } from "@/lib/actions/game-sessions";
import { dropSummonCast, useSummonCastStore } from "@/lib/components/game/summon-cast";
import type { TokenPosition } from "@/rules/game-map";
import { ToolPanel } from "./MapToolbar";

type Props = { sessionId: number; findPosition: () => TokenPosition; onClose: () => void };
const CHOICE = "flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-slate-100 hover:bg-white/10 disabled:opacity-50";

/// Фамільяр, скакун чи дух: гравець обирає заклинання й форму, істота стає посеред видимої частини мапи, далі він тягне її сам.
export function SummonPanel({ sessionId, findPosition, onClose }: Props) {
  const spells = useSummonSpells(sessionId);
  const castEngName = useSummonCastStore((state) => (state.cast?.sessionId === sessionId ? state.cast.spellEngName : null));
  const [picked, setPicked] = useState<SummonSpellOption | null>(null);
  const chosen = (Array.isArray(spells) && spells.find((spell) => spell.engName === castEngName)) || picked;
  const choose = (spell: SummonSpellOption | null) => {
    dropSummonCast();
    setPicked(spell);
  };
  const close = () => {
    dropSummonCast();
    onClose();
  };
  const [isSending, setIsSending] = useState(false);
  const router = useModeRouter();
  const summon = async (spell: SummonSpellOption, creatureKey: string) => {
    setIsSending(true);
    const result = await summonMapCreatureAction(sessionId, { spellEngName: spell.engName, creatureKey, position: findPosition() }).catch(() => null);
    setIsSending(false);
    if (!result?.ok) return void toast.error(result?.error ?? "Не вдалося закликати — спробуйте ще раз");
    toast.success(`«${result.value.name}» уже на мапі — тягніть токен на потрібне місце`);
    router.refresh();
    close();
  };
  return (
    <ToolPanel title={chosen?.name ?? "Виклик істоти"} onClose={close}>
      {chosen ? <CreatureChoice spell={chosen} isSending={isSending} onPick={(key) => void summon(chosen, key)} onBack={() => choose(null)} /> : <SpellChoice spells={spells} onPick={choose} />}
    </ToolPanel>
  );
}

function useSummonSpells(sessionId: number) {
  const [spells, setSpells] = useState<SummonSpellOption[] | null | "loading">("loading");
  useEffect(() => {
    let isCurrent = true;
    void listSummonSpellsAction(sessionId).then((result) => result.ok ? result.value : null).catch(() => null).then((loaded) => isCurrent && setSpells(loaded));
    return () => {
      isCurrent = false;
    };
  }, [sessionId]);
  return spells;
}

function SpellChoice({ spells, onPick }: { spells: SummonSpellOption[] | null | "loading"; onPick: (spell: SummonSpellOption) => void }) {
  if (spells === "loading") return <p className="text-sm text-slate-400">Завантажую заклинання…</p>;
  if (spells === null) return <p className="text-sm text-slate-400">Не вдалося завантажити заклинання — спробуйте ще раз.</p>;
  return (
    <ul aria-label="Заклинання виклику" className="max-h-64 space-y-0.5 overflow-y-auto">
      {spells.map((spell) => (
        <li key={spell.engName}>
          <button type="button" onClick={() => onPick(spell)} className={CHOICE}>
            <span className="min-w-0 flex-1 truncate">{spell.name}</span>
            {spell.isKnown ? <span className="shrink-0 rounded bg-arcane-300/15 px-1.5 text-xs leading-5 text-arcane-100">ваше</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function CreatureChoice({ spell, isSending, onPick, onBack }: { spell: SummonSpellOption; isSending: boolean; onPick: (creatureKey: string) => void; onBack: () => void }) {
  return (
    <>
      <p className="text-sm leading-snug text-slate-400">Істота стане посеред мапи, яку ви зараз бачите. Рухати її, міняти хіти й стани зможете ви, а майстер — прибрати.</p>
      <ul aria-label="Кого закликати" className="max-h-64 space-y-0.5 overflow-y-auto">
        {spell.creatures.map((creature) => (
          <li key={creature.key}>
            <button type="button" disabled={isSending} onClick={() => onPick(creature.key)} className={CHOICE}>
              <span className="min-w-0 flex-1 truncate">{creature.name}</span>
              {creature.isChainOnly ? <span className="shrink-0 text-xs text-slate-400">Пакт ланцюга</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="ghost" onClick={onBack} className="h-11 gap-2 text-slate-400">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Інше заклинання
      </Button>
    </>
  );
}

export function useSummonCastOpener(sessionId: number, openSummonTool: () => void) {
  const cast = useSummonCastStore((state) => state.cast);
  useEffect(() => {
    if (cast?.sessionId === sessionId) openSummonTool();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- панель відкриває лише новий каст
  }, [cast, sessionId]);
}

"use client";

import { Pencil } from "lucide-react";
import { formatModifier } from "@/lib/logic/utils";
import { cn } from "@/lib/utils";
import { RollPill } from "@/lib/components/dice/RollPill";
import { describeExtraDiceAloud, type AbilityRollKind, type RollStateView } from "@/lib/components/dice/roll-contexts";
import { BEAST_VALUE_RING, OwnValue } from "./BeastFormMarks";

const SAVE_PROFICIENCY_FRAME =
  "border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_8px_rgba(129,140,248,0.35)] hover:border-indigo-300/80 hover:bg-indigo-500/15";

type Props = {
  shortName: string;
  fullName: string;
  borderClassName: string;
  score: number;
  modifier: number;
  save: number;
  hasSaveProficiency: boolean;
  hasBonuses: boolean;
  fromBeast: boolean;
  ownScore?: number;
  canEdit: boolean;
  onEdit: () => void;
  onRoll: (kind: AbilityRollKind) => void;
  rollStates?: { check: RollStateView; save: RollStateView };
};

export function AbilityScoreCard(props: Props) {
  const { fullName, borderClassName, modifier, save, hasSaveProficiency, hasBonuses, fromBeast, canEdit, onEdit, onRoll, rollStates } = props;
  const ring = fromBeast ? BEAST_VALUE_RING : hasBonuses ? "ring-1 ring-white/30" : "";
  const saveDice = rollStates?.save.extraDice ?? [];
  return (
    <div className={cn("glass-card flex min-w-0 flex-col gap-1 rounded-xl border bg-slate-900/60 p-1", borderClassName, ring)}>
      {canEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Редагувати: ${fullName}`}
          className="flex h-5 items-center justify-between rounded px-1 transition hover:bg-white/5"
        >
          <AbilityNameAndScore {...props} />
          <Pencil className="h-3 w-3 text-slate-500" />
        </button>
      ) : (
        <div className="flex h-5 items-center px-1">
          <AbilityNameAndScore {...props} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-1">
        <RollPill value={formatModifier(modifier)} label={`Перевірка: ${fullName} ${formatModifier(modifier)}`} onRoll={() => onRoll("check")} mode={rollStates?.check.mode} className="w-full" />
        <RollPill
          size="sm"
          caption="рят."
          value={formatModifier(save)}
          label={`Ряткидок: ${fullName} ${formatModifier(save)}${describeExtraDiceAloud(saveDice)}${hasSaveProficiency ? ", з володінням" : ""}`}
          onRoll={() => onRoll("save")}
          mode={rollStates?.save.mode}
          extraDice={saveDice}
          className={cn("h-8 w-full px-1", hasSaveProficiency && SAVE_PROFICIENCY_FRAME)}
          valueClassName={hasSaveProficiency ? "text-indigo-200" : "text-slate-300"}
        />
      </div>
    </div>
  );
}

function AbilityNameAndScore({ shortName, score, fromBeast, ownScore }: Pick<Props, "shortName" | "score" | "fromBeast" | "ownScore">) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{shortName}</span>
      <span className={cn("font-mono text-xs", fromBeast ? "text-emerald-300" : "text-slate-500")}>{score}</span>
      {fromBeast && ownScore !== undefined ? <OwnValue value={ownScore} /> : null}
    </span>
  );
}

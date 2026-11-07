import { Fragment } from "react";
import { Dices, EyeOff, Lock } from "lucide-react";
import { formatModifier } from "@/lib/logic/utils";
import { cn } from "@/lib/utils";
import { pickD20Value } from "@/rules/dice-roll";
import { findNaturalD20, type GameRoll } from "@/rules/game-roll";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionMemberView } from "@/server/db/game-sessions";
import { GameAvatar } from "./GameAvatar";
import { GameRollHeroTargetLine } from "./GameRollHeroTargetLine";
import { GameRollSavesList } from "./GameRollSavesList";
import { GameRollTargetLine } from "./GameRollTargetLine";

const LATE_AFTER_MS = 30_000;
const TIME_FORMAT = new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit" });

export function GameRollEntry({ event, isMine, isNew }: { event: GameRollEventView; isMine: boolean; isNew: boolean }) {
  const natural = event.roll ? findNaturalD20(event.roll) : null;
  return (
    <li className={cn("rounded-xl border px-3 py-2", isNew && "game-entry-in", natural === "NAT_20" ? "border-emerald-400/40 bg-emerald-500/10" : natural === "NAT_1" ? "border-rose-400/40 bg-rose-500/10" : "border-white/10 bg-slate-900/50")}>
      <div className="flex items-start gap-3">
        <GameAvatar src={event.avatarUrl} name={event.persName ?? event.authorName} className="mt-0.5 h-9 w-9 text-base" />
        <div className="min-w-0 flex-1">
          <EntryAuthor event={event} isMine={isMine} />
          <div className="break-words text-sm font-semibold text-slate-100">{event.label}</div>
          {event.roll ? <RollDetails roll={event.roll} /> : null}
          {event.target ? <GameRollTargetLine target={event.target} seq={event.seq} /> : null}
          {event.saves ? <GameRollSavesList saves={event.saves} seq={event.seq} /> : null}
          {event.heroTarget ? <GameRollHeroTargetLine target={event.heroTarget} roll={event.roll} total={event.total} seq={event.seq} /> : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold tabular-nums text-slate-50" aria-label={event.total === null ? "Результат прихований" : `Разом ${event.total}`}>{event.total ?? "?"}</div>
          {natural ? <div className={cn("text-xs font-semibold", natural === "NAT_20" ? "text-emerald-200" : "text-rose-200")}>{natural === "NAT_20" ? "Природна 20" : "Природна 1"}</div> : null}
          {event.roll?.check ? <CheckMark check={event.roll.check} /> : null}
        </div>
      </div>
    </li>
  );
}

export function GameRollingEntry({ member }: { member: GameSessionMemberView }) {
  return (
    <li className="game-entry-in flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-slate-900/30 px-3 py-2">
      <GameAvatar src={member.avatarUrl} name={member.persName ?? member.name} className="h-9 w-9 text-base" />
      <div className="min-w-0 flex-1 truncate text-sm text-slate-300">
        <span className="font-semibold text-slate-100">{member.persName ?? member.name}</span> кидає…
      </div>
      <Dices className="game-die-tumble h-7 w-7 shrink-0 text-arcane-200" aria-hidden />
    </li>
  );
}

function EntryAuthor({ event, isMine }: { event: GameRollEventView; isMine: boolean }) {
  const isLate = Date.parse(event.createdAt) - Date.parse(event.rolledAt) > LATE_AFTER_MS;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
      <span className="font-semibold text-slate-200">{event.persName ?? event.authorName}</span>
      {event.persName ? <span>{isMine ? "ви" : event.authorName}</span> : null}
      <time dateTime={event.rolledAt}>{TIME_FORMAT.format(new Date(event.rolledAt))}</time>
      {isLate ? <span title="Кидок дійшов пізніше — не було звʼязку">надіслано пізніше</span> : null}
      <VisibilityMark visibility={event.visibility} />
    </div>
  );
}

const VISIBILITY_MARKS = {
  GM: { Icon: EyeOff, text: "Майстру" },
  SECRET: { Icon: Lock, text: "Лише майстру" },
  SELF: { Icon: Lock, text: "Лише мені" },
} as const;

function VisibilityMark({ visibility }: { visibility: GameRollEventView["visibility"] }) {
  if (visibility === "PUBLIC") return null;
  const { Icon, text } = VISIBILITY_MARKS[visibility];
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-1.5 text-slate-300">
      <Icon className="h-3 w-3" aria-hidden />
      {text}
    </span>
  );
}

function RollDetails({ roll }: { roll: GameRoll }) {
  const kept = roll.d20Mode ? pickD20Value(roll.groups[0].values, roll.d20Mode) : null;
  return (
    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-slate-300 tabular-nums">
      {roll.groups.map((group) => (
        <span key={group.sides}>
          {group.values.length}к{group.sides}: <DiceValues values={group.values} kept={kept} />
        </span>
      ))}
      {roll.d20Mode && roll.d20Mode !== "NORMAL" ? (
        <span className={roll.d20Mode === "ADVANTAGE" ? "text-emerald-300" : "text-rose-300"}>
          {roll.d20Mode === "ADVANTAGE" ? "перевага" : "перешкода"}
          {roll.modeSources.length ? ` (${roll.modeSources.join(", ")})` : ""}
        </span>
      ) : null}
      {roll.extra.map((die, index) => (
        <span key={index}>
          {die.sign > 0 ? "+" : "−"}к{die.sides} {die.label}: {die.value}
        </span>
      ))}
      {roll.bonus ? <span>{formatModifier(roll.bonus)}</span> : null}
    </div>
  );
}

function DiceValues({ values, kept }: { values: number[]; kept: number | null }) {
  const keptIndex = kept === null || values.length < 2 ? -1 : values.indexOf(kept);
  return (
    <>
      {values.map((value, index) => (
        <Fragment key={index}>
          {index ? ", " : ""}
          {keptIndex !== -1 && index !== keptIndex ? (
            <span className="text-slate-500" title="Відкинуто">
              ({value})<span className="sr-only"> відкинуто</span>
            </span>
          ) : (
            <span>{value}</span>
          )}
        </Fragment>
      ))}
    </>
  );
}

function CheckMark({ check }: { check: { dc: number; isSuccess: boolean } }) {
  return <div className={cn("text-xs", check.isSuccess ? "text-emerald-300" : "text-rose-300")}>СК {check.dc} · {check.isSuccess ? "успіх" : "провал"}</div>;
}

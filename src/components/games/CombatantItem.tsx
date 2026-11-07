"use client";

import { useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { INITIATIVE_LIMITS, type CombatantView } from "@/rules/game-combat";
import { GameAvatar } from "./GameAvatar";
import { CreatureTokenFace, OpenCreatureCardContext } from "./MapCreatureTokens";

const FACE_SIZE_PX = 40;

type CombatantItemProps = { combatant: CombatantView; isCurrent: boolean; canEdit: boolean; onEditInitiative: (combatantId: number, initiative: number) => void };

export function CombatantItem({ combatant, isCurrent, canEdit, onEditInitiative }: CombatantItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const name = combatant.hero?.name ?? combatant.creature?.label ?? "";
  const openCreatureCard = useContext(OpenCreatureCardContext);
  const creatureId = combatant.creature?.id ?? null;
  const faceAndName = (
    <>
      <CombatantFace combatant={combatant} name={name} />
      <span className={cn("max-w-28 truncate text-sm [@container(max-width:17rem)]:min-w-0 [@container(max-width:17rem)]:max-w-none [@container(max-width:17rem)]:flex-1", combatant.creature?.isDown ? "text-slate-400 line-through" : "text-slate-100")}>
        {name}
        {combatant.creature?.isDown ? <span className="sr-only">, повалений</span> : null}
      </span>
    </>
  );
  return (
    <li
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-xl border px-2 py-1",
        isCurrent ? "border-arcane-300 bg-arcane-500/15" : "border-white/10 bg-slate-950/40",
      )}
    >
      {openCreatureCard && creatureId !== null ? (
        <button
          type="button"
          onClick={() => openCreatureCard(creatureId)}
          aria-label={canEdit ? `Статблок «${name}»` : `Картка «${name}»`}
          className="-my-1 -ml-2 flex min-h-11 min-w-0 items-center gap-2 rounded-lg py-1 pl-2 pr-1 text-left hover:bg-white/5 [@container(max-width:17rem)]:flex-1"
        >
          {faceAndName}
        </button>
      ) : (
        faceAndName
      )}
      {isEditing ? (
        <InitiativeEditor
          initiative={combatant.initiative}
          label={`Ініціатива: ${name}`}
          onCommit={(value) => {
            setIsEditing(false);
            onEditInitiative(combatant.id, value);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : canEdit ? (
        <button type="button" aria-label={`Ініціатива ${name}: ${combatant.initiative}. Змінити`} onClick={() => setIsEditing(true)} className={INITIATIVE_CLASS}>
          {combatant.initiative}
        </button>
      ) : (
        <span aria-label={`Ініціатива ${combatant.initiative}`} className={INITIATIVE_CLASS}>{combatant.initiative}</span>
      )}
    </li>
  );
}

const INITIATIVE_CLASS = "grid h-11 min-w-11 place-items-center rounded-lg px-1 font-rpg-display text-lg text-slate-50 tabular-nums";

function CombatantFace({ combatant, name }: { combatant: CombatantView; name: string }) {
  if (combatant.creature) return <CreatureTokenFace creature={combatant.creature} size={FACE_SIZE_PX} nameMode={null} />;
  return <GameAvatar src={combatant.hero?.avatarUrl ?? null} name={name} className="h-10 w-10 border-2 border-white/70" />;
}

type InitiativeEditorProps = { initiative: number; label: string; onCommit: (value: number) => void; onCancel: () => void };

function InitiativeEditor({ initiative, label, onCommit, onCancel }: InitiativeEditorProps) {
  const [draft, setDraft] = useState(String(initiative));
  const commit = () => {
    const value = Math.round(Number(draft));
    if (draft.trim() === "" || Number.isNaN(value)) return onCancel();
    const clamped = Math.min(INITIATIVE_LIMITS.max, Math.max(INITIATIVE_LIMITS.min, value));
    if (clamped === initiative) return onCancel();
    onCommit(clamped);
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={draft}
        min={INITIATIVE_LIMITS.min}
        max={INITIATIVE_LIMITS.max}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        className="h-11 w-16 rounded-lg border border-arcane-300 bg-slate-950 px-2 text-center text-base text-slate-50"
      />
    </form>
  );
}

"use client";

import { useContext, useState } from "react";
import Image from "next/image";
import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";
import { buildFullSizeMediaUrl, isMediaImageUrl } from "@/lib/media-url";
import { PRIVATE_ELEMENT_CLASS } from "@/lib/monitoring/session-replay";
import { cn } from "@/lib/utils";
import { INITIATIVE_LIMITS, type CombatantView } from "@/rules/game-combat";
import { buildCreatureInitials, type MapCreatureView } from "@/rules/game-map-creatures";
import { GameAvatar } from "./GameAvatar";
import { DownMark, HitPointBar } from "./MapCreatureHitPoints";
import { OpenCreatureCardContext } from "./MapCreatureTokens";

export const CARD_WIDTH = "w-14 [@container(min-width:48rem)]:w-[4.5rem]";
const CURRENT_CARD_WIDTH = "w-[4.25rem] [@container(min-width:48rem)]:w-[5.5rem]";

type CombatantItemProps = { combatant: CombatantView; isCurrent: boolean; canEdit: boolean; onEditInitiative: (combatantId: number, initiative: number) => void };

/// Портрет у стрічці ініціативи: хто зараз ходить — більший і в кільці, ініціатива — під портретом.
export function CombatantItem({ combatant, isCurrent, canEdit, onEditInitiative }: CombatantItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const name = combatant.hero?.name ?? combatant.creature?.label ?? "";
  const openCreatureCard = useContext(OpenCreatureCardContext);
  const creatureId = combatant.creature?.id ?? null;
  const portrait = <CombatantPortrait creature={combatant.creature} avatarUrl={combatant.hero?.avatarUrl ?? null} name={name} isCurrent={isCurrent} isDown={Boolean(combatant.creature?.isDown)} />;
  return (
    <li aria-current={isCurrent ? "true" : undefined} className={cn("flex shrink-0 flex-col items-center gap-1", isCurrent ? CURRENT_CARD_WIDTH : CARD_WIDTH)}>
      {openCreatureCard && creatureId !== null ? (
        <button type="button" onClick={() => openCreatureCard(creatureId)} aria-label={canEdit ? `Статблок «${name}»` : `Картка «${name}»`} className="block w-full rounded-xl text-left">
          {portrait}
        </button>
      ) : (
        portrait
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
        <button type="button" aria-label={`Ініціатива ${name}: ${combatant.initiative}. Змінити`} onClick={() => setIsEditing(true)} className={cn(INITIATIVE_CLASS, "relative rounded-lg before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-white/10")}>
          {combatant.initiative}
        </button>
      ) : (
        <span aria-label={`Ініціатива ${combatant.initiative}`} className={INITIATIVE_CLASS}>{combatant.initiative}</span>
      )}
    </li>
  );
}

const INITIATIVE_CLASS = "grid h-6 w-full place-items-center font-rpg-display text-lg leading-none text-slate-50 tabular-nums";

type CombatantPortraitProps = { creature: MapCreatureView | null; avatarUrl: string | null; name: string; isCurrent: boolean; isDown: boolean };

export function CombatantPortrait({ creature, avatarUrl, name, isCurrent, isDown }: CombatantPortraitProps) {
  const sideBorder = creature ? (creature.isAlly ? "border-emerald-400" : "border-rose-500") : "border-white/70";
  return (
    <span className={cn("relative block aspect-[4/5] w-full overflow-hidden rounded-xl border-2 bg-slate-900", sideBorder, isCurrent && "ring-2 ring-arcane-300 ring-offset-2 ring-offset-slate-950")}>
      <span className={cn("relative block h-full w-full", isDown && "opacity-50 grayscale")}>
        {creature ? <CreatureArt creature={creature} /> : <HeroArt avatarUrl={avatarUrl} name={name} />}
      </span>
      {isDown ? <DownMark /> : null}
      {creature && creature.badge !== null ? <span aria-hidden className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-slate-950 px-1 text-xs leading-none text-slate-100">{creature.badge}</span> : null}
      <span className={cn("absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent px-1 pb-1.5 pt-3 text-center text-xs leading-tight", isDown ? "text-slate-400 line-through" : "text-slate-50")}>
        {name}
        {isDown ? <span className="sr-only">, повалений</span> : null}
      </span>
      {creature?.hitPoints ? <span className="absolute inset-x-0 bottom-0 block"><HitPointBar hitPoints={creature.hitPoints} /></span> : null}
    </span>
  );
}

function CreatureArt({ creature }: { creature: MapCreatureView }) {
  const isArtHidden = useIsArtHidden(creature.imageUrl, "manual");
  if (!creature.imageUrl || isArtHidden) return <span aria-hidden className="grid h-full w-full place-items-center pb-3 font-rpg-display text-xl text-slate-100">{buildCreatureInitials(creature.label)}</span>;
  return <ContentImage src={creature.imageUrl} alt="" provenance="manual" fill sizes="128px" draggable={false} className={creature.isRoundImage ? "object-contain" : "object-cover object-top"} />;
}

/// Картка вища за мініатюру в 96 px, тож для портрета з медіа беремо повний розмір.
function HeroArt({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (!isMediaImageUrl(avatarUrl)) return <GameAvatar src={avatarUrl} name={name} className="h-full w-full rounded-none text-xl" />;
  return <Image src={buildFullSizeMediaUrl(avatarUrl)} alt="" fill sizes="128px" draggable={false} className={cn("object-cover object-top", PRIVATE_ELEMENT_CLASS)} />;
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
        className="h-10 w-16 rounded-lg border border-arcane-300 bg-slate-950 px-2 text-center text-base text-slate-50"
      />
    </form>
  );
}

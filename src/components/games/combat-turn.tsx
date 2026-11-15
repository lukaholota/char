"use client";

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CombatView } from "@/rules/game-combat";
import type { SpotlightStyle } from "@/rules/token-conditions";

type CurrentTurn = { heroPersId: number | null; creatureId: number | null };

const NO_TURN: CurrentTurn = { heroPersId: null, creatureId: null };
const CurrentTurnContext = createContext<CurrentTurn>(NO_TURN);

/// Однаково світиться той, чий зараз хід у бою, і той, кого підсвітили вручну.
export const SPOTLIGHT_RING_CLASS = "ring-4 ring-arcane-300 shadow-[0_0_1rem_0.3rem] shadow-arcane-300/70";

const toAuraShare = (tokenShare: number) => (tokenShare + 12) / 1.24;

/// Язики по колу токена, усі тягнуться вгору: верхні вищі, нижні ховаються за токеном.
function buildFlames(count: number, radius: number, height: number, speed: number): CSSProperties[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index * 2 * Math.PI) / count;
    return {
      left: `${toAuraShare(50 + radius * Math.sin(angle)).toFixed(1)}%`,
      top: `${(toAuraShare(50 - radius * Math.cos(angle)) + 4).toFixed(1)}%`,
      height: `${Math.round((height * (0.6 + 0.4 * Math.cos(angle))) / 1.24)}%`,
      animationDuration: `${(speed + 0.08 * (index % 4)).toFixed(2)}s`,
      animationDelay: `-${(0.17 * index).toFixed(2)}s`,
    };
  });
}

const OUTER_FLAMES = buildFlames(12, 44, 64, 0.5);
const CORE_FLAMES = buildFlames(9, 42, 40, 0.32);
const EMBERS: CSSProperties[] = [30, 46, 58, 70, 40].map((left, index) => ({ left: `${left}%`, top: "22%", animationDuration: `${1.4 + 0.3 * (index % 3)}s`, animationDelay: `-${(0.55 * index).toFixed(2)}s` }));
const SMOKE = buildFlames(10, 44, 70, 1.1);
const SPARKLES: CSSProperties[] = [[12, 30], [84, 22], [90, 70], [20, 82], [50, 4]].map(([left, top], index) => ({ left: `${left}%`, top: `${top}%`, animationDelay: `-${(0.7 * index).toFixed(1)}s` }));

/// Рвана лінія по колу: однакова на кожному рендері, щоб розряд не стрибав від оновлень.
function buildBoltPath(seed: number): string {
  const points = Array.from({ length: 30 }, (_, index) => {
    const angle = (index * 2 * Math.PI) / 30;
    const radius = 44 + 6 * Math.sin(seed * 12.9898 + index * 78.233);
    return `${(50 + radius * Math.sin(angle)).toFixed(1)},${(50 - radius * Math.cos(angle)).toFixed(1)}`;
  });
  return `M${points.join("L")}Z`;
}
const BOLT_PATHS = [buildBoltPath(1), buildBoltPath(2)];

function renderAuraParts(style: SpotlightStyle) {
  switch (style) {
    case "fire":
      return [
        ...OUTER_FLAMES.map((flame, index) => <span key={`outer-${index}`} className="token-flame" style={flame} />),
        ...CORE_FLAMES.map((flame, index) => <span key={`core-${index}`} className="token-flame token-flame-core" style={flame} />),
        ...EMBERS.map((ember, index) => <span key={`ember-${index}`} className="token-ember" style={ember} />),
      ];
    case "shadow":
      return SMOKE.map((wisp, index) => <span key={index} className="token-flame token-smoke" style={wisp} />);
    case "frost":
      return SPARKLES.map((sparkle, index) => <span key={index} className="token-sparkle" style={sparkle} />);
    case "storm":
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
          {BOLT_PATHS.map((path, index) => <path key={index} d={path} className="token-bolt" />)}
        </svg>
      );
    default:
      return null;
  }
}

/// Батьківський елемент має бути `isolate`: аура лежить під ним, але над мапою.
export function SpotlightAura({ style, isInside = false }: { style: SpotlightStyle | null; isInside?: boolean }) {
  if (style === null || style === "glow") return null;
  return <span aria-hidden className={cn("token-aura", `token-aura-${style}`, isInside && "token-aura-inside")}>{renderAuraParts(style)}</span>;
}

export function CombatTurnProvider({ combat, children }: { combat: CombatView | null; children: ReactNode }) {
  const current = combat?.combatants.find((combatant) => combatant.id === combat.currentId);
  const heroPersId = current?.hero?.persId ?? null;
  const creatureId = current?.creature?.id ?? null;
  const value = useMemo(() => (heroPersId === null && creatureId === null ? NO_TURN : { heroPersId, creatureId }), [heroPersId, creatureId]);
  return <CurrentTurnContext.Provider value={value}>{children}</CurrentTurnContext.Provider>;
}

export function useIsHeroTurn(persId: number | null): boolean {
  return useContext(CurrentTurnContext).heroPersId === persId && persId !== null;
}

export function useIsCreatureTurn(creatureId: number): boolean {
  return useContext(CurrentTurnContext).creatureId === creatureId;
}

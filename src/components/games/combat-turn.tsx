"use client";

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CombatView } from "@/rules/game-combat";
import type { SpotlightStyle } from "@/rules/token-conditions";

type CurrentTurn = { heroPersId: number | null; creatureId: number | null };

const NO_TURN: CurrentTurn = { heroPersId: null, creatureId: null };
const CurrentTurnContext = createContext<CurrentTurn>(NO_TURN);

/// Однаково світиться той, чий зараз хід у бою, і той, кого підсвітили вручну.
const SPOTLIGHT_RING_CLASS = "token-turn-ring";

/// Обрана аура замінює стандартну рамку ходу: разом рамка її глушить.
export function hasSpotlightAura(spotlight: SpotlightStyle | null): spotlight is Exclude<SpotlightStyle, "glow"> {
  return spotlight !== null && spotlight !== "glow";
}

export function findSpotlightRingClass(isTurn: boolean, spotlight: SpotlightStyle | null): string | null {
  return spotlight === "glow" || (isTurn && spotlight === null) ? SPOTLIGHT_RING_CLASS : null;
}

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

const FRAME_TOP_XS = [6, 22, 38, 54, 70, 86];
const FRAME_SIDE_YS = [16, 36, 56, 76];
const framePlace = (left: number, top: number, height: number, index: number): CSSProperties => ({
  left: `${left}%`,
  top: `${top}%`,
  height: `${height}%`,
  animationDuration: `${(0.45 + 0.07 * (index % 4)).toFixed(2)}s`,
  animationDelay: `-${(0.19 * index).toFixed(2)}s`,
});
/// Язики над верхом картки вищі, з боків нижчі: усі тягнуться вгору, нижня частина ховається за карткою.
const FRAME_FLAMES: CSSProperties[] = [
  ...FRAME_TOP_XS.map((x, index) => framePlace(x + 4, 8, 32, index)),
  ...FRAME_SIDE_YS.flatMap((y, index) => [framePlace(-1, y + 8, 20, index + 6), framePlace(101, y + 12, 20, index + 10)]),
];
const FRAME_CORE_FLAMES = [14, 34, 54, 74, 90].map((x, index) => framePlace(x, 6, 20, index + 3));
const FRAME_EMBERS: CSSProperties[] = [18, 44, 66, 30, 82].map((left, index) => ({ left: `${left}%`, top: "2%", animationDuration: `${1.4 + 0.3 * (index % 3)}s`, animationDelay: `-${(0.55 * index).toFixed(2)}s` }));
const FRAME_SPARKLES: CSSProperties[] = [[0, 2], [50, -3], [100, 8], [103, 50], [98, 98], [50, 103], [-3, 86], [-2, 40]].map(([left, top], index) => ({ left: `${left}%`, top: `${top}%`, animationDelay: `-${(0.55 * index).toFixed(1)}s` }));

/// Рвана лінія вздовж країв картки; viewBox розтягується на прямокутник.
function buildFrameBoltPath(seed: number): string {
  const corners = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const points = corners.flatMap(([x, y], side) => {
    const [nextX, nextY] = corners[(side + 1) % 4];
    return Array.from({ length: 12 }, (_, step) => {
      const jitter = 2.5 * Math.sin(seed * 12.9898 + (side * 12 + step) * 78.233);
      const along = step / 12;
      const isAcross = side % 2 === 0;
      return `${(x + (nextX - x) * along + (isAcross ? 0 : jitter)).toFixed(1)},${(y + (nextY - y) * along + (isAcross ? jitter : 0)).toFixed(1)}`;
    });
  });
  return `M${points.join("L")}Z`;
}
const FRAME_BOLT_PATHS = [buildFrameBoltPath(1), buildFrameBoltPath(2)];

function renderFrameParts(style: Exclude<SpotlightStyle, "glow">) {
  switch (style) {
    case "fire":
      return [
        ...FRAME_FLAMES.map((flame, index) => <span key={`outer-${index}`} className="token-flame token-flame-frame" style={flame} />),
        ...FRAME_CORE_FLAMES.map((flame, index) => <span key={`core-${index}`} className="token-flame token-flame-core token-flame-frame-core" style={flame} />),
        ...FRAME_EMBERS.map((ember, index) => <span key={`ember-${index}`} className="token-ember token-ember-frame" style={ember} />),
      ];
    case "shadow":
      return FRAME_FLAMES.map((wisp, index) => <span key={index} className="token-flame token-smoke token-smoke-frame" style={{ ...wisp, animationDuration: `${1.1 + 0.1 * (index % 4)}s` }} />);
    case "frost":
      return FRAME_SPARKLES.map((sparkle, index) => <span key={index} className="token-sparkle token-sparkle-frame" style={sparkle} />);
    case "storm":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="token-frame-bolts">
          {FRAME_BOLT_PATHS.map((path, index) => <path key={index} d={path} className="token-bolt" />)}
        </svg>
      );
    default:
      return null;
  }
}

/// Аура навколо прямокутної картки портрета: смуга з візерунком, що пливе вздовж рамки, і частинки по краях.
/// Батьківський елемент має бути `isolate`, картка — непрозора: аура лежить під нею.
export function SpotlightFrameAura({ style }: { style: SpotlightStyle | null }) {
  if (!hasSpotlightAura(style)) return null;
  return (
    <span aria-hidden className={cn("token-frame-aura", `token-frame-aura-${style}`)}>
      <span className="token-frame-band" />
      {renderFrameParts(style)}
    </span>
  );
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

"use client";

import type { ReactNode } from "react";
import { Check, Crosshair, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAreaCastStore, type AreaCast } from "@/lib/components/game/area-cast";
import {
  cancelMapTargeting,
  confirmBlessing,
  confirmMapTargets,
  findTargetName,
  pickMapTarget,
  unpickMapTarget,
  useMapTargetingStore,
  type BlessTargeting,
  type MapTargeting,
  type RollTargeting,
} from "@/lib/components/game/map-targeting";
import { cn } from "@/lib/utils";
import { countTargetPicks, groupTargetPicks, type RollTargetRef } from "@/rules/map-target-picks";
import type { GameSessionView } from "@/server/db/game-sessions";
import { ToolPanel } from "./MapToolbar";
import { findBoardTokenSize, MapTokenSlot, type PlacedToken, type TokenLayout } from "./MapTokenSlot";

const findTokenTarget = (token: PlacedToken): RollTargetRef | null => (token.creatureId !== undefined ? { creatureId: token.creatureId } : token.persId !== undefined ? { persId: token.persId } : null);
const isBlessing = (targeting: MapTargeting): targeting is BlessTargeting => "blessing" in targeting;
const isFriendly = (targeting: MapTargeting) => isBlessing(targeting) || targeting.isHeal;

/// Поверх токенів — прозорі кнопки цілей не менші за палець; лічильник показує, скільки зарядів уже летить у ціль.
export function MapTargetPicks({ tokens, layout, targeting }: { tokens: PlacedToken[]; layout: TokenLayout; targeting: MapTargeting }) {
  const isBless = isBlessing(targeting);
  const isFriendlyPick = isFriendly(targeting);
  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {tokens.map((token) => {
        const target = findTokenTarget(token);
        if (!target || (!isBless && targeting.isHeal && !("persId" in target))) return null;
        const count = countTargetPicks(targeting.picks, target);
        const size = `max(${findBoardTokenSize(layout, token.cells, 1)}, 44px)`;
        return (
          <MapTokenSlot key={token.key} position={token.position} size={size}>
            <button
              type="button"
              aria-label={describeTokenPick(token.name, count, isBless ? "bless" : targeting.isHeal ? "heal" : "attack")}
              aria-pressed={count > 0}
              onClick={() => pickMapTarget(target)}
              style={{ width: size, height: size }}
              className={cn(
                "relative block rounded-full outline outline-2 outline-offset-2 focus-visible:outline-arcane-300",
                isFriendlyPick ? (count ? "bg-amber-400/20 outline-amber-200" : "outline-amber-200/40 hover:bg-white/10") : count ? "bg-rose-500/20 outline-rose-300" : "outline-rose-300/40 hover:bg-white/10",
              )}
            >
              {count ? (
                <span className={cn("absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-bold tabular-nums", isFriendlyPick ? "bg-amber-300 text-slate-950" : "bg-rose-500 text-white")}>
                  {isFriendlyPick ? <Check className="h-3.5 w-3.5" aria-hidden /> : count}
                </span>
              ) : null}
            </button>
          </MapTokenSlot>
        );
      })}
    </div>
  );
}

function describeTokenPick(name: string, count: number, purpose: "bless" | "heal" | "attack"): string {
  if (purpose === "bless") return count ? `«${name}» отримає благословення. Торкніться, щоб прибрати` : `Благословити «${name}»`;
  if (purpose === "heal") return count ? `Лікуєте «${name}»` : `Лікувати «${name}»`;
  return count ? `Ціль «${name}», обрано ${count}. Торкніться, щоб додати ще` : `Обрати ціль «${name}»`;
}

export function MapTargetingPanel({ view, targeting }: { view: GameSessionView; targeting: MapTargeting }) {
  return isBlessing(targeting) ? <BlessTargetingPanel view={view} targeting={targeting} /> : <RollTargetingPanel view={view} targeting={targeting} />;
}

function RollTargetingPanel({ view, targeting }: { view: GameSessionView; targeting: RollTargeting }) {
  const { roll, maxPicks, picks, isHeal } = targeting;
  const left = maxPicks - picks.length;
  const canRoll = picks.length > 0 && left === 0;
  return (
    <ToolPanel title={`${isHeal ? "Кого лікуєте" : "Ціль"}: ${roll.title}`} onClose={cancelMapTargeting}>
      <p className="text-sm text-slate-300">{describeRollPicking(maxPicks, isHeal)}</p>
      <PickedTargets view={view} picks={picks} tone={isHeal ? "friendly" : "hostile"} removeLabel={(name) => (isHeal ? `Прибрати «${name}»` : `Прибрати один заряд з «${name}»`)} />
      <p className="text-sm text-slate-400">{maxPicks > 1 ? `Обрано ${picks.length} з ${maxPicks}` : picks.length ? null : isHeal ? "Героя ще не обрано" : "Ціль ще не обрана"}</p>
      <PanelActions>
        <Button type="button" variant="outline" onClick={() => confirmMapTargets(view, [])} className="h-11 px-3">Без цілі</Button>
        <Button type="button" disabled={!canRoll} onClick={() => confirmMapTargets(view)} className="h-11 flex-1">
          {canRoll || !picks.length ? "Кинути" : `Ще ${left}`}
        </Button>
      </PanelActions>
    </ToolPanel>
  );
}

function describeRollPicking(maxPicks: number, isHeal: boolean): string {
  if (isHeal) return "Торкніться героя на мапі — лікування одразу додасть хіти на його лист.";
  return maxPicks > 1 ? `Оберіть ${maxPicks} цілі: кожен дотик по токену — ще один заряд, в одну ціль можна кілька.` : "Торкніться токена, у кого летить кидок.";
}

function BlessTargetingPanel({ view, targeting }: { view: GameSessionView; targeting: BlessTargeting }) {
  const { blessing, maxPicks, picks } = targeting;
  return (
    <ToolPanel title={blessing.title} onClose={cancelMapTargeting}>
      <p className="text-sm text-slate-300">Торкніться до {maxPicks} істот на мапі — своїх чи чужих. Кожна отримає +к4 до атак і ряткидків, поки триває концентрація.</p>
      <PickedTargets view={view} picks={picks} tone="friendly" removeLabel={(name) => `Прибрати «${name}» з цілей`} />
      <p className="text-sm text-slate-400">Обрано {picks.length} з {maxPicks}</p>
      <PanelActions>
        <Button type="button" disabled={!picks.length} onClick={() => void confirmBlessing(view)} className="h-11 flex-1 gap-2">
          <Sparkles className="h-4 w-4" aria-hidden />
          Благословити
        </Button>
      </PanelActions>
    </ToolPanel>
  );
}

function PickedTargets({ view, picks, tone, removeLabel }: { view: GameSessionView; picks: RollTargetRef[]; tone: "hostile" | "friendly"; removeLabel: (name: string) => string }) {
  const groups = groupTargetPicks(picks);
  if (!groups.length) return null;
  const Icon = tone === "friendly" ? Sparkles : Crosshair;
  return (
    <ul aria-label="Обрані цілі" className="flex flex-wrap gap-1.5">
      {groups.map((group) => {
        const name = findTargetName(view, group.target);
        return (
          <li key={"creatureId" in group.target ? `c${group.target.creatureId}` : `p${group.target.persId}`}>
            <button
              type="button"
              aria-label={removeLabel(name)}
              onClick={() => unpickMapTarget(group.target)}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold",
                tone === "friendly" ? "border-amber-300/40 bg-amber-400/10 text-amber-50 hover:bg-amber-400/20" : "border-rose-300/40 bg-rose-500/10 text-rose-50 hover:bg-rose-500/20",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", tone === "friendly" ? "text-amber-200" : "text-rose-200")} aria-hidden />
              <span className="max-w-40 truncate">{name}</span>
              {group.count > 1 ? <span className="tabular-nums">×{group.count}</span> : null}
              <X className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PanelActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-3 -mb-3 flex gap-2 rounded-b-2xl bg-slate-900 p-3 pt-2">
      <Button type="button" variant="ghost" onClick={cancelMapTargeting} className="h-11 px-3 text-slate-400">Скасувати</Button>
      {children}
    </div>
  );
}

export type MapTask = { tone: "hostile" | "friendly" | "area"; label: string; task: string };

/// Що робити зараз на мапі: обрати ціль, кількох для зарядів, благословенних чи поставити зону.
export function describeMapTask(targeting: MapTargeting | null, cast: AreaCast | null): MapTask | null {
  if (targeting && isBlessing(targeting)) {
    const { picks, maxPicks } = targeting;
    return { tone: "friendly", label: targeting.blessing.title, task: picks.length ? `обрано ${picks.length} з ${maxPicks} — натисніть «Благословити»` : `торкніться до ${maxPicks} цілей на мапі` };
  }
  if (targeting) {
    const { roll, picks, maxPicks } = targeting;
    const label = roll.isCreatureRoll && roll.subtitle ? `${roll.title} · ${roll.subtitle}` : roll.title;
    const left = maxPicks - picks.length;
    if (targeting.isHeal) return { tone: "friendly", label, task: picks.length ? "натисніть «Кинути» або оберіть іншого героя" : "торкніться героя, якого лікуєте" };
    if (maxPicks > 1) return { tone: "hostile", label, task: left ? `торкніться цілі на мапі — ще ${left} з ${maxPicks}` : "усі цілі обрано — натисніть «Кинути»" };
    return { tone: "hostile", label, task: picks.length ? "натисніть «Кинути» або оберіть іншу ціль" : "торкніться цілі на мапі" };
  }
  if (cast) return { tone: "area", label: cast.area.name, task: "посуньте зону на мапі й натисніть «Накласти»" };
  return null;
}

const TASK_TONES = {
  hostile: { box: "border-rose-300/30 bg-rose-500/10", icon: "text-rose-200", Icon: Crosshair },
  friendly: { box: "border-amber-300/30 bg-amber-400/10", icon: "text-amber-200", Icon: Sparkles },
  area: { box: "border-arcane-300/30 bg-arcane-500/10", icon: "text-arcane-200", Icon: Crosshair },
} as const;

/// Підказка над мапою: людина бачить, чого від неї чекають, навіть коли панель із кнопками під мапою за краєм екрана.
export function MapTaskHint({ view, className }: { view: GameSessionView; className?: string }) {
  const targeting = useMapTargetingStore((state) => (state.targeting?.sessionId === view.id ? state.targeting : null));
  const cast = useAreaCastStore((state) => (state.cast?.sessionId === view.id ? state.cast : null));
  const task = describeMapTask(targeting, cast);
  if (!task) return null;
  const tone = TASK_TONES[task.tone];
  return (
    <p role="status" className={cn("flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-sm text-slate-200", tone.box, className)}>
      <tone.Icon className={cn("h-4 w-4 shrink-0", tone.icon)} aria-hidden />
      <span className="min-w-0">
        <span className="font-semibold text-slate-50">{task.label}</span> — {task.task}
      </span>
    </p>
  );
}

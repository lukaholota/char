"use client";

import { useEffect, useState } from "react";
import { RotateCcw, RotateCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AreaSpellList } from "@/lib/actions/game-area-spells";
import { loadAreaSpells } from "@/lib/components/game/area-cast";
import { cn } from "@/lib/utils";
import { AREA_LIMITS, AREA_SHAPES, AREA_SHAPE_LABELS, snapAreaAngle, type AreaPlacement, type AreaShape } from "@/rules/game-areas";
import { FEET_PER_CELL } from "@/rules/game-grid";
import { Stepper, ToolPanel } from "./MapToolbar";
import type { PlacedToken } from "./MapTokenSlot";
import type { AreaDraft } from "./use-map-tools";

export type AreaStart = Pick<AreaPlacement, "shape" | "sizeFeet" | "label">;

const SHAPE_SIZES: Record<AreaShape, number> = { circle: 20, cone: 15, line: 30, square: 10 };
const SHOWN_SPELLS = 40;
const describeArea = (area: Pick<AreaPlacement, "shape" | "sizeFeet">) => `${AREA_SHAPE_LABELS[area.shape]} ${area.sizeFeet} фт`;

type AreaPanelProps = {
  sessionId: number;
  hasGrid: boolean;
  isGm: boolean;
  draft: AreaDraft | null;
  targets: PlacedToken[];
  savedCount: number;
  onStart: (start: AreaStart) => void;
  onChange: (placement: Partial<AreaPlacement>) => void;
  onShare: () => void;
  onRemove: (areaId: number | null) => void;
  onDone: () => void;
  onClose: () => void;
  /// Каст із листа чи подих істоти: зона вже обрана, лишилось навести її й накласти.
  /// Зачіпає всіх у зоні, і своїх теж; skippedKeys — кого виключили (Різьблення заклинань, укриття).
  cast?: { save: string; skippedKeys: string[]; onToggle: (key: string) => void; onCast: () => void };
};

export function AreaPanel({ sessionId, hasGrid, isGm, draft, targets, savedCount, onStart, onChange, onShare, onRemove, onDone, onClose, cast }: AreaPanelProps) {
  if (!hasGrid) {
    return (
      <ToolPanel title="Область заклинання" onClose={onClose}>
        <p className="text-sm text-slate-400">{isGm ? "Щоб показувати області, задайте сітку: інструмент «Сітка»." : "Майстер ще не задав масштаб мапи — області поки недоступні."}</p>
      </ToolPanel>
    );
  }
  if (!draft) {
    return (
      <ToolPanel title="Область заклинання" onClose={onClose}>
        <SpellPicker sessionId={sessionId} onPick={onStart} />
        <div role="group" aria-label="Або форма вручну" className="grid grid-cols-4 gap-1.5">
          {AREA_SHAPES.map((shape) => (
            <Button key={shape} type="button" variant="outline" onClick={() => onStart({ shape, sizeFeet: SHAPE_SIZES[shape], label: null })} className="h-11 px-1 text-sm">
              {AREA_SHAPE_LABELS[shape]}
            </Button>
          ))}
        </div>
        {isGm && savedCount > 0 ? (
          <Button type="button" variant="ghost" onClick={() => onRemove(null)} className="h-11 w-full text-sm text-slate-400">
            Прибрати всі області з мапи ({savedCount})
          </Button>
        ) : null}
      </ToolPanel>
    );
  }
  const { placement } = draft;
  const title = placement.label ?? AREA_SHAPE_LABELS[placement.shape];
  const angleStep = placement.shape === "square" ? 90 : 15;
  const isSaved = draft.id !== null;
  return (
    <ToolPanel title={title} onClose={onClose} aside={<span className="shrink-0 text-sm text-slate-400">{describeArea(placement)}</span>}>
      {draft.canEdit ? (
        <>
          {cast ? null : <Stepper
            label="Розмір"
            value={`${placement.sizeFeet} фт`}
            onStep={(direction) => onChange({ sizeFeet: placement.sizeFeet + direction * FEET_PER_CELL })}
            canDecrease={placement.sizeFeet > AREA_LIMITS.minFeet}
            canIncrease={placement.sizeFeet < AREA_LIMITS.maxFeet}
          />}
          {placement.shape !== "circle" ? (
            <div role="group" aria-label="Напрямок" className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-sm text-slate-300">Напрямок</span>
              <Button type="button" variant="outline" aria-label={`Повернути на ${angleStep}° проти годинникової`} onClick={() => onChange({ angle: snapAreaAngle(placement.shape, placement.angle - angleStep) })} className="h-11 w-11 p-0">
                <RotateCcw className="h-4 w-4" aria-hidden />
              </Button>
              <Button type="button" variant="outline" aria-label={`Повернути на ${angleStep}° за годинниковою`} onClick={() => onChange({ angle: snapAreaAngle(placement.shape, placement.angle + angleStep) })} className="h-11 w-11 p-0">
                <RotateCw className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-slate-400">Торкніться місця на мапі або тягніть, щоб посунути область{placement.shape !== "circle" ? "; жовта точка — напрямок" : ""}. Двома пальцями мапа рухається.</p>
        </>
      ) : null}
      {cast ? <CastTargets cast={cast} targets={targets} /> : (
        <p aria-live="polite" className="text-sm text-slate-200">
          {targets.length ? <>У зоні: <span className="text-amber-100">{targets.map((target) => target.name).join(", ")}</span></> : <span className="text-slate-400">У зоні нікого</span>}
        </p>
      )}
      <div className="sticky bottom-0 -mx-3 -mb-3 flex gap-2 rounded-b-2xl bg-slate-900 p-3 pt-2">
        {!draft.canEdit ? (
          <Button type="button" variant="outline" onClick={onDone} className="h-11 flex-1">Закрити</Button>
        ) : isSaved ? (
          <>
            <Button type="button" variant="ghost" onClick={() => onRemove(draft.id)} className="h-11 px-3 text-slate-400">Прибрати</Button>
            <Button type="button" onClick={onDone} className="h-11 flex-1">Готово</Button>
          </>
        ) : cast ? (
          <>
            <Button type="button" variant="ghost" onClick={onDone} className="h-11 px-3 text-slate-400">Скасувати</Button>
            <Button type="button" onClick={cast.onCast} className="h-11 flex-1">Накласти{castCount(cast, targets) ? ` (${castCount(cast, targets)})` : ""}</Button>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={onDone} className="h-11 px-3 text-slate-400">Скасувати</Button>
            <Button type="button" onClick={onShare} className="h-11 flex-1">Показати всім</Button>
          </>
        )}
      </div>
    </ToolPanel>
  );
}

const castCount = (cast: NonNullable<AreaPanelProps["cast"]>, targets: PlacedToken[]) => targets.filter((target) => !cast.skippedKeys.includes(target.key)).length;

function CastTargets({ cast, targets }: { cast: NonNullable<AreaPanelProps["cast"]>; targets: PlacedToken[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-300">«Накласти» кине шкоду, а кожен у зоні — і вороги, і свої — свій {cast.save}. Торкніться імені, щоб виключити ціль.</p>
      {targets.length ? (
        <ul aria-label="Цілі в зоні" aria-live="polite" className="flex flex-wrap gap-1.5">
          {targets.map((target) => {
            const isIncluded = !cast.skippedKeys.includes(target.key);
            return (
              <li key={target.key}>
                <button
                  type="button"
                  aria-pressed={isIncluded}
                  onClick={() => cast.onToggle(target.key)}
                  className={cn(
                    "min-h-11 max-w-48 truncate rounded-lg border px-3 text-sm font-semibold",
                    isIncluded ? "border-amber-400/50 bg-amber-500/15 text-amber-50" : "border-white/10 text-slate-400 line-through",
                  )}
                >
                  {target.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p aria-live="polite" className="text-sm text-slate-400">У зоні нікого — посуньте область на токени</p>
      )}
    </div>
  );
}

function SpellPicker({ sessionId, onPick }: { sessionId: number; onPick: (start: AreaStart) => void }) {
  const [list, setList] = useState<AreaSpellList | null | "loading">("loading");
  const [query, setQuery] = useState("");
  useEffect(() => {
    let isCurrent = true;
    void loadAreaSpells(sessionId).then((loaded) => isCurrent && setList(loaded));
    return () => {
      isCurrent = false;
    };
  }, [sessionId]);

  const needle = query.trim().toLocaleLowerCase("uk");
  const spells = list && list !== "loading" ? list.spells.filter((spell) => !needle || spell.name.toLocaleLowerCase("uk").includes(needle)) : [];
  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">Знайти заклинання</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Заклинання: вогняна куля…"
          className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 pl-9 pr-3 text-base text-slate-100 placeholder:text-slate-500"
        />
      </label>
      {list === "loading" ? (
        <p className="text-sm text-slate-400">Завантажую заклинання…</p>
      ) : list === null ? (
        <p className="text-sm text-slate-400">Не вдалося завантажити заклинання — оберіть форму вручну.</p>
      ) : (
        <ul aria-label="Заклинання з областю" className="max-h-44 space-y-0.5 overflow-y-auto rounded-xl">
          {spells.slice(0, SHOWN_SPELLS).map((spell) => (
            <li key={spell.name}>
              <button
                type="button"
                onClick={() => onPick({ shape: spell.shape, sizeFeet: spell.sizeFeet, label: spell.name })}
                className={cn("flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-white/10", spell.isKnown ? "text-slate-100" : "text-slate-300")}
              >
                <span className="min-w-0 flex-1 truncate">{spell.name}</span>
                {spell.isKnown ? <span className="shrink-0 rounded bg-arcane-300/15 px-1.5 text-xs leading-5 text-arcane-100">ваше</span> : null}
                <span className="shrink-0 text-xs tabular-nums text-slate-400">{describeArea(spell)}</span>
              </button>
            </li>
          ))}
          {!spells.length ? <li className="px-2 py-2 text-sm text-slate-400">Нічого не знайшлося</li> : null}
        </ul>
      )}
    </div>
  );
}

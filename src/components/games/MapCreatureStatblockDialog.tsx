"use client";

import { Trash2 } from "lucide-react";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCreatureStatblock } from "@/hooks/useCreatureStatblock";
import { cn } from "@/lib/utils";
import { CREATURE_TOKEN_SIZES, CREATURE_TOKEN_SIZE_LABELS, type CreatureBorderColor, type CreatureTokenSize, type MapCreatureView } from "@/rules/game-map-creatures";
import { CreatureImageSection, type CutoutControl } from "./CreatureImageSection";
import { DownBadge, MapCreatureHitPoints, type HitPointsControl } from "./MapCreatureHitPoints";
import { CreaturePlayerNameEditor, type NameControl } from "./CreaturePlayerNameEditor";
import { RollTargetButton, type TargetControl } from "./RollTargetControls";
import { TokenConditionToggles, type ConditionsControl } from "./TokenConditionToggles";
import { Segmented } from "./MapToolbar";

type SizeControl = { value: CreatureTokenSize; onChange: (size: CreatureTokenSize) => void };
type BorderColorControl = { value: CreatureBorderColor; onChange: (color: CreatureBorderColor) => void };
type CopyToSceneControl = { scenes: Array<{ id: number; name: string }>; onCopy: (sceneId: number) => void };
type ControllerControl = { value: number | null; heroes: Array<{ id: number; name: string }>; onChange: (heroId: number | null) => void };
export type CreatureControls = { onRemove: (() => void) | null; copyToScene: CopyToSceneControl | null; controller: ControllerControl | null; size: SizeControl | null; cutout: CutoutControl | null; hitPoints: HitPointsControl | null; conditions: ConditionsControl | null; target: TargetControl | null; naming: NameControl | null; borderColor: BorderColorControl | null };
type Props = { creature: MapCreatureView | null; onClose: () => void; sessionId: number; controls: CreatureControls };
const BORDER_COLORS = [{ value: "default", label: "Звичайна" }, { value: "green", label: "Зелена" }, { value: "red", label: "Червона" }] as const;

/// Майстер править істоту в правій колонці поруч зі статблоком. Гравець статблока не отримує: бачить картинку, стани й ціль унизу.
export function MapCreatureStatblockDialog({ creature, onClose, sessionId, controls }: Props) {
  const { onRemove, copyToScene, controller, size, cutout, hitPoints, conditions, target, naming, borderColor } = controls;
  const { creature: statblock, loreGroup } = useCreatureStatblock(creature?.creatureKey ?? null, creature?.ruleset ?? "RULES_2014", null);
  const isSplit = size !== null;
  const isPlayerView = creature !== null && creature.creatureKey === null;
  const realName = creature?.statblockName ?? statblock?.name ?? creature?.label ?? "";
  return (
    <Dialog open={creature !== null} onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}>
      <DialogContent aria-describedby={undefined} className={cn("max-w-2xl grid-cols-1 overflow-y-auto", isSplit && SPLIT_DIALOG, isPlayerView && "max-w-md", target && !isSplit && "pb-0")}>
        <div className={cn("grid gap-2", isSplit && "lg:col-span-2")}>
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <DialogTitle className="normal-case leading-8 tracking-normal">{creature?.label}</DialogTitle>
            {creature?.isDown ? <DownBadge /> : null}
          </div>
        </div>
        {isPlayerView ? <CreaturePortrait creature={creature} /> : null}
        <div className={cn("grid grid-cols-1 content-start gap-4", isSplit && SPLIT_COLUMN)}>
          {isSplit && target ? <RollTargetButton control={target} /> : null}
          {naming && creature ? <CreaturePlayerNameEditor key={`${creature.id}-${naming.value}`} control={naming} realName={realName} /> : null}
          {cutout && creature ? <CreatureImageSection key={creature.id} sessionId={sessionId} creature={creature} cutout={cutout} /> : null}
          {borderColor ? <TokenBorderColorPicker control={borderColor} /> : null}
          {hitPoints ? <MapCreatureHitPoints control={hitPoints} /> : null}
          {conditions ? <TokenConditionToggles control={conditions} /> : null}
          {controller ? <ControllerPicker control={controller} /> : null}
          {size ? <TokenSizePicker size={size} /> : null}
          {copyToScene ? <CopyToScenePicker control={copyToScene} /> : null}
          {onRemove ? <RemoveFromMapButton onRemove={onRemove} /> : null}
        </div>
        {isPlayerView ? null : (
          <div className={cn(isSplit && cn(SPLIT_COLUMN, "lg:col-start-1 lg:row-start-2"))}>
            <StatblockBody creature={creature} statblock={statblock} loreDescription={loreGroup?.description ?? null} />
          </div>
        )}
        {target && !isSplit ? (
          <div className="sticky bottom-0 -mx-6 border-t border-white/10 bg-slate-950 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            <RollTargetButton control={target} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/// Бічна панель токена на компʼютері: у вкладці статблока те, що майстер міняє в бою, зокрема хто керує, решта — у вкладці «Токен».
export function CreatureSheet({ creature, controls }: { creature: MapCreatureView; controls: CreatureControls }) {
  const { creature: statblock, loreGroup } = useCreatureStatblock(creature.creatureKey, creature.ruleset, null);
  return (
    <>
      {creature.isDown ? <div className="flex"><DownBadge /></div> : null}
      {controls.target ? <RollTargetButton control={controls.target} /> : null}
      {controls.hitPoints ? <MapCreatureHitPoints control={controls.hitPoints} /> : null}
      {controls.controller ? <ControllerPicker control={controls.controller} /> : null}
      <StatblockBody creature={creature} statblock={statblock} loreDescription={loreGroup?.description ?? null} />
      {controls.conditions ? <TokenConditionToggles control={controls.conditions} /> : null}
    </>
  );
}

export function CreatureTokenSettings({ creature, sessionId, controls }: { creature: MapCreatureView; sessionId: number; controls: CreatureControls }) {
  const { naming, cutout, size, borderColor, copyToScene, onRemove } = controls;
  return (
    <>
      {naming ? <CreaturePlayerNameEditor key={`${creature.id}-${naming.value}`} control={naming} realName={creature.statblockName ?? creature.label} /> : null}
      {cutout ? <CreatureImageSection key={creature.id} sessionId={sessionId} creature={creature} cutout={cutout} /> : null}
      {borderColor ? <TokenBorderColorPicker control={borderColor} /> : null}
      {size ? <TokenSizePicker size={size} /> : null}
      {copyToScene ? <CopyToScenePicker control={copyToScene} /> : null}
      {onRemove ? <RemoveFromMapButton onRemove={onRemove} /> : null}
    </>
  );
}

function TokenBorderColorPicker({ control }: { control: BorderColorControl }) {
  const value = control.value ?? "default";
  return (
    <div className="grid gap-2">
      <span className="text-sm text-slate-400">Колір обводки</span>
      <Segmented label="Колір обводки" value={value} options={[...BORDER_COLORS]} onChange={(next) => { if (next !== value) control.onChange(next === "default" ? null : next); }} />
    </div>
  );
}

/// Вибір одразу копіює: НІП переходить на іншу карту з тими самими хітами й станами, а тут лишається, поки його не приберуть.
function CopyToScenePicker({ control }: { control: CopyToSceneControl }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-slate-400">Копіювати на іншу карту</span>
      <select value="" onChange={(event) => { if (event.target.value) control.onCopy(Number(event.target.value)); }} className="h-11 rounded-lg border border-white/15 bg-slate-950 px-3 text-base text-slate-100">
        <option value="">Оберіть карту…</option>
        {control.scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.name}</option>)}
      </select>
    </label>
  );
}

/// Фамільяр чи прикликана істота: герой рухає її, міняє хіти й стани та бачить статблок. Решта налаштувань лишається в майстра.
function ControllerPicker({ control }: { control: ControllerControl }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-slate-400">Керує</span>
      <select value={control.value ?? ""} onChange={(event) => control.onChange(event.target.value ? Number(event.target.value) : null)} className="h-11 rounded-lg border border-white/15 bg-slate-950 px-3 text-base text-slate-100">
        <option value="">Майстер</option>
        {control.heroes.map((hero) => <option key={hero.id} value={hero.id}>{hero.name}</option>)}
      </select>
    </label>
  );
}

function RemoveFromMapButton({ onRemove }: { onRemove: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onRemove} className="h-11 gap-2 justify-self-start">
      <Trash2 className="h-4 w-4" aria-hidden />
      Прибрати з мапи
    </Button>
  );
}

const SPLIT_DIALOG = "lg:h-[90dvh] lg:w-[calc(100vw-3rem)] lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-6 lg:overflow-hidden";
const SPLIT_COLUMN = "lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1";

type Statblock = ReturnType<typeof useCreatureStatblock>["creature"];

function StatblockBody({ creature, statblock, loreDescription }: { creature: MapCreatureView | null; statblock: Statblock; loreDescription: string | null }) {
  if (!statblock || !creature) return <p className="py-10 text-center text-sm text-slate-400">Завантаження статблоку…</p>;
  return <CreatureStatblockCard creature={statblock} is2024={creature.ruleset === "RULES_2024"} loreGroupDescription={loreDescription} rollName={creature.playerLabel} />;
}

function CreaturePortrait({ creature }: { creature: MapCreatureView }) {
  const isArtHidden = useIsArtHidden(creature.imageUrl, "manual");
  if (!creature.imageUrl || isArtHidden) return null;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-64">
      <ContentImage src={creature.imageUrl} alt={creature.label} provenance="manual" fill sizes="256px" className={creature.isRoundImage ? "object-contain" : "rounded-2xl object-cover object-top"} />
    </div>
  );
}

const findChoiceClass = (isChosen: boolean) => cn("h-11 rounded-xl border text-sm", isChosen ? "border-white/30 bg-white/10 text-slate-100" : "border-white/10 text-slate-400 hover:text-slate-200");
function TokenSizePicker({ size }: { size: SizeControl }) {
  return (
    <div role="group" aria-label="Розмір на мапі" className="grid gap-2">
      <span className="text-sm text-slate-400">Розмір на мапі</span>
      <div className="grid grid-cols-3 gap-1.5">
        {CREATURE_TOKEN_SIZES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={size.value === option}
            onClick={() => size.onChange(option)}
            className={findChoiceClass(size.value === option)}
          >
            {CREATURE_TOKEN_SIZE_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

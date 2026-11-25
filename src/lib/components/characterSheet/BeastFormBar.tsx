"use client";

import { PawPrint } from "lucide-react";
import type { CreatureData } from "@/lib/bestiaryData";

/// Що показано під смугою форми: статблок звіра з числами персонажа, лист у формі чи власний лист.
export type BeastSheetLayer = "statblock" | "beast" | "own";

/**
 * Смуга другого шару над листом: ким ти став і перемикач «статблок / істота / ти».
 * Статблок — той самий компонент, що в бестіарії, з числами форми
 * ([KR24.4](docs/o24-wildshape-second-layer/kr24.4-second-layer.md)).
 *
 * Дії, атаки та особливості звіра лишаються в статблоці й у риси персонажа не конвертуються
 * ([Р-2](docs/o24-wildshape-second-layer/README.md)).
 */
export function BeastFormBar({ creature, is2024, layer, onLayerChange }: { creature: CreatureData; is2024: boolean; layer: BeastSheetLayer; onLayerChange: (next: BeastSheetLayer) => void }) {
  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-3 py-2 md:px-4">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <PawPrint className="h-4 w-4 shrink-0 text-emerald-300" />
          <span className="truncate text-sm font-bold text-emerald-200">{creature.name}</span>
          <span className="hidden truncate text-xs text-emerald-300/60 sm:inline">Звірина форма</span>
        </div>
        <LayerSwitch layer={layer} onLayerChange={onLayerChange} />
      </div>
      <p className="mx-auto mt-1 max-w-5xl text-xs leading-tight text-emerald-200/70">{describeLayerHint(layer, is2024)}</p>
    </div>
  );
}

/// Хіти — єдине, що редакції розводять просто на листі: у 2014 це стос звіра, у 2024 персонаж
/// лишається у своїх і бере тимчасові. Вхід бонусною дією 2024 має в базовому класі, тож про
/// нього тут і сказано.
function describeLayerHint(layer: BeastSheetLayer, is2024: boolean): string {
  if (layer === "own") return "Показано ваш власний лист. Числа звіра сховані, з форми ви не вийшли.";
  if (layer === "statblock") return "Статблок звіра з вашими Інтелектом, Мудрістю й Харизмою, КЗ і хітами форми. Кидки — з нього.";

  return is2024
    ? "Характеристики, КБ і швидкість — звірині. Хіти лишаються вашими, плюс тимчасові. Вхід і вихід — бонусна дія."
    : "Характеристики, КБ, швидкість і хіти — звірині. Заклинання й спорядження у формі недоступні.";
}

const LAYER_OPTIONS: Array<{ value: BeastSheetLayer; label: string }> = [{ value: "statblock", label: "Статблок" }, { value: "beast", label: "Істота" }, { value: "own", label: "Ти" }];

function LayerSwitch({ layer, onLayerChange }: { layer: BeastSheetLayer; onLayerChange: (next: BeastSheetLayer) => void }) {
  return (
    <div className="flex items-center overflow-hidden rounded-md border border-emerald-400/30">
      {LAYER_OPTIONS.map((option) => <SwitchOption key={option.value} label={option.label} active={layer === option.value} onSelect={() => onLayerChange(option.value)} />)}
    </div>
  );
}

function SwitchOption({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={
        "px-2.5 py-1 text-xs transition max-md:min-h-10 " +
        (active ? "bg-emerald-500/30 text-emerald-50" : "text-emerald-200/70 hover:bg-emerald-500/10")
      }
    >
      {label}
    </button>
  );
}

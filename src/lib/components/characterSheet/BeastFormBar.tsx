"use client";

import { useState } from "react";
import { BookOpen, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import type { CreatureData } from "@/lib/bestiaryData";

/**
 * Смуга другого шару над листом: ким ти став, перемикач «ти / істота» й повний статблок
 * істоти, не виходячи з листа. Статблок — той самий компонент, що в бестіарії
 * ([KR24.4](docs/o24-wildshape-second-layer/kr24.4-second-layer.md)); власної урізаної картки
 * тут немає свідомо — саме на неможливість прочитати, ким ти є, і була скарга.
 *
 * Дії, атаки та особливості звіра лишаються в статблоці й у риси персонажа не конвертуються
 * ([Р-2](docs/o24-wildshape-second-layer/README.md)).
 */

export function BeastFormBar({
  creature,
  is2024,
  showBeastLayer,
  onToggleLayer,
}: {
  creature: CreatureData;
  is2024: boolean;
  showBeastLayer: boolean;
  onToggleLayer: (next: boolean) => void;
}) {
  const [statblockOpen, setStatblockOpen] = useState(false);

  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-3 py-2 md:px-4">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <PawPrint className="h-4 w-4 shrink-0 text-emerald-300" />
          <span className="truncate text-sm font-bold text-emerald-200">{creature.name}</span>
          <span className="hidden truncate text-xs text-emerald-300/60 sm:inline">Звірина форма</span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-emerald-200"
          onClick={() => setStatblockOpen(true)}
        >
          <BookOpen className="h-4 w-4" />
          Статблок
        </Button>

        <LayerSwitch showBeastLayer={showBeastLayer} onToggleLayer={onToggleLayer} />
      </div>

      <p className="mx-auto mt-1 max-w-5xl text-[11px] leading-tight text-emerald-200/70">
        {describeLayerHint(showBeastLayer, is2024)}
      </p>

      <Dialog open={statblockOpen} onOpenChange={setStatblockOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{creature.name}</DialogTitle>
          </DialogHeader>
          <CreatureStatblockCard creature={creature} is2024={is2024} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/// Хіти — єдине, що редакції розводять просто на листі: у 2014 це стос звіра, у 2024 персонаж
/// лишається у своїх і бере тимчасові. Вхід бонусною дією 2024 має в базовому класі, тож про
/// нього тут і сказано.
function describeLayerHint(showBeastLayer: boolean, is2024: boolean): string {
  if (!showBeastLayer) return "Показано ваш власний лист. Числа звіра сховані, з форми ви не вийшли.";

  return is2024
    ? "Характеристики, КБ і швидкість — звірині. Хіти лишаються вашими, плюс тимчасові. Вхід і вихід — бонусна дія."
    : "Характеристики, КБ, швидкість і хіти — звірині. Заклинання й спорядження у формі недоступні.";
}

function LayerSwitch({
  showBeastLayer,
  onToggleLayer,
}: {
  showBeastLayer: boolean;
  onToggleLayer: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-md border border-emerald-400/30">
      <SwitchOption label="Ти" active={!showBeastLayer} onSelect={() => onToggleLayer(false)} />
      <SwitchOption label="Істота" active={showBeastLayer} onSelect={() => onToggleLayer(true)} />
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
        "px-2 py-1 text-xs transition " +
        (active ? "bg-emerald-500/30 text-emerald-50" : "text-emerald-200/70 hover:bg-emerald-500/10")
      }
    >
      {label}
    </button>
  );
}

"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { WILD_MAGIC_SURGE_TABLE_ROWS } from "@/lib/wild-magic-surge-table";
import { cn } from "@/lib/utils";

export function WildMagicSurgeTableDialog({
  open,
  onOpenChange,
  selectedRoll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRoll: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto border-white/10 bg-slate-950/95 p-4 text-slate-100 sm:p-6">
        <DialogHeader>
          <DialogTitle>Таблиця сплесків дикої магії</DialogTitle>
          <DialogDescription>Чародій · Сплеск дикої магії · правила 2014</DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="w-20 border border-white/10 px-3 py-2 font-medium">к100</th>
                <th className="border border-white/10 px-3 py-2 font-medium">Ефект</th>
              </tr>
            </thead>
            <tbody>
              {WILD_MAGIC_SURGE_TABLE_ROWS.map((row) => (
                <tr
                  key={row.roll}
                  className={cn("border-b border-white/10", row.roll === selectedRoll && "bg-arcane-500/15")}
                >
                  <td className="border border-white/10 px-3 py-2 font-mono text-xs text-arcane-200">
                    {row.roll.replace("-", "–")}
                  </td>
                  <td className="border border-white/10 px-3 py-2 text-slate-300">
                    <FormattedDescription content={row.description} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

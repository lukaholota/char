"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, PawPrint, Sword } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { damageBeastForm, healBeastForm } from "@/server/db/wildshape-actions";
import type { BeastFormView } from "./BeastFormMarks";

/**
 * Хіти у формі — стос звіра, і шкода йде по ньому. Блок хітів на листі один
 * ([Р-6](docs/o24-wildshape-second-layer/README.md)), тож і діалог шкоди у формі один — цей;
 * звичайний із кидками смерті та тимчасовими хітами у формі не відкривається взагалі.
 *
 * Падіння форми не має права бути тихою зміною числа: надлишок шкоди переливається у власні
 * хіти, і гравець мусить це побачити, а не порахувати потім.
 */

type FallenForm = { carriedOver: number; persCurrentHp: number };

export function BeastHitPointsDialog({
  view,
  open,
  onOpenChange,
}: {
  view: BeastFormView;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [fallen, setFallen] = useState<FallenForm | null>(null);

  const persId = view.ownPers.persId;

  /// Оновлення листа відкладене до підтвердження саме тому, що інакше падіння форми зникає
  /// разом із діалогом: щойно активної форми не стає, другий шар зникає, а з ним і повідомлення
  /// про перелив. Подія має дочекатися, поки її прочитають.
  function closeAll() {
    const wasFallen = fallen !== null;
    setFallen(null);
    setAmount("");
    onOpenChange(false);
    if (wasFallen) {
      view.onChanged();
      router.refresh();
    }
  }

  async function applyDamage() {
    const damage = Number(amount);
    if (!Number.isFinite(damage) || damage <= 0) return;

    setIsPending(true);
    const result = await damageBeastForm({ persId, damage });
    setIsPending(false);
    setAmount("");

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (!result.reverted) {
      view.onChanged();
      router.refresh();
      return;
    }

    setFallen({ carriedOver: result.carriedOver, persCurrentHp: result.persCurrentHp });
    toast.warning(
      result.carriedOver > 0
        ? `Форма впала, ${result.carriedOver} шкоди перелилося на ваші хіти`
        : "Форма впала — ви повернулись у звичайну подобу"
    );
  }

  async function applyHealing() {
    const healing = Number(amount);
    if (!Number.isFinite(healing) || healing <= 0) return;

    setIsPending(true);
    const result = await healBeastForm({ persId, healing });
    setIsPending(false);
    setAmount("");

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    view.onChanged();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : closeAll())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <PawPrint className="h-5 w-5 text-amber-300" />
            Хіти звіриної форми
          </DialogTitle>
        </DialogHeader>

        {fallen ? (
          <FallenFormNotice fallen={fallen} onAcknowledge={closeAll} />
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs">
              <div className="text-slate-200">
                Хіти звіра:{" "}
                <span className="font-mono font-semibold text-amber-200">
                  {view.layer.beastCurrentHp} / {view.layer.beastMaxHp}
                </span>
              </div>
              <div className="mt-1 text-slate-400">
                Ваші хіти:{" "}
                <span className="font-mono text-slate-300">
                  {view.ownPers.currentHp} / {view.ownPers.maxHp}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Шкода йде по хітах звіра. Коли їх не стане, форма впаде, а надлишок переллється на
              ваші хіти.
            </p>

            <div className="flex items-center gap-2">
              <Input
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                placeholder="Скільки"
                className="h-9 w-24"
                autoFocus
              />
              <Button size="sm" variant="destructive" disabled={isPending || !amount} onClick={applyDamage}>
                <Sword className="mr-2 h-4 w-4" />
                Шкода
              </Button>
              <Button size="sm" variant="secondary" disabled={isPending || !amount} onClick={applyHealing}>
                <Heart className="mr-2 h-4 w-4" />
                Зцілення
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FallenFormNotice({ fallen, onAcknowledge }: { fallen: FallenForm; onAcknowledge: () => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-rose-400/50 bg-rose-500/15 p-4">
        <div className="text-base font-bold text-rose-200">Форма впала</div>
        <p className="mt-1 text-sm text-slate-200">
          {fallen.carriedOver > 0
            ? `${fallen.carriedOver} шкоди перелилося на ваші хіти.`
            : "Ви повернулись у звичайну подобу — власних хітів це не торкнулося."}
        </p>
        <div className="mt-2 text-sm text-slate-300">
          Ваші хіти: <span className="font-mono font-semibold text-rose-200">{fallen.persCurrentHp}</span>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onAcknowledge}>Зрозуміло</Button>
      </div>
    </div>
  );
}

import { toast } from "sonner";
import type { PersWithRelations } from "@/lib/actions/pers";

type SaveOutcome = { success: boolean; error?: string };

export type OptimisticSave<TResult extends SaveOutcome> = {
  prevPers: PersWithRelations;
  nextPers: PersWithRelations;
  onPersUpdate: (pers: PersWithRelations) => void;
  close: () => void;
  refresh: () => void;
  send: () => Promise<TResult>;
  applyResult?: (result: TResult) => void;
};

/** Лист показує нове значення одразу й закриває діалог; невдале збереження повертає попереднє. */
export function commitOptimisticSave<TResult extends SaveOutcome>(save: OptimisticSave<TResult>): void {
  save.onPersUpdate(save.nextPers);
  save.close();

  void save
    .send()
    .then((result) => {
      if (result.success) save.applyResult?.(result);
      else rollBack(save, result.error);
      save.refresh();
    })
    .catch((err) => {
      console.error(err);
      rollBack(save, "Помилка при збереженні");
      save.refresh();
    });
}

export async function sendAll(sends: readonly Promise<SaveOutcome>[]): Promise<SaveOutcome> {
  const results = await Promise.all(sends);
  return results.find((result) => !result.success) ?? { success: true };
}

function rollBack(save: Pick<OptimisticSave<SaveOutcome>, "prevPers" | "onPersUpdate">, error: string | undefined): void {
  save.onPersUpdate(save.prevPers);
  toast.error(error);
}

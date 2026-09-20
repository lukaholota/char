"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { Button } from "@/components/ui/button";
import { deleteHomebrewEntry } from "@/lib/actions/homebrew-actions";
import { useTwoStepConfirm } from "@/hooks/useTwoStepConfirm";

export function HomebrewEntryActions({ entryId }: { entryId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { ref, isConfirming, onClick } = useTwoStepConfirm<HTMLButtonElement>({
    onConfirm: () =>
      startTransition(async () => {
        const result = await deleteHomebrewEntry(entryId);
        if (!result.success) return void toast.error(result.error);
        toast.success("Запис видалено");
        router.push("/homebrew");
      }),
  });

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button asChild variant="secondary" className="h-11 gap-2 sm:h-9">
        <Link href={`/homebrew/${entryId}/edit`}>
          <Pencil className="h-4 w-4" />
          Редагувати
        </Link>
      </Button>
      <Button ref={ref} type="button" variant="secondary" className="h-11 gap-2 text-rose-300 sm:h-9" disabled={isPending} onClick={onClick}>
        <Trash2 className="h-4 w-4" />
        {isConfirming ? "Точно видалити?" : "Видалити"}
      </Button>
    </div>
  );
}

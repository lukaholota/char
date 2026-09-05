"use client";

import { type ReactNode, useEffect, useState } from "react";
import type { Ruleset } from "@prisma/client";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildWildshapePickerUrl } from "@/lib/bestiary-wildshape";

/// Пікер — це `/bestiary` у режимі вбудовування, а не друга копія каталогу: пошук, фільтри,
/// картинки й повний статблок там уже написані. Власний список був єдиним у проєкті, що пішов
/// своїм шляхом, і платив за це обрізанням на 60 результатах.

interface AddWildshapeFormDialogProps {
  persId: number;
  persName: string;
  ruleset: Ruleset;
  onAdded: () => void;
  children: ReactNode;
}

export function AddWildshapeFormDialog({
  persId,
  persName,
  ruleset,
  onAdded,
  children,
}: AddWildshapeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [pickerUrl, setPickerUrl] = useState<string | null>(null);

  useEffect(() => {
    /// Походження iframe своє й відоме — на відміну від патерну заклинань, який шле й приймає
    /// повідомлення з `"*"`.
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "WILDSHAPE_FORM_ADDED") onAdded();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onAdded]);

  function openPicker(onlyEligible: boolean) {
    setPickerUrl(buildWildshapePickerUrl({ persId, persName, ruleset, onlyEligible }));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPickerUrl(null);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={`${pickerUrl ? "h-[90vh] max-w-5xl" : "max-w-md"} flex flex-col overflow-hidden border-white/10 bg-slate-950 p-0`}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Додати звірину форму</DialogTitle>

        {pickerUrl ? (
          <div className="w-full flex-1 bg-slate-950">
            <iframe src={pickerUrl} className="h-full w-full border-0" title="Бестіарій" />
          </div>
        ) : (
          <FilteringChoice onChoose={openPicker} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/// Той самий екран-передмова, що й у заклинань: гравець вирішує, дивитися на свій зріз каталогу
/// чи на весь. Замовчування — з фільтром.
function FilteringChoice({ onChoose }: { onChoose: (onlyEligible: boolean) => void }) {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2 text-center text-slate-200">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <Filter className="h-6 w-6" />
        </div>
        <p className="text-xl font-bold">Фільтрація за персонажем</p>
        <p className="text-sm text-slate-400">
          Показати лише ті звірині форми, які вам зараз доступні?
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={() => onChoose(true)}
          className="h-12 bg-emerald-600 font-bold text-white hover:bg-emerald-500"
        >
          Так, лише придатні мені
        </Button>
        <Button
          variant="ghost"
          onClick={() => onChoose(false)}
          className="text-slate-400 hover:text-white"
        >
          Ні, весь бестіарій
        </Button>
      </div>
    </div>
  );
}

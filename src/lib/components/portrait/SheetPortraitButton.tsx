"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { buildMediaImageUrl } from "@/lib/media-url";
import { PortraitDialog } from "./PortraitDialog";

type Props = {
  persId: number;
  name: string;
  portraitKey: string | null;
  canEdit: boolean;
  onPortraitChange: (portraitKey: string | null) => void;
};

export function SheetPortraitButton({ persId, name, portraitKey, canEdit, onPortraitChange }: Props) {
  const [open, setOpen] = useState(false);
  if (!canEdit && !portraitKey) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="aspect-square w-16 shrink-0 transition hover:brightness-110 md:w-20" aria-label={canEdit ? "Портрет персонажа: змінити" : "Портрет персонажа"}>
        <FramedIllustration
          src={portraitKey ? buildMediaImageUrl(portraitKey, "full") : null}
          alt={`Портрет: ${name}`}
          provenance="drawn"
          sizes="80px"
          chamfer="sm"
          vignette="sm"
          fallback={<UserRound className="absolute inset-0 m-auto h-1/2 w-1/2 text-slate-500" aria-hidden />}
        />
      </button>
      <PortraitDialog
        persId={persId}
        name={name}
        portraitKey={portraitKey}
        canEdit={canEdit}
        open={open}
        onOpenChange={setOpen}
        onPortraitChange={onPortraitChange}
      />
    </>
  );
}

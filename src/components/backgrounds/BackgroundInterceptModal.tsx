"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Ruleset } from "@prisma/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getBackgroundByIdOrSlug } from "@/lib/backgroundsData";
import { BackgroundDetailCard } from "@/components/backgrounds/BackgroundDetailCard";

export function BackgroundInterceptModal({
  idOrSlug,
  ruleset,
}: {
  idOrSlug: string;
  ruleset: Ruleset;
}) {
  const router = useRouter();
  const background = getBackgroundByIdOrSlug(idOrSlug, ruleset);

  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    if (!background) router.back();
  }, [background, router]);

  if (!background) return null;

  return (
    <Dialog enableBackButtonClose={false} open onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-h-[90dvh] w-[92vw] max-w-xl overflow-y-auto overflow-x-hidden border-0 bg-transparent p-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{background.name}</DialogTitle>
        <BackgroundDetailCard background={background} is2024={ruleset === "RULES_2024"} />
      </DialogContent>
    </Dialog>
  );
}

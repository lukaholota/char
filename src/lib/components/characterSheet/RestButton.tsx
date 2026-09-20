"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Moon, Sun, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { longRest } from "@/lib/actions/rest-actions";
import { findHeroicInspirationCountAfterLongRest } from "@/rules/heroic-inspiration";
import { restTranslations } from "@/lib/refs/translation";
import ShortRestDialog from "./ShortRestDialog";
import { PersWithRelations } from "@/lib/actions/pers";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { createOperationId } from "@/lib/offline/queue";
import { endAllFeatureStates } from "@/lib/logic/feature-state-rows";
import { endEffectsAfterRest } from "@/lib/logic/pers-effect-rows";

interface RestButtonProps {
  pers: PersWithRelations;
  onPersUpdate?: (next: PersWithRelations) => void;
  onGroupedFeaturesRefresh?: () => void;
  onRestQueued?: () => void;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerLabelClassName?: string;
}

export default function RestButton({
  pers,
  onPersUpdate,
  onGroupedFeaturesRefresh,
  onRestQueued,
  triggerClassName,
  triggerLabel,
  triggerLabelClassName,
}: RestButtonProps) {
  const router = useRouter();
  const { commitOperation } = useOfflineQueue();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shortRestOpen, setShortRestOpen] = useState(false);
  const [longRestOpen, setLongRestOpen] = useState(false);

  const refreshInBackground = () => {
    startRefreshTransition(() => {
      router.refresh();
    });
  };

  const handleLongRest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const outcome = await commitOperation(
        { kind: "long-rest", operationId: createOperationId(), persId: pers.persId, createdAt: new Date().toISOString() },
        () => longRest(pers.persId),
      );
      if (outcome.queued) {
        onRestQueued?.();
        toast.success(restTranslations.longRestComplete, { description: restTranslations.savedOffline });
        setLongRestOpen(false);
        return;
      }

      const res = outcome.result;
      if (!res.success) {
        toast.error(res.error);
        return;
      }

      /// Те саме правило, що й на сервері (`longRest`): відповідь дії його не несе, бо її
      /// дослівно фіксують золоті знімки, а лист має показати натхнення до оновлення сторінки.
      const heroicInspirationCount = findHeroicInspirationCountAfterLongRest({
        heroicInspirationCount: pers.heroicInspirationCount,
        canStackHeroicInspiration: pers.canStackHeroicInspiration,
        featureEngNames: pers.features.map((persFeature) => persFeature.feature.engName),
      });

      onPersUpdate?.({
        ...endEffectsAfterRest(endAllFeatureStates(pers), "LONG"),
        currentHp: res.newCurrentHp,
        tempHp: 0,
        currentHitDice: res.currentHitDice as any,
        currentSpellSlots: res.currentSpellSlots as any,
        currentPactSlots: res.currentPactSlots as any,
        deathSaveSuccesses: 0 as any,
        deathSaveFailures: 0 as any,
        isDead: false as any,
        heroicInspirationCount,
      });

      onGroupedFeaturesRefresh?.();

      const gainedHeroicInspiration = heroicInspirationCount > pers.heroicInspirationCount;
      toast.success(restTranslations.longRestComplete, {
        description: `HP: ${res.newCurrentHp}, ${restTranslations.featuresRestored}: ${res.featuresRestored}${
          gainedHeroicInspiration ? `, ${restTranslations.heroicInspirationGained}` : ""
        }`,
      });
      setLongRestOpen(false);
      refreshInBackground();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className={[
              "h-8 gap-2 bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/30",
              triggerClassName,
            ].filter(Boolean).join(" ")}
            disabled={isSubmitting}
          >
            <Moon className="w-4 h-4" />
            <span className={triggerLabelClassName ?? "hidden sm:inline"}>{triggerLabel ?? restTranslations.rest}</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShortRestOpen(true)}>
            <Sun className="w-4 h-4 mr-2" />
            {restTranslations.shortRest}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLongRestOpen(true)}>
            <Moon className="w-4 h-4 mr-2" />
            {restTranslations.longRest}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShortRestDialog
        pers={pers}
        open={shortRestOpen}
        onOpenChange={setShortRestOpen}
        onPersUpdate={onPersUpdate ? (next) => onPersUpdate(next) : undefined}
        onGroupedFeaturesRefresh={onGroupedFeaturesRefresh}
        onRestQueued={onRestQueued}
      />

      <Dialog open={longRestOpen} onOpenChange={setLongRestOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{restTranslations.confirmLongRest}</DialogTitle>
            <DialogDescription>
              {restTranslations.longRestDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="secondary"
              onClick={() => setLongRestOpen(false)}
              disabled={isSubmitting}
            >
              {restTranslations.cancel}
            </Button>
            <Button
              onClick={handleLongRest}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting || isRefreshing ? restTranslations.takingLongRest : restTranslations.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

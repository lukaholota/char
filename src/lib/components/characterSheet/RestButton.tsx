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
import { restTranslations } from "@/lib/refs/translation";
import ShortRestDialog from "./ShortRestDialog";
import { PersWithRelations, CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import { useModalBackButton } from "@/hooks/useModalBackButton";

interface RestButtonProps {
  pers: PersWithRelations;
  onPersUpdate?: (next: PersWithRelations) => void;
  onFeaturesUpdate?: (next: CharacterFeaturesGroupedResult) => void;
}

export default function RestButton({ pers, onPersUpdate, onFeaturesUpdate }: RestButtonProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shortRestOpen, setShortRestOpen] = useState(false);
  const [longRestOpen, setLongRestOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useModalBackButton(dropdownOpen, () => setDropdownOpen(false));

  const refreshInBackground = () => {
    startRefreshTransition(() => {
      router.refresh();
    });
  };

  const handleLongRest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await longRest(pers.persId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }

      onPersUpdate?.({
        ...pers,
        currentHp: res.newCurrentHp,
        tempHp: 0,
        currentHitDice: res.currentHitDice as any,
        currentSpellSlots: res.currentSpellSlots as any,
        currentPactSlots: res.currentPactSlots as any,
        deathSaveSuccesses: 0 as any,
        deathSaveFailures: 0 as any,
        isDead: false as any,
      });

      if (res.groupedFeatures) {
        onFeaturesUpdate?.(res.groupedFeatures);
      }

      toast.success(restTranslations.longRestComplete, {
        description: `HP: ${res.newCurrentHp}, ${restTranslations.featuresRestored}: ${res.featuresRestored}`,
      });
      setLongRestOpen(false);
      refreshInBackground();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-2 bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/30"
            disabled={isSubmitting}
          >
            <Moon className="w-4 h-4" />
            <span className="hidden sm:inline">{restTranslations.rest}</span>
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
        onFeaturesUpdate={onFeaturesUpdate}
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
              className="bg-indigo-600 hover:bg-indigo-700 text-slate-200"
            >
              {isSubmitting || isRefreshing ? restTranslations.takingLongRest : restTranslations.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

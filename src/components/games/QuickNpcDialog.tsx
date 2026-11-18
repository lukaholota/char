"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ImagePlus, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { SideButton } from "@/components/bestiary/RoomCreatureAddPanel";
import { ContentImage } from "@/components/no-ai/ContentImage";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addMapCreaturesAction } from "@/lib/actions/game-sessions";
import { buildMediaImageUrl } from "@/lib/media-url";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { MAP_CREATURE_LIMITS, buildCreatureInitials } from "@/rules/game-map-creatures";
import { TokenImageLibrary } from "./CreatureImageSection";

const NPC_STATBLOCK = { creatureKey: "commoner", ruleset: "RULES_2014" } as const;
const NPC_STATBLOCK_NAME = "Простолюдин";

/// Найчастіша істота за столом — без бестіарію в iframe: імʼя, бік і портрет в одному вікні.
export function QuickNpcDialog({ sessionId }: { sessionId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" title="Додати НІПа — простолюдина з власним імʼям" className="h-11 gap-1.5 px-3">
          <UserRoundPlus className="h-4 w-4" aria-hidden />
          НІП
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-slate-950 sm:max-w-md">
        <div className="space-y-1 pr-10">
          <DialogTitle className="normal-case tracking-normal">Новий НІП</DialogTitle>
          <DialogDescription className="text-sm text-slate-400">Статблок простолюдина. Гравці бачать лише імʼя та портрет.</DialogDescription>
        </div>
        {isOpen ? <NpcForm sessionId={sessionId} onAdded={() => setIsOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function NpcForm({ sessionId, onAdded }: { sessionId: number; onAdded: () => void }) {
  const router = useModeRouter();
  const [name, setName] = useState("");
  const [isAlly, setIsAlly] = useState(true);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isAdding, startAdding] = useTransition();

  const add = (event: FormEvent) => {
    event.preventDefault();
    startAdding(async () => {
      const result = await addMapCreaturesAction(sessionId, { ...NPC_STATBLOCK, count: 1, isAlly, customName: name, imageKey }).catch(() => null);
      if (!result?.ok) return void toast.error(result?.error ?? "Не вдалося звʼязатися із сервером — спробуйте ще раз");
      toast.success(`${result.value.name} — у розділі «Поза мапою»`);
      captureGameEvent("game_creatures_added", { count: 1, edition: "2014" });
      router.refresh();
      onAdded();
    });
  };

  const pickImage = async (key: string) => {
    setImageKey(key);
    setIsPickingImage(false);
  };

  return (
    <form onSubmit={add} className="grid gap-4">
      <div className="flex items-end gap-3">
        <NpcPreview label={name.trim() || NPC_STATBLOCK_NAME} imageKey={imageKey} isAlly={isAlly} />
        <label className="grid flex-1 gap-1 text-sm text-slate-400">
          Імʼя для гравців
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={MAP_CREATURE_LIMITS.customNameLength} placeholder="Наприклад, Корчмар" className="h-12 text-base" />
        </label>
      </div>
      <div role="group" aria-label="Бік" className="flex w-fit rounded-xl border border-white/10 p-0.5">
        <SideButton isOn={isAlly} onClick={() => setIsAlly(true)} tone="border-emerald-400/60 bg-emerald-500/15 text-emerald-100">Союзник</SideButton>
        <SideButton isOn={!isAlly} onClick={() => setIsAlly(false)} tone="border-rose-400/60 bg-rose-500/15 text-rose-100">Ворог</SideButton>
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" aria-expanded={isPickingImage} onClick={() => setIsPickingImage(!isPickingImage)} className="h-11 gap-2">
            <ImagePlus className="h-4 w-4" aria-hidden />
            {isPickingImage ? "Згорнути" : imageKey ? "Змінити портрет" : "Обрати портрет"}
          </Button>
          {imageKey && !isPickingImage ? <Button type="button" variant="ghost" onClick={() => setImageKey(null)} className="h-11 px-3 text-slate-300">Без портрета</Button> : null}
        </div>
        {isPickingImage ? <TokenImageLibrary chosenKey={imageKey} cropTitle="Портрет НІПа" onPick={pickImage} /> : null}
      </div>
      <Button type="submit" disabled={isAdding} className="h-12 text-base">
        {isAdding ? "Додаю…" : "Додати НІПа"}
      </Button>
    </form>
  );
}

function NpcPreview({ label, imageKey, isAlly }: { label: string; imageKey: string | null; isAlly: boolean }) {
  return (
    <div aria-hidden className={cn("relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 bg-slate-900", isAlly ? "border-emerald-400/70" : "border-rose-400/70")}>
      {imageKey ? (
        <ContentImage src={buildMediaImageUrl(imageKey, "thumbnail")} alt="" provenance="manual" fill sizes="56px" className="object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center font-rpg-display text-slate-100">{buildCreatureInitials(label)}</span>
      )}
    </div>
  );
}

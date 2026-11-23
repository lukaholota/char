"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, BookOpen, ImagePlus, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { STATBLOCK_PICK_PARAM, readPickedStatblock, type PickedStatblock } from "@/components/bestiary/RoomCreatureAddPanel";
import { ContentImage } from "@/components/no-ai/ContentImage";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addMapCreaturesAction } from "@/lib/actions/game-sessions";
import { buildMediaImageUrl } from "@/lib/media-url";
import { DEFAULT_NPC_STATBLOCK } from "@/lib/refs/npc-statblocks";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { MAP_CREATURE_LIMITS, buildCreatureInitials } from "@/rules/game-map-creatures";
import { BESTIARY_DIALOG_CLASS, BestiaryFrame, buildBestiaryPickerUrl, type BestiaryEdition } from "./AddMapCreaturesDialog";
import { TokenImageLibrary } from "./CreatureImageSection";

const DEFAULT_STATBLOCK: PickedStatblock = DEFAULT_NPC_STATBLOCK;

/// Імʼя, бік і портрет в одному вікні; статблок — будь-яка істота бестіарію, зокрема хоумбрю, у тому ж вікні.
export function QuickNpcDialog({ sessionId }: { sessionId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [statblock, setStatblock] = useState(DEFAULT_STATBLOCK);
  const [pickerEdition, setPickerEdition] = useState<BestiaryEdition | null>(null);
  const isPicking = pickerEdition !== null;
  useEffect(() => {
    if (!isPicking) return;
    const handleMessage = (event: MessageEvent) => {
      const picked = event.origin === window.location.origin ? readPickedStatblock(event.data) : null;
      if (!picked) return;
      setStatblock(picked);
      setPickerEdition(null);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isPicking]);
  const openChange = (open: boolean) => {
    setIsOpen(open);
    setPickerEdition(null);
  };
  return (
    <Dialog open={isOpen} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" title="Додати НІПа з власним імʼям: простолюдин, варта, нежить…" className="h-11 gap-1.5 px-3">
          <UserRoundPlus className="h-4 w-4" aria-hidden />
          НІП
        </Button>
      </DialogTrigger>
      <DialogContent className={pickerEdition ? BESTIARY_DIALOG_CLASS : "max-h-[90dvh] overflow-y-auto bg-slate-950 sm:max-w-md"}>
        {pickerEdition ? (
          <BestiaryFrame
            heading={
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Button type="button" variant="ghost" size="icon" aria-label="Назад до НІПа" onClick={() => setPickerEdition(null)} className="h-10 w-10 shrink-0">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </Button>
                <DialogTitle className="truncate normal-case leading-10 tracking-normal">Статблок НІПа</DialogTitle>
              </div>
            }
            url={buildBestiaryPickerUrl(sessionId, pickerEdition, STATBLOCK_PICK_PARAM)}
            edition={pickerEdition}
            onEditionChange={setPickerEdition}
          />
        ) : (
          <div className="space-y-1 pr-10">
            <DialogTitle className="normal-case tracking-normal">Новий НІП</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">Гравці бачать лише імʼя та портрет, статблок — ніколи.</DialogDescription>
          </div>
        )}
        {isOpen ? (
          <div hidden={isPicking}>
            <NpcForm sessionId={sessionId} statblock={statblock} onPickStatblock={() => setPickerEdition(statblock.ruleset === "RULES_2024" ? "2024" : "2014")} onAdded={() => openChange(false)} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type FormProps = { sessionId: number; statblock: PickedStatblock; onPickStatblock: () => void; onAdded: () => void };

function NpcForm({ sessionId, statblock, onPickStatblock, onAdded }: FormProps) {
  const router = useModeRouter();
  const [name, setName] = useState("");
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isAdding, startAdding] = useTransition();

  const add = (event: FormEvent) => {
    event.preventDefault();
    startAdding(async () => {
      const result = await addMapCreaturesAction(sessionId, { creatureKey: statblock.key, ruleset: statblock.ruleset, count: 1, customName: name, imageKey }).catch(() => null);
      if (!result?.ok) return void toast.error(result?.error ?? "Не вдалося звʼязатися із сервером — спробуйте ще раз");
      toast.success(`${result.value.name} — у розділі «Поза мапою»`);
      captureGameEvent("game_creatures_added", { count: 1, edition: statblock.ruleset === "RULES_2024" ? "2024" : "2014" });
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
        <NpcPreview label={name.trim() || statblock.name} imageSrc={imageKey ? buildMediaImageUrl(imageKey, "thumbnail") : statblock.imageUrl} />
        <label className="grid flex-1 gap-1 text-sm text-slate-400">
          Імʼя для гравців
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={MAP_CREATURE_LIMITS.customNameLength} placeholder="Наприклад, Корчмар" className="h-12 text-base" />
        </label>
      </div>
      <div className="grid gap-1 text-sm text-slate-400">
        <span id="npc-statblock-label">Статблок</span>
        <button type="button" aria-labelledby="npc-statblock-label npc-statblock-name" onClick={onPickStatblock} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-slate-950 px-3 text-left text-base text-slate-100 hover:border-white/40">
          <BookOpen className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span id="npc-statblock-name" className="min-w-0 flex-1 truncate">{statblock.name}</span>
          {statblock.ruleset === "RULES_2024" ? <span className="text-xs text-slate-500">2024</span> : null}
          <span className="text-sm text-slate-400">Змінити</span>
        </button>
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" aria-expanded={isPickingImage} onClick={() => setIsPickingImage(!isPickingImage)} className="h-11 gap-2">
            <ImagePlus className="h-4 w-4" aria-hidden />
            {isPickingImage ? "Згорнути" : imageKey ? "Змінити портрет" : "Обрати портрет"}
          </Button>
          {imageKey && !isPickingImage ? <Button type="button" variant="ghost" onClick={() => setImageKey(null)} className="h-11 px-3 text-slate-300">Скинути портрет</Button> : null}
        </div>
        {isPickingImage ? <TokenImageLibrary chosenKey={imageKey} cropTitle="Портрет НІПа" onPick={pickImage} /> : null}
      </div>
      <Button type="submit" disabled={isAdding} className="h-12 text-base">
        {isAdding ? "Додаю…" : "Додати НІПа"}
      </Button>
    </form>
  );
}

function NpcPreview({ label, imageSrc }: { label: string; imageSrc: string | null }) {
  return (
    <div aria-hidden className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-slate-500 bg-slate-900">
      {imageSrc ? (
        <ContentImage src={imageSrc} alt="" provenance="manual" fill sizes="56px" className="object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center font-rpg-display text-slate-100">{buildCreatureInitials(label)}</span>
      )}
    </div>
  );
}

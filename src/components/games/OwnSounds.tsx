"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { Play, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { askToConfirm } from "@/components/ui/confirm-dialog";
import { deleteOwnSoundAction, listOwnSoundsAction, uploadOwnSoundAction } from "@/lib/actions/game-user-sounds";
import { cn } from "@/lib/utils";
import { OWN_SOUND_LIMITS, type AmbienceLayer, type OwnSoundKey } from "@/rules/game-atmosphere";
import type { OwnSound } from "@/server/db/user-sounds";
import { Hint } from "./MapToolPanels";

export const CHIP = "flex h-11 min-w-0 items-center justify-center rounded-xl border px-2 text-sm";
export const CHIP_OFF = "border-white/10 text-slate-300 hover:bg-white/10 hover:text-slate-100";
export const CHIP_ON = "border-arcane-300/50 bg-arcane-300/15 text-slate-100";

const CONNECTION_ERROR = "Не вдалося звʼязатися із сервером — спробуйте ще раз";
const MAX_MEGABYTES = OWN_SOUND_LIMITS.bytes / 1024 / 1024;
const ICON_BUTTON = cn(CHIP, CHIP_OFF, "w-11 shrink-0 px-0 disabled:opacity-40");

export type OwnSoundLibrary = ReturnType<typeof useOwnSounds>;

export function useOwnSounds() {
  const [sounds, setSounds] = useState<OwnSound[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const load = async () => {
    setHasFailed(false);
    const result = await listOwnSoundsAction().catch(() => null);
    if (result?.ok) setSounds(result.value);
    else setHasFailed(true);
  };
  useEffect(() => {
    void load();
  }, []);
  return { sounds, hasFailed, load, setSounds };
}

export const findOwnSoundName = (sounds: OwnSound[] | null, key: OwnSoundKey) => sounds?.find((sound) => sound.key === key)?.name ?? "Свій звук";

type Props = {
  library: OwnSoundLibrary;
  layers: AmbienceLayer[];
  isAmbienceFull: boolean;
  onPlay: (sound: OwnSound) => void;
  onToggleLayer: (key: OwnSoundKey) => void;
};

export function OwnSoundsSection({ library, layers, isAmbienceFull, onPlay, onToggleLayer }: Props) {
  const { sounds, hasFailed, load, setSounds } = library;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, startBusy] = useTransition();
  const isFull = (sounds?.length ?? 0) >= OWN_SOUND_LIMITS.perUser;

  const uploadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > OWN_SOUND_LIMITS.bytes) return void toast.error(`Файл завеликий — до ${MAX_MEGABYTES} МБ`);
    startBusy(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const uploaded = await uploadOwnSoundAction(formData).catch(() => null);
      if (!uploaded?.ok) return void toast.error(uploaded?.error ?? CONNECTION_ERROR);
      setSounds((current) => [uploaded.value, ...(current ?? [])]);
    });
  };

  const deleteSound = async (sound: OwnSound) => {
    const isConfirmed = await askToConfirm({ title: `Видалити «${sound.name}»?`, description: "Звук зникне з бібліотеки й перестане грати фоном у ваших сценах.", confirmLabel: "Видалити", isDestructive: true });
    if (!isConfirmed) return;
    startBusy(async () => {
      const result = await deleteOwnSoundAction(sound.key).catch(() => null);
      if (!result?.ok) return void toast.error(result?.error ?? CONNECTION_ERROR);
      setSounds((current) => (current ?? []).filter((other) => other.key !== sound.key));
    });
  };

  return (
    <section aria-label="Мої звуки" aria-busy={isBusy || sounds === null} className="space-y-1.5">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <p className="text-sm text-slate-300">Мої звуки</p>
        <Button type="button" variant="outline" disabled={isBusy || isFull || hasFailed} onClick={() => inputRef.current?.click()} className="h-11 shrink-0 gap-2">
          <Upload className="h-4 w-4" aria-hidden />
          {isBusy ? "Зачекайте" : "Додати"}
        </Button>
        <input ref={inputRef} type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav" className="hidden" onChange={uploadFile} />
      </div>
      {hasFailed ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-rose-200">Не вдалося відкрити бібліотеку.</p>
          <Button type="button" variant="outline" onClick={() => void load()} className="h-11">Спробувати ще раз</Button>
        </div>
      ) : null}
      {sounds === null && !hasFailed ? <div className="h-11 rounded-xl border border-white/10 bg-white/5" aria-hidden /> : null}
      {sounds?.map((sound) => {
        const isOn = layers.some((layer) => layer.key === sound.key);
        return (
          <div key={sound.key} className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200" title={sound.name}>{sound.name}</span>
            <button type="button" aria-label={`${sound.name} — один раз для всіх`} onClick={() => onPlay(sound)} className={ICON_BUTTON}>
              <Play className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" aria-pressed={isOn} disabled={!isOn && isAmbienceFull} onClick={() => onToggleLayer(sound.key)} className={cn(CHIP, isOn ? CHIP_ON : CHIP_OFF, "shrink-0 px-3 disabled:opacity-40")}>
              Фоном
            </button>
            <button type="button" aria-label={`Видалити «${sound.name}»`} disabled={isBusy} onClick={() => void deleteSound(sound)} className={ICON_BUTTON}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        );
      })}
      {sounds?.length === 0 ? <Hint>Завантажте MP3, M4A або WAV до {MAX_MEGABYTES} МБ — і грайте всім на сцені один раз чи фоном.</Hint> : null}
      {isFull ? <Hint>У бібліотеці вже {OWN_SOUND_LIMITS.perUser} звуків — видаліть непотрібний, щоб додати новий.</Hint> : null}
    </section>
  );
}

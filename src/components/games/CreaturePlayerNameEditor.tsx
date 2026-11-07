"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { MAP_CREATURE_LIMITS } from "@/rules/game-map-creatures";

export type NameControl = { value: string | null; onSave: (name: string) => Promise<boolean> };

/// Своє імʼя ховає від гравців справжню назву; порожнє поле повертає назву зі статблоку. Статблок гравцям не показується ніколи.
export function CreaturePlayerNameEditor({ control, realName }: { control: NameControl; realName: string }) {
  const [draft, setDraft] = useState(control.value ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const shownName = draft.trim();
  const isChanged = shownName !== (control.value ?? "");
  const save = async (name: string) => {
    setIsSaving(true);
    const isSaved = await control.onSave(name);
    setIsSaving(false);
    if (isSaved) setDraft(name);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isChanged) void save(shownName);
  };
  return (
    <form onSubmit={submit} className="grid gap-2 rounded-xl border border-white/10 p-3">
      <label htmlFor="creature-player-name" className="text-sm text-slate-300">
        Що бачать гравці
      </label>
      <div className="flex gap-2">
        <input
          id="creature-player-name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAP_CREATURE_LIMITS.customNameLength}
          placeholder={realName}
          aria-describedby="creature-player-name-hint"
          className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-base text-slate-100 placeholder:text-slate-500"
        />
        <Button type="submit" disabled={!isChanged || isSaving} className="h-11">
          {isSaving ? "Зберігаю…" : "Зберегти"}
        </Button>
      </div>
      <p id="creature-player-name-hint" className="text-sm text-slate-400">
        {`Гравці бачать «${shownName || realName}» і картинку, статблок — ніколи.`}
      </p>
      {control.value !== null ? (
        <Button type="button" variant="outline" disabled={isSaving} onClick={() => void save("")} className="h-11 justify-self-start">
          Повернути справжню назву
        </Button>
      ) : null}
    </form>
  );
}

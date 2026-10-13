"use client";

import { useState } from "react";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFantasyNameGenerator } from "@/hooks/useFantasyNameGenerator";

type GenderMode = "any" | "male" | "female";
type SourceMode = { traditional: boolean; fantasy: boolean };
type NameParts = { name: boolean; surname: boolean; patronymic: boolean };
type NameGeneratorOptions = {
  genderMode: GenderMode; setGenderMode: (mode: GenderMode) => void;
  sourceMode: SourceMode; setSourceMode: (mode: SourceMode) => void;
  nameParts: NameParts; setNameParts: (parts: NameParts) => void;
};

export function useCharacterNameGenerator() {
  const [genderMode, setGenderMode] = useState<GenderMode>("any");
  const [sourceMode, setSourceMode] = useState<SourceMode>({ traditional: true, fantasy: true });
  const [nameParts, setNameParts] = useState<NameParts>({ name: true, surname: true, patronymic: false });
  const { currentName, generateName } = useFantasyNameGenerator({ gender: genderMode, sources: sourceMode, parts: nameParts });
  const options: NameGeneratorOptions = { genderMode, setGenderMode, sourceMode, setSourceMode, nameParts, setNameParts };
  return { currentName, generateName, options };
}

export function NameSuggestionButtons({ currentName, onGenerate, onUse }: { currentName: string; onGenerate: () => void; onUse: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/7"
        onClick={onGenerate}
        title="Згенерувати інше імʼя"
        aria-label="Згенерувати інше імʼя"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="link"
        className="text-slate-200 underline"
        onClick={onUse}
        disabled={!currentName}
        title="Використати запропоноване імʼя"
      >
        Використати
      </Button>
    </div>
  );
}

export function NameSuggestionHint({ currentName }: { currentName: string }) {
  return currentName ? <p className="text-xs text-slate-500">Підказка: <span className="text-slate-300">{currentName}</span></p> : null;
}

const GENDER_OPTIONS = [
  { value: "any", label: "Будь-яка" },
  { value: "male", label: "Чоловіча" },
  { value: "female", label: "Жіноча" },
] as const;

export function NameGeneratorOptionsPanel({ genderMode, setGenderMode, sourceMode, setSourceMode, nameParts, setNameParts }: NameGeneratorOptions) {
  const toggleSource = (key: keyof SourceMode, checked: boolean) => {
    const next = { ...sourceMode, [key]: checked };
    if (!next.traditional && !next.fantasy) next[key === "traditional" ? "fantasy" : "traditional"] = true;
    setSourceMode(next);
  };
  const togglePart = (key: keyof NameParts, checked: boolean) => {
    const next = { ...nameParts, [key]: checked };
    if (!next.name && !next.surname && !next.patronymic) next.name = true;
    setNameParts(next);
  };
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Стать</div>
        <div className="mt-3 space-y-2">
          {GENDER_OPTIONS.map((opt) => {
            const active = genderMode === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setGenderMode(opt.value)} className="flex items-center gap-2 text-left" aria-pressed={active}>
                <span className={clsx("grid h-4 w-4 place-content-center rounded-full border", active ? "border-cyan-400" : "border-white/30")}>
                  <span className={clsx("h-2 w-2 rounded-full", active ? "bg-cyan-400" : "bg-transparent")} />
                </span>
                <span className="text-sm text-slate-200">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Джерела</div>
        <div className="mt-3 space-y-2">
          <OptionCheckbox id="names-traditional" label="Традиційні" checked={sourceMode.traditional} onChange={(checked) => toggleSource("traditional", checked)} />
          <OptionCheckbox id="names-fantasy" label="Фентезі" checked={sourceMode.fantasy} onChange={(checked) => toggleSource("fantasy", checked)} />
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Складові</div>
        <div className="mt-3 space-y-2">
          <OptionCheckbox id="parts-name" label="Ім'я" checked={nameParts.name} onChange={(checked) => togglePart("name", checked)} />
          <OptionCheckbox id="parts-surname" label="Прізвище" checked={nameParts.surname} onChange={(checked) => togglePart("surname", checked)} />
          <OptionCheckbox id="parts-patronymic" label="По батькові" checked={nameParts.patronymic} onChange={(checked) => togglePart("patronymic", checked)} />
        </div>
      </div>
    </div>
  );
}

function OptionCheckbox({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
      <Label htmlFor={id} className="text-sm text-slate-200">{label}</Label>
    </div>
  );
}

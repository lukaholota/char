"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { listCreatureSpellChoices } from "@/lib/actions/homebrew-actions";
import { formatModifier } from "@/lib/logic/utils";
import type { HomebrewCreatureFormValues } from "@/lib/logic/homebrew-form-values";
import type { HomebrewEdition, HomebrewFieldErrors } from "@/lib/logic/homebrew-input";
import { findChallengeProficiencyBonus, isChallengeRating } from "@/rules/challenge-rating";
import { describeCreatureSpellLevel, findDefaultSpellStats, type CreatureSpellChoice, type CreatureSpellOption } from "@/rules/creature-spellcasting";
import { TextField } from "./HomebrewFormFields";

const MAX_VISIBLE_RESULTS = 30;
const SEARCH_INPUT_ID = "homebrew-creature-spell-search";

type TextKey = "spellAttackBonus" | "spellSaveDc" | "spellCasterLevel";

export function CreatureSpellcastingFields({ values, errors, onTextChange, onSpellsChange }: {
  values: HomebrewCreatureFormValues;
  errors: HomebrewFieldErrors;
  onTextChange: (key: TextKey) => (value: string) => void;
  onSpellsChange: (spells: CreatureSpellChoice[]) => void;
}) {
  const defaults = findFormDefaults(values);
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Заклинання</h3>
        <p className="text-xs text-slate-500">Необовʼязково. Порожні числа порахуємо з характеристик і показника небезпеки.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField name="spellAttackBonus" label="Бонус атаки заклинанням" value={values.spellAttackBonus} onChange={onTextChange("spellAttackBonus")} maxLength={3} placeholder={`Авто: ${formatModifier(defaults.attackBonus)}`} error={errors.spellAttackBonus} />
        <TextField name="spellSaveDc" label="СК ряткидка" inputMode="numeric" value={values.spellSaveDc} onChange={onTextChange("spellSaveDc")} maxLength={2} placeholder={`Авто: ${defaults.saveDc}`} error={errors.spellSaveDc} />
        <TextField name="spellCasterLevel" label="Рівень заклинача" inputMode="numeric" value={values.spellCasterLevel} onChange={onTextChange("spellCasterLevel")} maxLength={2} placeholder="Авто: 1" hint="Від нього залежить шкода замовлянь" error={errors.spellCasterLevel} />
      </div>
      <CreatureSpellSearch edition={values.ruleset} selected={values.spells} onChange={onSpellsChange} />
      {errors.spells ? <p className="text-xs text-rose-300">{errors.spells}</p> : null}
      <SelectedCreatureSpells spells={values.spells} onChange={onSpellsChange} />
    </section>
  );
}

function CreatureSpellSearch({ edition, selected, onChange }: { edition: HomebrewEdition; selected: readonly CreatureSpellChoice[]; onChange: (spells: CreatureSpellChoice[]) => void }) {
  const [query, setQuery] = useState("");
  const { options, status, loadOptions } = useCreatureSpellOptions(edition);
  const matches = findMatchingSpells(options, query, selected);
  const addSpell = (spell: CreatureSpellOption) => {
    onChange([...selected, { spellId: spell.spellId, name: spell.name, level: spell.level }]);
    setQuery("");
  };
  return (
    <div className="space-y-1">
      <label htmlFor={SEARCH_INPUT_ID} className="text-xs font-semibold text-slate-300">Додати заклинання</label>
      <input
        id={SEARCH_INPUT_ID}
        value={query}
        autoComplete="off"
        placeholder="Вогняна куля або Fireball"
        onFocus={loadOptions}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (matches[0]) addSpell(matches[0]);
        }}
        className="h-11 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus-visible:ring-1 focus-visible:ring-white/20"
      />
      <SpellSearchStatus status={status} hasQuery={Boolean(query.trim())} matchCount={matches.length} onRetry={loadOptions} />
      {matches.length ? (
        <ul className="max-h-64 divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
          {matches.slice(0, MAX_VISIBLE_RESULTS).map((spell) => (
            <li key={spell.spellId}>
              <button type="button" onClick={() => addSpell(spell)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-1 text-left text-sm text-slate-100 hover:bg-white/5">
                <span className="min-w-0">{spell.name}</span>
                <span className="shrink-0 text-xs text-slate-400">{describeCreatureSpellLevel(spell.level)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SpellSearchStatus({ status, hasQuery, matchCount, onRetry }: { status: LoadStatus; hasQuery: boolean; matchCount: number; onRetry: () => void }) {
  if (status === "error") {
    return (
      <p role="alert" className="text-xs text-rose-300">
        Не вдалося завантажити заклинання.{" "}
        <button type="button" onClick={onRetry} className="min-h-11 underline underline-offset-2">Спробувати ще</button>
      </p>
    );
  }
  const message = findSearchMessage(status, hasQuery, matchCount);
  return message ? <p aria-live="polite" className="text-xs text-slate-500">{message}</p> : null;
}

function findSearchMessage(status: LoadStatus, hasQuery: boolean, matchCount: number): string | null {
  if (status === "loading") return "Завантажуємо заклинання…";
  if (!hasQuery || status === "idle") return null;
  if (matchCount === 0) return "Нічого не знайдено. Спробуйте іншу назву.";
  return matchCount > MAX_VISIBLE_RESULTS ? `Показано перші ${MAX_VISIBLE_RESULTS}. Уточніть назву.` : null;
}

function SelectedCreatureSpells({ spells, onChange }: { spells: readonly CreatureSpellChoice[]; onChange: (spells: CreatureSpellChoice[]) => void }) {
  if (!spells.length) return null;
  const sorted = [...spells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "uk"));
  return (
    <ul aria-label="Обрані заклинання" className="divide-y divide-white/5 rounded-lg border border-white/10">
      {sorted.map((spell) => (
        <li key={spell.spellId} className="flex items-center justify-between gap-2 pl-3 text-sm text-slate-100">
          <span className="min-w-0 py-1">
            {spell.name} <span className="text-xs text-slate-400">{describeCreatureSpellLevel(spell.level)}</span>
          </span>
          <button type="button" aria-label={`Прибрати: ${spell.name}`} onClick={() => onChange(spells.filter((item) => item.spellId !== spell.spellId))} className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 hover:text-slate-100">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

type LoadStatus = "idle" | "loading" | "ready" | "error";

function useCreatureSpellOptions(edition: HomebrewEdition) {
  const [loaded, setLoaded] = useState<{ edition: HomebrewEdition; options: CreatureSpellOption[] } | null>(null);
  const [requestStatus, setRequestStatus] = useState<LoadStatus>("idle");
  const isCurrent = loaded?.edition === edition;
  const loadOptions = () => {
    if (isCurrent || requestStatus === "loading") return;
    setRequestStatus("loading");
    listCreatureSpellChoices(edition).then(
      (options) => {
        setLoaded({ edition, options });
        setRequestStatus("ready");
      },
      () => setRequestStatus("error"),
    );
  };
  return { options: isCurrent ? loaded.options : [], status: isCurrent ? "ready" as const : requestStatus === "ready" ? "idle" as const : requestStatus, loadOptions };
}

function findMatchingSpells(options: readonly CreatureSpellOption[], query: string, selected: readonly CreatureSpellChoice[]): CreatureSpellOption[] {
  const normalized = query.trim().toLocaleLowerCase("uk");
  if (!normalized) return [];
  const selectedIds = new Set(selected.map((spell) => spell.spellId));
  return options.filter((spell) => !selectedIds.has(spell.spellId) && spell.searchName.includes(normalized));
}

function findFormDefaults(values: HomebrewCreatureFormValues) {
  const proficiencyBonus = isChallengeRating(values.challenge) ? findChallengeProficiencyBonus(values.challenge) : 2;
  return findDefaultSpellStats([values.intelligence, values.wisdom, values.charisma].map((score) => Number.parseInt(score, 10) || 10), proficiencyBonus);
}

import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { ReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import { findPreparedSpellsWithinLimit } from "@/lib/optimization/ready-preset-validation";
import { listOfferedStepChanges } from "../preset-step-changes";
import { selectTargetLevel, startPresetSession, type PresetPage, type PresetSession } from "./ui-flow";

export type CustomizedSession = { session: PresetSession; trace: string };

export function pickCustomizedLevel(slug: string, trial: number, levels: readonly number[]): number {
  return pickOne(seedRandom(hashText(slug) + trial), levels);
}

/// Same seed, same player: the level comes first from the seed, then one to six changes on the steps.
export function startCustomizedSession(page: PresetPage, trial: number, levels: readonly number[]): CustomizedSession {
  const random = seedRandom(hashText(page.slug) + trial);
  const targetLevel = pickOne(random, levels);
  const labels: string[] = [];
  const changed = fixDownstreamSteps(applyRandomChanges(page.draft, page.options, random, labels), page.options, targetLevel);
  const started = startPresetSession(page, "Фазер");
  const session = selectTargetLevel({ ...started, form: { ...changed, name: "Фазер", readyPresetRequestId: started.form.readyPresetRequestId }, path: "customize" }, targetLevel);
  return { session, trace: `спроба ${trial}, рівень ${targetLevel}: ${labels.join(" → ") || "без змін"}` };
}

export function seedRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashText(text: string): number {
  return [...text].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261);
}

export function pickOne<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

export function applyRandomChanges(draft: PersFormData, options: ReadyPresetOptions, random: () => number, labels: string[]): PersFormData {
  let current = draft;
  const count = 1 + Math.floor(random() * 6);
  for (let index = 0; index < count; index++) {
    const offered = Object.values(listOfferedStepChanges(current, options)).filter((changes) => changes.length);
    if (!offered.length) break;
    const change = pickOne(random, pickOne(random, offered));
    labels.push(change.label);
    current = change.draft as PersFormData;
  }
  return current;
}

export function fixDownstreamSteps(draft: PersFormData, options: ReadyPresetOptions, targetLevel: number): PersFormData {
  const expertises = draft.expertiseSchema?.expertises ?? [];
  const owned = draft.skills.filter((skill) => !expertises.includes(skill as never));
  const keptExpertise = expertises.filter((skill) => draft.skills.includes(skill));
  const fixed = { ...draft, expertiseSchema: draft.expertiseSchema && { expertises: [...keptExpertise, ...owned.slice(0, expertises.length - keptExpertise.length)] as never } };
  return { ...fixed, initialPreparedSpellIds: findPreparedSpellsWithinLimit(fixed, options, targetLevel) };
}

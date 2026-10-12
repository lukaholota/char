import { z } from "zod";
import type { AdvancementChoice, AdvancementChoices } from "./ready-preset-advancements";
import type { ClassOptionChoices } from "./ready-preset-class-options";
import type { OpenPickChoices, ReadyPresetLevels } from "./ready-preset-levels";
import { isSelectableTargetLevel } from "./ready-preset-levels";
import { buildRequestId } from "./ready-preset-request-id";

export type AssemblyDraft = {
  targetLevel: number;
  requestIds: Record<number, string>;
  choices: OpenPickChoices;
  advancements: AdvancementChoices;
  classOptionChoices: ClassOptionChoices;
  preparedSpellKeys: string[] | null;
};

const advancementChoiceSchema: z.ZodType<AdvancementChoice> = z.union([
  z.object({ kind: z.literal("asi"), abilities: z.tuple([z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]), z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"])]) }),
  z.object({ kind: z.literal("feat"), featKey: z.string().min(1), optionNameEng: z.string().min(1).nullable() }),
]);

const assemblyDraftSchema = z.object({
  targetLevel: z.number().int().min(1).max(20),
  requestIds: z.record(z.string(), z.string().uuid()),
  choices: z.record(z.string(), z.array(z.string())),
  advancements: z.record(z.string(), advancementChoiceSchema).default({}),
  classOptionChoices: z.record(z.string(), z.array(z.string())).default({}),
  preparedSpellKeys: z.array(z.string()).nullable(),
});

export const EMPTY_ASSEMBLY_DRAFT: AssemblyDraft = { targetLevel: 1, requestIds: {}, choices: {}, advancements: {}, classOptionChoices: {}, preparedSpellKeys: null };

function findAssemblyDraftKey(buildId: string): string {
  return `dnd-preset-2014-${buildId}-levels`;
}

export function readAssemblyDraft(buildId: string, levels: ReadyPresetLevels): AssemblyDraft {
  const saved = parseSavedDraft(readStorageItem(findAssemblyDraftKey(buildId)));
  if (!saved) return EMPTY_ASSEMBLY_DRAFT;
  return ensureRequestId(isSelectableTargetLevel(levels, saved.targetLevel) ? saved : { ...saved, targetLevel: 1 });
}

// У приватному вікні чи з вимкненим сховищем localStorage кидає: чернетка тоді живе лише на сторінці.
export function writeAssemblyDraft(buildId: string, draft: AssemblyDraft): void {
  try {
    localStorage.setItem(findAssemblyDraftKey(buildId), JSON.stringify(draft));
  } catch {
    return;
  }
}

export function saveAssemblyTargetLevel(buildId: string, targetLevel: number): void {
  const saved = parseSavedDraft(readStorageItem(findAssemblyDraftKey(buildId)));
  if (!saved && targetLevel === 1) return;
  writeAssemblyDraft(buildId, ensureRequestId({ ...(saved ?? EMPTY_ASSEMBLY_DRAFT), targetLevel }));
}

export function removeAssemblyDraft(buildId: string): void {
  try {
    localStorage.removeItem(findAssemblyDraftKey(buildId));
  } catch {
    return;
  }
}

export function ensureRequestId(draft: AssemblyDraft): AssemblyDraft {
  if (draft.targetLevel === 1 || draft.requestIds[draft.targetLevel]) return draft;
  return { ...draft, requestIds: { ...draft.requestIds, [draft.targetLevel]: buildRequestId() } };
}

function readStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseSavedDraft(raw: string | null): AssemblyDraft | null {
  if (!raw) return null;
  try {
    const parsed = assemblyDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

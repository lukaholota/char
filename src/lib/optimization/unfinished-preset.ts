import { z } from "zod";

const UNFINISHED_PRESET_KEY = "dnd-preset-2014-unfinished";

const unfinishedPresetSchema = z.object({ buildId: z.string().min(1), title: z.string().min(1), href: z.string().startsWith("/") });

export type UnfinishedPreset = z.infer<typeof unfinishedPresetSchema>;

export function rememberUnfinishedPreset(preset: UnfinishedPreset): void {
  try {
    localStorage.setItem(UNFINISHED_PRESET_KEY, JSON.stringify(preset));
  } catch {
    // Without storage the preset draft itself is not kept either.
  }
}

export function readUnfinishedPreset(): UnfinishedPreset | null {
  try {
    const parsed = unfinishedPresetSchema.safeParse(JSON.parse(localStorage.getItem(UNFINISHED_PRESET_KEY) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function forgetUnfinishedPreset(buildId?: string): void {
  if (buildId && readUnfinishedPreset()?.buildId !== buildId) return;
  try {
    localStorage.removeItem(UNFINISHED_PRESET_KEY);
  } catch {
    // Nothing was stored.
  }
}

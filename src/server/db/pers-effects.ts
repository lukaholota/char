'use server';

import { findEditDenial, revalidatePers } from "@/server/db/pers-edit-access";
import {
  changeConcentration,
  changeExhaustion,
  changeSpellBuff,
  type PersEffectResult,
} from "@/server/db/pers-effect-change";

export async function setConcentration(input: { persId: number; spellId: number | null }): Promise<PersEffectResult> {
  return runAsEditor(input.persId, () => changeConcentration(input.persId, input.spellId));
}

export async function setSpellBuff(input: {
  persId: number;
  effectKey: string;
  isActive: boolean;
  spellId: number | null;
  endsWithConcentration: boolean;
}): Promise<PersEffectResult> {
  return runAsEditor(input.persId, () => changeSpellBuff(input.persId, input));
}

export async function setExhaustion(input: { persId: number; level: number }): Promise<PersEffectResult> {
  return runAsEditor(input.persId, () => changeExhaustion(input.persId, input.level));
}

async function runAsEditor(persId: number, change: () => Promise<PersEffectResult>): Promise<PersEffectResult> {
  const denied = await findEditDenial(persId);
  if (denied) return { success: false, error: denied };

  const result = await change();
  if (result.success) revalidatePers(persId);
  return result;
}

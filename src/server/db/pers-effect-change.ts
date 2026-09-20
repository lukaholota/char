import { prisma } from "@/lib/prisma";
import { CONCENTRATION_EFFECT_KEY } from "@/rules/concentration";
import { clampExhaustionLevel } from "@/rules/exhaustion";
import { SPELL_BUFF_KEYS, doesSpellBuffSurviveShortRest, isSpellBuffKey } from "@/rules/spell-buffs";

export type PersEffectResult = { success: true } | { success: false; error: string };

/// Спільні кроки для дій листа й відтворення офлайн-черги; права перевіряє той, хто кличе.
/// Кожен крок ідемпотентний: повтор тієї самої операції з черги дає той самий стан.

export async function changeConcentration(persId: number, spellId: number | null): Promise<PersEffectResult> {
  await prisma.$transaction(async (tx) => {
    await tx.persEffect.deleteMany({ where: { persId, OR: [{ effectKey: CONCENTRATION_EFFECT_KEY }, { endsWithConcentration: true }] } });
    if (spellId !== null) await tx.persEffect.create({ data: { persId, effectKey: CONCENTRATION_EFFECT_KEY, spellId } });
  });
  return { success: true };
}

export async function changeSpellBuff(
  persId: number,
  change: { effectKey: string; isActive: boolean; spellId: number | null; endsWithConcentration: boolean },
): Promise<PersEffectResult> {
  if (!isSpellBuffKey(change.effectKey)) return { success: false, error: "Невідомий ефект" };

  if (!change.isActive) {
    await prisma.persEffect.deleteMany({ where: { persId, effectKey: change.effectKey } });
    return { success: true };
  }

  const data = { spellId: change.spellId, endsWithConcentration: change.endsWithConcentration };
  await prisma.persEffect.upsert({
    where: { persId_effectKey: { persId, effectKey: change.effectKey } },
    create: { persId, effectKey: change.effectKey, ...data },
    update: data,
  });
  return { success: true };
}

export async function changeExhaustion(persId: number, level: number): Promise<PersEffectResult> {
  await prisma.pers.update({ where: { persId }, data: { exhaustionLevel: clampExhaustionLevel(level) } });
  return { success: true };
}

/// Дзеркало `endEffectsAfterRest` листа: короткий відпочинок лишає лише Обладунок мага, довгий
/// знімає все й один рівень виснаження.
export async function endPersEffectsAfterRest(persId: number, rest: "SHORT" | "LONG"): Promise<void> {
  if (rest === "SHORT") {
    const surviving = SPELL_BUFF_KEYS.filter(doesSpellBuffSurviveShortRest);
    await prisma.persEffect.deleteMany({ where: { persId, effectKey: { notIn: surviving } } });
    return;
  }

  await prisma.persEffect.deleteMany({ where: { persId } });
  await prisma.pers.updateMany({ where: { persId, exhaustionLevel: { gt: 0 } }, data: { exhaustionLevel: { decrement: 1 } } });
}

import { prisma } from "@/lib/prisma";
import {
  canActivateFeatureState,
  doesFeatureStateEndConcentration,
  isToggleableFeature,
  listStatesEndingWith,
} from "@/rules/feature-states";
import { changeConcentration } from "@/server/db/pers-effect-change";
import { changeFeatureUses } from "@/server/db/feature-use-change";

export type FeatureStateResult =
  | { success: true; isActive: boolean; usesRemaining: number | null }
  | { success: false; error: string };

/// Спільний крок для дії з листа й для відтворення офлайн-черги, як `changeFeatureUses`. Увімкнення
/// списує одне використання; повторне увімкнення вже активної риси нічого не списує, тож черга може
/// приїхати двічі.
export async function changeFeatureState(
  { persId, featureId }: { persId: number; featureId: number },
  isActive: boolean,
): Promise<FeatureStateResult> {
  const feature = await prisma.feature.findUnique({ where: { featureId }, select: { engName: true } });
  if (!feature || !isToggleableFeature(feature.engName)) return { success: false, error: "Ця риса не має стану" };

  const row = await prisma.persFeature.findUnique({
    where: { persId_featureId: { persId, featureId } },
    select: { isActive: true, usesRemaining: true },
  });
  if (row?.isActive === isActive) return { success: true, isActive, usesRemaining: row.usesRemaining };
  if (isActive && !canActivateFeatureState(feature.engName, await listActiveEngNames(persId))) {
    return { success: false, error: "Ця риса діє лише разом з іншим станом — спершу увімкни його" };
  }

  const usesRemaining = isActive ? await spendUseToActivate(persId, featureId) : (row?.usesRemaining ?? null);
  if (typeof usesRemaining === "string") return { success: false, error: usesRemaining };

  await prisma.persFeature.upsert({
    where: { persId_featureId: { persId, featureId } },
    create: { persId, featureId, isActive },
    update: { isActive },
  });
  if (!isActive) await endDependentStates(persId, feature.engName);
  if (isActive && doesFeatureStateEndConcentration(feature.engName)) await changeConcentration(persId, null);
  return { success: true, isActive, usesRemaining };
}

export async function endFeatureStates(persId: number): Promise<void> {
  await prisma.persFeature.updateMany({ where: { persId, isActive: true }, data: { isActive: false } });
}

async function listActiveEngNames(persId: number): Promise<string[]> {
  const rows = await prisma.persFeature.findMany({ where: { persId, isActive: true }, select: { feature: { select: { engName: true } } } });
  return rows.map((row) => row.feature.engName);
}

async function endDependentStates(persId: number, engName: string): Promise<void> {
  const dependents = listStatesEndingWith(engName);
  if (dependents.length === 0) return;
  await prisma.persFeature.updateMany({ where: { persId, isActive: true, feature: { engName: { in: dependents } } }, data: { isActive: false } });
}

async function spendUseToActivate(persId: number, featureId: number): Promise<number | null | string> {
  const spent = await changeFeatureUses({ persId, featureId }, "spend");
  if (!spent.success) return spent.error;
  if (spent.usesRemaining !== null && !spent.changed) return "Використань не лишилося";
  return spent.usesRemaining;
}

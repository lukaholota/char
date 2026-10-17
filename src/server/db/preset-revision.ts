import "server-only";
import { prisma } from "@/lib/prisma";
import { readArchivedRecipe, readSliceRecipes } from "@/lib/optimization/slice-reader";
import { findRevisionMismatchReason } from "@/lib/optimization/recipe-revision-match";

/// Рівні персонажа на старій ревізії, які збігаються з новою, — це вже рівні нової ревізії.
/// Без перенесення гайд, що повів його далі за новим планом, наступного разу сам себе відрізав би.
export async function moveToCurrentPresetRevision(persId: number): Promise<void> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: { level: true, ruleset: true, isSnapshot: true, sourceBuildId: true, sourceBuildRevisionId: true },
  });
  if (!pers?.sourceBuildId || !pers.sourceBuildRevisionId || pers.isSnapshot || pers.ruleset !== "RULES_2014") return;

  const recipe = (await readSliceRecipes("RULES_2014")).find((candidate) => candidate.buildId === pers.sourceBuildId);
  if (!recipe || recipe.revisionId === pers.sourceBuildRevisionId) return;
  if (findRevisionMismatchReason(recipe, await readArchivedRecipe(pers.sourceBuildRevisionId), pers.level)) return;

  await prisma.pers.updateMany({
    where: { persId, level: pers.level, sourceBuildRevisionId: pers.sourceBuildRevisionId },
    data: { sourceBuildRevisionId: recipe.revisionId },
  });
}

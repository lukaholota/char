import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { captureServerPostHogEvent } from "@/lib/monitoring/posthog-server";
import { buildAssemblyCatalog } from "@/lib/optimization/assembly-catalog";
import { buildAssemblyPlan, type AssemblyPlan } from "@/lib/optimization/assembly-plan";
import { buildAssemblyRequestSchema, type BuildAssemblyRequest } from "@/lib/optimization/assembly-request";
import { readSliceRecipes } from "@/lib/optimization/slice-reader";
import type { BuildRecipe } from "@/lib/optimization/types";
import { findWizardPreparedSelectionProblem } from "@/rules/wizard-prepared-spells-2014";
import type { CreateCharacterResult } from "./character-creation";
import { findCreationOperationResult, lockCreationOperation, saveCreationOperation, type CreationOperationKind } from "./creation-operation";
import { createTransactionLevelUpExecutor, executeLevelUpStep } from "./levelup-step";

export type BuildStartPreparation = { error: string; details?: unknown } | { write: (tx: Prisma.TransactionClient) => Promise<number> };
export type BuildStartPreparer = (start: BuildAssemblyRequest["start"]) => Promise<BuildStartPreparation>;

type AuthenticatedUser = { id: number; email: string | null };
type PreparedAssembly = { plan: AssemblyPlan; startWrite: (tx: Prisma.TransactionClient) => Promise<number> };
type AssemblyOutcome = { created: true; persId: number } | { created: false; result: CreateCharacterResult };

const BUILD_ASSEMBLY_OPERATION: CreationOperationKind = { idPrefix: "build-assembly-create", kind: "build_assembly_create" };
const ASSEMBLY_TRANSACTION_OPTIONS = { timeout: 60_000, maxWait: 10_000 };
const WIZARD_2014 = "WIZARD_2014";
const TRANSACTION_EXPIRED_CODE = "P2028";
const ASSEMBLY_TIMEOUT_MESSAGE = "Створення тривало занадто довго, і сервер його скасував. Нічого не збережено — спробуйте ще раз.";

class AssemblyStepError extends Error {
  constructor(readonly characterLevel: number | null, message: string) {
    super(message);
  }
}

export async function createCharacterFromBuildPlan(user: AuthenticatedUser, rawRequest: unknown, prepareStart: BuildStartPreparer): Promise<CreateCharacterResult> {
  const parsed = buildAssemblyRequestSchema.safeParse(rawRequest);
  if (!parsed.success) return { error: "Validation failed", details: parsed.error.flatten() };
  const request = parsed.data;

  const replay = await findCreationOperationResult(prisma, BUILD_ASSEMBLY_OPERATION, { userId: user.id, requestId: request.requestId });
  if (replay) return replay;

  const prepared = await prepareAssembly(request, prepareStart);
  if ("error" in prepared) return prepared;
  return commitAssembly(user, request, prepared);
}

async function prepareAssembly(request: BuildAssemblyRequest, prepareStart: BuildStartPreparer): Promise<PreparedAssembly | { error: string; details?: unknown }> {
  const recipe = await findExecutableRecipe(request);
  if ("error" in recipe) return recipe;

  const plan = await buildPlanForRequest(recipe.value, request);
  if ("error" in plan) return plan;

  const start = await prepareStart(request.start);
  if ("error" in start) return start;
  return { plan: plan.value, startWrite: start.write };
}

async function findExecutableRecipe(request: BuildAssemblyRequest): Promise<{ value: BuildRecipe } | { error: string }> {
  const recipes = await readSliceRecipes("RULES_2014");
  const recipe = recipes.find((entry) => entry.buildId === request.buildId && entry.revisionId === request.revisionId);
  if (!recipe) return { error: "Білд або його ревізію не знайдено для правил 2014" };
  if (request.start.readyPresetRequestId) return { error: "Складання білда має власний ключ повтору" };
  if ((request.start.ruleset ?? recipe.ruleset) !== recipe.ruleset) return { error: "Редакція стартового персонажа не збігається з білдом" };
  return { value: recipe };
}

async function buildPlanForRequest(recipe: BuildRecipe, request: BuildAssemblyRequest): Promise<{ value: AssemblyPlan } | { error: string; details: unknown }> {
  const spells = await prisma.spell.findMany({ where: { ruleset: recipe.ruleset }, select: { spellId: true, engName: true } });
  const catalog = buildAssemblyCatalog(findCharacterCreatorOptions(recipe.ruleset), spells);
  if (catalog.classes.find((entry) => entry.id === request.start.classId)?.key !== recipe.startingClassKey) {
    return { error: "Стартовий клас не збігається з білдом", details: [] };
  }

  const result = buildAssemblyPlan({ recipe, targetLevel: request.targetLevel, catalog, openSelections: request.openSelections, openAdvancements: request.openAdvancements, openClassOptions: request.openClassOptions, preparedSpellKeys: request.preparedSpellKeys });
  if (!result.plan) return { error: `План білда не виконується: ${result.issues.map((issue) => issue.message).join("; ")}`, details: result.issues };
  return { value: result.plan };
}

async function commitAssembly(user: AuthenticatedUser, request: BuildAssemblyRequest, prepared: PreparedAssembly): Promise<CreateCharacterResult> {
  try {
    const outcome = await prisma.$transaction((tx) => runAssemblyInTransaction(tx, user, request, prepared), ASSEMBLY_TRANSACTION_OPTIONS);
    if (!outcome.created) return outcome.result;

    revalidatePath("/char/create");
    revalidatePath("/char/home");
    captureServerPostHogEvent("character_created", { pers_id: outcome.persId, edition: "2014", creation_type: "build_assembly", build_id: request.buildId, target_level: request.targetLevel }, user);
    return { success: true, persId: outcome.persId };
  } catch (error) {
    if (error instanceof AssemblyStepError) return { error: error.message, details: { characterLevel: error.characterLevel } };
    console.error("Error assembling character from build:", error);
    if (isTransactionExpired(error)) return { error: ASSEMBLY_TIMEOUT_MESSAGE };
    return { error: "Database error" };
  }
}

function isTransactionExpired(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === TRANSACTION_EXPIRED_CODE;
}

async function runAssemblyInTransaction(tx: Prisma.TransactionClient, user: AuthenticatedUser, request: BuildAssemblyRequest, prepared: PreparedAssembly): Promise<AssemblyOutcome> {
  await lockCreationOperation(tx, BUILD_ASSEMBLY_OPERATION, request.requestId);
  const previous = await findCreationOperationResult(tx, BUILD_ASSEMBLY_OPERATION, { userId: user.id, requestId: request.requestId });
  if (previous) return { created: false, result: previous };

  const persId = await prepared.startWrite(tx);
  await applyProgressionSteps(tx, persId, prepared.plan);
  if (prepared.plan.preparedSpellIds) await applyWizardPreparedSelection(tx, persId, prepared.plan.preparedSpellIds);
  await saveCreationOperation(tx, BUILD_ASSEMBLY_OPERATION, { userId: user.id, requestId: request.requestId, persId });
  return { created: true, persId };
}

async function applyProgressionSteps(tx: Prisma.TransactionClient, persId: number, plan: AssemblyPlan): Promise<void> {
  const executor = createTransactionLevelUpExecutor(tx);
  for (const step of plan.steps) {
    const outcome = await executeLevelUpStep(executor, persId, step.input);
    if ("error" in outcome) throw new AssemblyStepError(step.characterLevel, `Рівень ${step.characterLevel}: ${outcome.error}`);
  }
}

async function applyWizardPreparedSelection(tx: Prisma.TransactionClient, persId: number, preparedSpellIds: readonly number[]): Promise<void> {
  const pers = await tx.pers.findUniqueOrThrow({
    where: { persId },
    select: {
      ruleset: true, int: true, level: true, class: { select: { name: true } },
      multiclasses: { select: { classLevel: true, class: { select: { name: true } } } },
      persSpells: { where: { origin: "CLASS", sourceName: WIZARD_2014, spell: { level: { gt: 0 } } }, select: { spellId: true } },
    },
  });
  const wizardLevel = findWizardLevel(pers);
  if (pers.ruleset !== "RULES_2014" || wizardLevel === 0) throw new AssemblyStepError(null, "Підготовка з книги доступна лише Чарівнику 2014");

  const problem = findWizardPreparedSelectionProblem({ intelligence: pers.int, wizardLevel, spellbookSpellIds: pers.persSpells.map((row) => row.spellId), preparedIds: preparedSpellIds });
  if (problem) throw new AssemblyStepError(null, problem);

  const leveledWizardSpells = { persId, origin: "CLASS" as const, sourceName: WIZARD_2014, spell: { level: { gt: 0 } } };
  await tx.persSpell.updateMany({ where: leveledWizardSpells, data: { isPrepared: false } });
  await tx.persSpell.updateMany({ where: { ...leveledWizardSpells, spellId: { in: [...preparedSpellIds] } }, data: { isPrepared: true } });
}

function findWizardLevel(pers: { level: number; class: { name: string }; multiclasses: { classLevel: number; class: { name: string } }[] }): number {
  const extraLevels = pers.multiclasses.reduce((sum, row) => sum + row.classLevel, 0);
  if (pers.class.name === WIZARD_2014) return pers.level - extraLevels;
  return pers.multiclasses.find((row) => row.class.name === WIZARD_2014)?.classLevel ?? 0;
}

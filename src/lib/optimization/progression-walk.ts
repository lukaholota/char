import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { getAllSpells } from "@/lib/spellsData";
import { buildSpellSlug } from "@/lib/spell-link";
import type { CreatorContent } from "@/server/db/creator-content-query";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { buildAssemblyCatalog } from "./assembly-catalog";
import { listExecutableSteps } from "./build-executable-levels";
import { checkAbilityIncrease } from "./progression-check-abilities";
import { checkChoicePicks, checkInfusions } from "./progression-check-options";
import { checkOptionReplacements } from "./progression-check-replacements";
import { checkSubclass, createClassProgress, warnAboutMulticlassEntry } from "./progression-check-identity";
import { checkExpertiseAndSkills, checkMulticlassEntrySkill } from "./progression-check-skills";
import { checkSubclassFeatureSpells } from "./progression-check-feature-spells";
import { checkClassSpells } from "./progression-check-spells";
import { settleRaceSpells, buildRaceSpellGrants } from "./progression-race-spells";
import { adoptOwnedSpellsIntoSubclass, rememberSubclassGrantedSpells } from "./progression-granted-spells";
import { buildPresetAbilityScores, buildPresetAbilitySources } from "./ready-preset-abilities";
import { findSchoolKey } from "./ready-preset-spells";
import type { ReadyPreset } from "./ready-preset";
import type { OpenSpellKeys, ProgressionWalk, SpellPoolEntry, StepContext, WalkEnvironment, WalkState } from "./progression-walk-types";
import type { BuildProgressionStep, BuildRecipe } from "./types";

export type ProgressionWalkInput = { recipe: BuildRecipe; preset: ReadyPreset; draft: Partial<PersFormData>; content: CreatorContent };

let spellPoolCache: SpellPoolEntry[] | null = null;

export function walkProgression(env: WalkEnvironment, draft: Partial<PersFormData>): ProgressionWalk {
  const state = buildStartState(env, draft);
  settleRaceSpells(state, 1);
  const walk: ProgressionWalk = { errors: [], warnings: [], openSelections: [] };
  for (const step of listExecutableSteps(env.recipe)) walkStep(env, state, step, walk);
  return walk;
}

function walkStep(env: WalkEnvironment, state: WalkState, step: BuildProgressionStep, walk: ProgressionWalk): void {
  const prefix = `рівень ${step.characterLevel} (${translateValue(step.classKey)} ${step.classLevel})`;
  const ctx: StepContext = {
    step, env, state, progress: state.classes.get(step.classKey) ?? createClassProgress(), isClassEntry: !state.classes.has(step.classKey),
    fail: (message) => walk.errors.push(`${prefix}: ${message}`),
    warn: (message) => walk.warnings.push(`${prefix}: ${message}`),
  };
  if (ctx.isClassEntry) warnAboutMulticlassEntry(ctx);
  state.classes.set(step.classKey, ctx.progress);
  ctx.progress.classLevel = step.classLevel;
  checkSubclass(ctx);
  rememberSubclassGrantedSpells(ctx);
  checkOptionReplacements(ctx);
  checkChoicePicks(ctx);
  checkInfusions(ctx);
  checkAbilityIncrease(ctx);
  checkMulticlassEntrySkill(ctx);
  checkExpertiseAndSkills(ctx);
  const open = checkClassSpells(ctx);
  adoptOwnedSpellsIntoSubclass(ctx);
  checkSubclassFeatureSpells(ctx);
  settleRaceSpells(state, step.characterLevel);
  if (open) walk.openSelections.push(open);
}

export function buildWalkEnvironment({ recipe, preset, content }: Pick<ProgressionWalkInput, "recipe" | "preset" | "content">): WalkEnvironment {
  const spellPool = listSpellPool();
  const catalog = buildAssemblyCatalog(content, spellPool);
  return { recipe, preset, content, catalog, spellPool };
}

export function listSpellPool(): SpellPoolEntry[] {
  spellPoolCache ??= getAllSpells("RULES_2014")
    .map((spell): SpellPoolEntry => ({
      spellId: spell.spellId, name: spell.name, engName: spell.engName, level: spell.level, school: findSchoolKey(spell.school),
      ruleset: "RULES_2014", spellLists: spell.spellClasses.map((entry) => entry.className), isRitual: spell.hasRitual === "так", key: buildSpellSlug(spell.engName),
    }))
    .sort((left, right) => left.level - right.level || left.engName.localeCompare(right.engName));
  return spellPoolCache;
}

function buildStartState(env: WalkEnvironment, draft: Partial<PersFormData>): WalkState {
  const { recipe, preset, content, catalog } = env;
  const characterClass = content.classes.find((entry) => entry.name === recipe.startingClassKey);
  const startSubclassKey = recipe.progression[0]?.subclassKey ?? (characterClass?.subclassLevel === 1 ? recipe.details?.subclassKey : undefined);
  const spells = preset.spells;
  const idOf = (key: string) => catalog.spellIdsByKey.get(key) ?? [];
  const classLeveledKeys = [...(spells?.knownSpellKeys ?? []), ...(spells?.spellbookKeys ?? [])];
  const everyKey = spells ? [...spells.classCantripKeys, ...classLeveledKeys, ...spells.raceSpellKeys, ...(spells.featSpellKeys ?? []), ...(spells.classOptionSpellKeys ?? []), ...spells.preparedSpellKeys] : [];
  return {
    classes: new Map([[recipe.startingClassKey, {
      classLevel: 1, subclassKey: startSubclassKey ?? null, ownedCantrips: spells?.classCantripKeys.length ?? 0, ownedCantripIds: (spells?.classCantripKeys ?? []).flatMap(idOf),
      ownedLeveledSpells: classLeveledKeys.length, ownedLeveledSpellIds: classLeveledKeys.flatMap(idOf), spellbookSpellIds: (spells?.spellbookKeys ?? []).flatMap(idOf),
    }]]),
    scores: { ...buildPresetAbilityScores(draft, buildPresetAbilitySources(draft, content)) },
    featKeys: content.feats.filter((entry) => entry.featId === draft.featId).map((entry) => entry.name),
    proficientSkills: new Set(draft.skills ?? []),
    expertiseSkills: new Set(preset.expertise),
    takenSpellIds: new Set(everyKey.flatMap(idOf)),
    raceSpellGrants: buildRaceSpellGrants(env, draft),
    chosenOptionIds: new Set([draft.classChoiceSelections, draft.subclassChoiceSelections, draft.featChoiceSelections].flatMap((selections) => Object.values(selections ?? {}).flat())),
    infusionNames: new Set(),
  };
}

export function listOpenSelectionsUpTo(openSelections: readonly OpenSpellKeys[], targetLevel: number): OpenSpellKeys[] {
  return openSelections.filter((entry) => entry.characterLevel <= targetLevel);
}

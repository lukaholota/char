import { Ability } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import { collectFeatureStateParts } from "@/rules/feature-states";
import { collectSpellBuffParts } from "@/rules/spell-buffs";
import { EXHAUSTION_SOURCE_KEY, findExhaustionPart } from "@/rules/exhaustion";
import { buildCharacterLevels, findClassLevel } from "@/rules/character-level";
import {
  findD20RollState,
  mergeStateEffects,
  type D20Roll,
  type D20RollState,
  type StateEffects,
  type StatePart,
} from "@/rules/state-effects";
import { calculateFinalModifier, collectActiveFeatures, readStateEffects } from "./bonus-calculator";
import { listActiveFeatureEngNames } from "./feature-state-rows";
import { listActiveBuffKeys } from "./pers-effect-rows";

/// Той самий малюнок, що й Дика форма (`beast-form.ts`): калькулятори лишаються чистими
/// функціями від `pers`, а шар кладе на копію ефекти всього, що зараз діє, — рис, бафів,
/// виснаження.
export type PersWithStates = PersWithRelations & { stateEffects?: StateEffects | null };

const BARBARIAN_CLASS_NAMES = ["BARBARIAN_2014", "BARBARIAN_2024"] as const;

/// Поле перезаписується завжди, навіть порожнім: лист віддає `pers` назад у стан через
/// `onPersUpdate({...pers})`, і ефекти вимкненого стану не мають там пережити наступний рендер.
export function applyActiveStates(pers: PersWithRelations): PersWithRelations {
  const withStates: PersWithStates = { ...pers, stateEffects: findActiveStateEffects(pers) };
  return withStates;
}

export function findActiveStateEffects(pers: PersWithRelations): StateEffects | null {
  return mergeStateEffects(listActiveStateParts(pers).map(({ part }) => part));
}

export function listActiveStateParts(pers: PersWithRelations): StatePart[] {
  const exhaustion = findExhaustionPart(pers.exhaustionLevel ?? 0, pers.ruleset);
  return [
    ...collectFeatureStateParts({
      activeFeatureEngNames: listActiveFeatureEngNames(pers),
      ownedFeatureEngNames: collectActiveFeatures(pers).map((feature) => feature.engName),
      barbarianLevel: findBarbarianLevel(pers),
      intelligenceModifier: calculateFinalModifier(pers, Ability.INT),
    }),
    ...collectSpellBuffParts(listActiveBuffKeys(pers), pers.ruleset),
    ...(exhaustion ? [{ sourceKey: EXHAUSTION_SOURCE_KEY, part: exhaustion }] : []),
    ...(hasWarCaster(pers) ? [WAR_CASTER_PART] : []),
  ];
}

/// Кидок бере стан із того самого `pers`, з якого лист малює число.
export function findRollState(pers: PersWithRelations, roll: D20Roll): D20RollState {
  return findD20RollState(readStateEffects(pers), roll);
}

export const WAR_CASTER_SOURCE_KEY = "WAR_CASTER";

const WAR_CASTER_PART: StatePart = {
  sourceKey: WAR_CASTER_SOURCE_KEY,
  part: { rollModifiers: [{ mode: "ADVANTAGE", scope: "CONCENTRATION_SAVE", sourceKey: WAR_CASTER_SOURCE_KEY }] },
};

function hasWarCaster(pers: PersWithRelations): boolean {
  return (pers.feats ?? []).some((row) => row.feat?.name === WAR_CASTER_SOURCE_KEY);
}

function findBarbarianLevel(pers: PersWithRelations): number {
  const levels = buildCharacterLevels({
    characterLevel: pers.level,
    mainClassName: pers.class?.name ?? "",
    multiclasses: (pers.multiclasses ?? []).map((entry) => ({ className: entry.class.name, classLevel: entry.classLevel })),
  });
  return BARBARIAN_CLASS_NAMES.reduce((total, className) => total + findClassLevel(levels, className), 0);
}

import { Ability } from "@/lib/prisma-enums";
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
import { buildItemStateKey } from "@/rules/magic-item-states";
import { findMagicItemEffects } from "@/rules/magic-item-effects";
import {
  calculateFinalModifier,
  collectActiveFeatures,
  hasEquippedHeavyArmor,
  listSwitchedOnItemStates,
  readStateEffects,
} from "./bonus-calculator";
import { listActiveFeatureEngNames } from "./feature-state-rows";
import { listActiveBuffKeys } from "./pers-effect-rows";
import { listActiveMagicItemLinks } from "./magic-weapon-links";

/// Той самий малюнок, що й Дика форма (`beast-form.ts`): калькулятори лишаються чистими
/// функціями від `pers`, а шар кладе на копію ефекти всього, що зараз діє, — рис, бафів,
/// виснаження.
export type PersWithStates = PersWithRelations & { stateEffects?: StateEffects | null };

const BARBARIAN_CLASS_NAMES = ["BARBARIAN_2014", "BARBARIAN_2024"] as const;
export const BLOOD_HUNTER_CLASS_NAMES = ["BLOOD_HUNTER_2014", "BLOOD_HUNTER_2024"] as const;

/// Поле перезаписується завжди, навіть порожнім: лист віддає `pers` назад у стан через
/// `onPersUpdate({...pers})`, і ефекти вимкненого стану не мають там пережити наступний рендер.
export function applyActiveStates(pers: PersWithRelations): PersWithRelations {
  const withStates: PersWithStates = { ...pers, stateEffects: findActiveStateEffects(pers) };
  return withStates;
}

export function findActiveStateEffects(pers: PersWithRelations): StateEffects | null {
  return mergeStateEffects([...listActiveStateParts(pers), ...listItemAdvantageParts(pers)].map(({ part }) => part));
}

export function listActiveStateParts(pers: PersWithRelations): StatePart[] {
  const exhaustion = findExhaustionPart(pers.exhaustionLevel ?? 0, pers.ruleset);
  return [
    ...collectFeatureStateParts({
      activeFeatureEngNames: listActiveFeatureEngNames(pers),
      ownedFeatureEngNames: collectActiveFeatures(pers).map((feature) => feature.engName),
      barbarianLevel: sumClassLevels(pers, BARBARIAN_CLASS_NAMES),
      intelligenceModifier: calculateFinalModifier(pers, Ability.INT),
      bloodHunterLevel: sumClassLevels(pers, BLOOD_HUNTER_CLASS_NAMES),
      wearsHeavyArmor: hasEquippedHeavyArmor(pers),
    }),
    ...collectSpellBuffParts(listActiveBuffKeys(pers), pers.ruleset),
    ...(exhaustion ? [{ sourceKey: EXHAUSTION_SOURCE_KEY, part: exhaustion }] : []),
    ...(hasWarCaster(pers) ? [WAR_CASTER_PART] : []),
    ...listItemStateParts(pers),
  ];
}

function listItemStateParts(pers: PersWithRelations): StatePart[] {
  return listSwitchedOnItemStates(pers).map(({ magicItemId, state }) => {
    const sourceKey = buildItemStateKey(magicItemId);
    return { sourceKey, part: state.findPart(sourceKey) };
  });
}

/// Пасивна перевага предмета (Щит вартового) — не стан: її не вимикають, вона діє, поки діє предмет.
function listItemAdvantageParts(pers: PersWithRelations): StatePart[] {
  return listActiveMagicItemLinks(pers).flatMap((link) => {
    const sourceKey = buildItemStateKey(link.magicItemId);
    const rollModifiers = findMagicItemEffects(link.magicItem).flatMap((effect) =>
      effect.kind === "ADVANTAGE" ? [{ mode: "ADVANTAGE" as const, scope: effect.scope, sourceKey }] : [],
    );
    return rollModifiers.length > 0 ? [{ sourceKey, part: { rollModifiers } }] : [];
  });
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

export function sumClassLevels(pers: PersWithRelations, classNames: readonly string[]): number {
  const levels = buildCharacterLevels({
    characterLevel: pers.level,
    mainClassName: pers.class?.name ?? "",
    multiclasses: (pers.multiclasses ?? []).map((entry) => ({ className: entry.class.name, classLevel: entry.classLevel })),
  });
  return classNames.reduce((total, className) => total + findClassLevel(levels, className), 0);
}

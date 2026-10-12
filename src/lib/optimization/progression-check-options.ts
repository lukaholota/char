import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { baseChoiceGroupName, getChoicePoolRule } from "@/lib/logic/choicePoolRules";
import { findInfusionPicksAtLevel } from "@/rules/artificer-infusions";
import type { AssemblyChoiceOption } from "./assembly-catalog";
import type { StepContext } from "./progression-walk-types";
import type { LevelDecisions } from "./types";

type OptionRefs = LevelDecisions["classOptions"];
type ScopeCheck = { scope: "class" | "subclass"; field: string; classLevel: number; allowed: readonly AssemblyChoiceOption[]; refs: OptionRefs; className?: string; subclassName?: string };

const KNOWLEDGE_GROUP_PICKS = 2;
const ARTIFICER = "ARTIFICER_2014";

export function checkChoicePicks(ctx: StepContext): void {
  const { step, progress, env } = ctx;
  const characterClass = env.catalog.classes.find((entry) => entry.key === step.classKey);
  if (!characterClass) return;
  const subclass = characterClass.subclasses.find((entry) => entry.key === progress.subclassKey);
  const atLevel = (options: readonly AssemblyChoiceOption[]) => options.filter((option) => option.levelsGranted.includes(step.classLevel));
  checkScope(ctx, { scope: "class", field: "classOptions", classLevel: step.classLevel, allowed: atLevel(characterClass.choiceOptions), refs: step.decisions?.classOptions, className: step.classKey });
  checkScope(ctx, { scope: "subclass", field: "subclassOptions", classLevel: step.classLevel, allowed: atLevel(subclass?.choiceOptions ?? []), refs: step.decisions?.subclassOptions, subclassName: progress.subclassKey ?? undefined });
}

function checkScope(ctx: StepContext, check: ScopeCheck): void {
  const selected = resolveSelected(check);
  if (!selected) return;
  rememberAndReportRepeats(ctx, check, selected);
  const isEnteringClass = ctx.step.classLevel === 1;
  if (isEnteringClass || !check.allowed.length) return;
  if (!selected.length) {
    ctx.fail(`${check.field}: на цьому рівні є вибір опцій (${describeGroups(check.allowed)}), а в плані їх немає`);
    return;
  }
  for (const group of listBaseGroups(check.allowed)) {
    const expected = countExpectedPicks(check, group);
    const picked = selected.filter((option) => baseChoiceGroupName(option.groupName) === group).length;
    if (expected > 0 && picked !== expected) ctx.fail(`${check.field}: у групі «${group}» потрібно обрати ${expected}, а в плані ${picked}`);
  }
}

function resolveSelected({ allowed, refs }: ScopeCheck): AssemblyChoiceOption[] | null {
  const selected: AssemblyChoiceOption[] = [];
  for (const ref of refs ?? []) {
    const matches = allowed.filter((option) => option.nameEng === ref.optionNameEng && (!ref.groupName || option.groupName === ref.groupName));
    if (matches.length !== 1) return null;
    selected.push(matches[0]);
  }
  return selected;
}

function rememberAndReportRepeats(ctx: StepContext, check: ScopeCheck, selected: readonly AssemblyChoiceOption[]): void {
  for (const option of selected) {
    if (ctx.state.chosenOptionIds.has(option.id)) ctx.fail(`${check.field}: «${option.nameEng}» вже обрано раніше`);
    ctx.state.chosenOptionIds.add(option.id);
  }
  const names = selected.map((option) => option.nameEng);
  if (new Set(names).size !== names.length) ctx.fail(`${check.field}: опцію обрано двічі`);
}

function countExpectedPicks(check: ScopeCheck, group: string): number {
  const rule = getChoicePoolRule({ scope: check.scope, groupName: group, className: check.className, subclassName: check.subclassName });
  if (rule) return Number(rule.picksAtLevel(check.classLevel)) || 0;
  return isKnowledgeGroup(group) ? KNOWLEDGE_GROUP_PICKS : 1;
}

function isKnowledgeGroup(groupName: string): boolean {
  const lower = groupName.toLowerCase();
  return lower.includes("blessing of knowledge") || lower.startsWith("благословення знань");
}

function listBaseGroups(options: readonly AssemblyChoiceOption[]): string[] {
  return [...new Set(options.map((option) => baseChoiceGroupName(option.groupName)))];
}

function describeGroups(options: readonly AssemblyChoiceOption[]): string {
  return listBaseGroups(options).map((group) => `«${group}»`).join(", ");
}

export function checkInfusions(ctx: StepContext): void {
  const { step, state, env } = ctx;
  const names = step.decisions?.infusions ?? [];
  const expected = step.classKey === ARTIFICER ? findInfusionPicksAtLevel(step.classLevel) : 0;
  if (names.length !== expected) {
    ctx.fail(`infusions: ${translateValue(step.classKey)} ${step.classLevel}-го рівня обирає ${expected} вливань, а в плані ${names.length}`);
  }
  for (const name of names) {
    const infusion = env.catalog.infusions.find((entry) => entry.engName === name);
    if (!infusion) continue;
    if (infusion.minArtificerLevel > step.classLevel) ctx.fail(`infusions: «${name}» доступне з ${infusion.minArtificerLevel}-го рівня Винахідника`);
    if (state.infusionNames.has(name)) ctx.fail(`infusions: «${name}» вже обрано раніше`);
    state.infusionNames.add(name);
  }
}

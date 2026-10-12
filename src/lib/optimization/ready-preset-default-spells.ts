import {
  listOpenPickCandidates, listOpenPickSlots,
  type AssemblyChoiceContext, type LevelSpell, type OpenPickChoices, type OpenPickSlot,
} from "./ready-preset-levels";

export function isOpenPickChosenByPlayer(rawChoices: OpenPickChoices, slotId: string): boolean {
  return slotId in rawChoices;
}

export function fillDefaultOpenPicks(context: AssemblyChoiceContext): OpenPickChoices {
  const filled: OpenPickChoices = { ...context.choices };
  for (const slot of listOpenPickSlots(context.levels, context.targetLevel)) {
    if (isOpenPickChosenByPlayer(context.choices, slot.id)) continue;
    filled[slot.id] = pickBestSpells({ ...context, choices: filled }, slot);
  }
  return filled;
}

function pickBestSpells(context: AssemblyChoiceContext, slot: OpenPickSlot): string[] {
  const picked: string[] = [];
  for (let position = 0; position < slot.count; position += 1) {
    const candidates = listOpenPickCandidates({ ...context, choices: { ...context.choices, [slot.id]: picked } }, slot, "");
    const best = [...candidates].sort(compareByUsefulness)[0];
    if (!best) break;
    picked.push(best.key);
  }
  return picked;
}

function compareByUsefulness(first: LevelSpell, second: LevelSpell): number {
  return (second.score ?? 0) - (first.score ?? 0) || second.level - first.level;
}

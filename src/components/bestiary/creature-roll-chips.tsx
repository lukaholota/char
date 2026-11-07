"use client";

import { Dice6 } from "lucide-react";
import { D20Icon } from "@/lib/components/icons/D20Icon";
import { buildCreatureActionRollContext, buildCreatureD20RollContext, buildD20Action } from "@/lib/components/dice/roll-contexts";
import { openRoomRoll } from "@/lib/components/game/open-room-roll";
import type { DiceRollContext } from "@/lib/stores/diceUIStore";
import { attributesUkrFull } from "@/lib/refs/translation";
import { findCreatureSaveAction, type CreatureSaveAction } from "@/rules/creature-area-action";
import { findCreatureRolls, splitNamedBonuses, type CreatureRoll } from "@/rules/creature-rolls";

type HastText = { type: "text"; value: string };
type HastElement = { type: "element"; tagName: string; properties: Record<string, unknown>; children: HastNode[] };
type HastNode = HastText | HastElement | { type: "comment" | "doctype" | "raw"; value?: string };

export type CreatureRollChipData = { creatureName: string; actionName: string; rolls: CreatureRoll[]; index: number; save?: CreatureSaveAction };

export const CREATURE_ROLL_TAG = "creature-roll";
const SKIPPED_TAGS = new Set(["a", "abbr", "code", "pre"]);

/// Кубики шукаються в кожному абзаці окремо: кнопка шкоди відкриває панель разом з атакою того самого удару.
export function rehypeCreatureRolls({ creatureName }: { creatureName: string }) {
  return (tree: { children: HastNode[] }) => {
    for (const block of tree.children) if (block.type === "element") addRollChips(block, creatureName);
  };
}

function addRollChips(block: HastElement, creatureName: string) {
  const found: Array<{ chip: HastElement; roll: CreatureRoll }> = [];
  replaceRollText(block, found);
  const actionName = findActionName(block);
  const rolls = found.map(({ roll }) => roll);
  const save = found.length ? findCreatureSaveAction(readText(block)) : null;
  found.forEach(({ chip }, index) => {
    const data: CreatureRollChipData = { creatureName, actionName, rolls, index, ...(save ? { save } : {}) };
    chip.properties.dataRoll = JSON.stringify(data);
  });
}

function replaceRollText(element: HastElement, found: Array<{ chip: HastElement; roll: CreatureRoll }>) {
  element.children = element.children.flatMap((child) => {
    if (child.type === "element") {
      if (!SKIPPED_TAGS.has(child.tagName)) replaceRollText(child, found);
      return [child];
    }
    return child.type === "text" ? splitTextIntoChips(child.value, found) : [child];
  });
}

function splitTextIntoChips(text: string, found: Array<{ chip: HastElement; roll: CreatureRoll }>): HastNode[] {
  const spots = findCreatureRolls(text);
  if (!spots.length) return [{ type: "text", value: text }];
  const nodes: HastNode[] = [];
  let cursor = 0;
  for (const spot of spots) {
    if (spot.start > cursor) nodes.push({ type: "text", value: text.slice(cursor, spot.start) });
    const chip: HastElement = { type: "element", tagName: CREATURE_ROLL_TAG, properties: {}, children: [{ type: "text", value: text.slice(spot.start, spot.end) }] };
    found.push({ chip, roll: spot.roll });
    nodes.push(chip);
    cursor = spot.end;
  }
  if (cursor < text.length) nodes.push({ type: "text", value: text.slice(cursor) });
  return nodes;
}

/// «Вогняний подих (Перезарядка 5–6).» → «Вогняний подих».
function findActionName(block: HastElement): string {
  const heading = findFirstElement(block, (element) => element.tagName === "b" || element.tagName === "strong");
  return heading ? readText(heading).split(" (")[0].replace(/\.\s*$/u, "").trim() : "";
}

function findFirstElement(element: HastElement, isWanted: (element: HastElement) => boolean): HastElement | null {
  for (const child of element.children) {
    if (child.type !== "element") continue;
    if (isWanted(child)) return child;
    const nested = findFirstElement(child, isWanted);
    if (nested) return nested;
  }
  return null;
}

function readText(node: HastNode): string {
  if (node.type === "text") return node.value;
  return node.type === "element" ? node.children.map(readText).join("") : "";
}

export function CreatureRollChip({ data, children }: { data: CreatureRollChipData | null; children: React.ReactNode }) {
  if (!data) return <>{children}</>;
  const roll = data.rolls[data.index];
  return (
    <RollChip
      isD20={roll.kind === "attack"}
      label={`Кинути: ${describeRollAloud(roll)}${data.actionName ? `, ${data.actionName}` : ""}`}
      onRoll={() => buildCreatureActionRollContext(data)}
    >
      {children}
    </RollChip>
  );
}

function RollChip({ isD20, label, onRoll, children }: { isD20: boolean; label: string; onRoll: () => DiceRollContext; children: React.ReactNode }) {
  const Icon = isD20 ? D20Icon : Dice6;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        openRoomRoll(onRoll());
      }}
      className="mx-px inline-flex items-baseline gap-1 whitespace-nowrap rounded-md border border-amber-400/30 bg-amber-500/10 px-1 font-semibold text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-500/20 active:scale-95"
    >
      <Icon className="h-3 w-3 shrink-0 self-center text-amber-300" aria-hidden />
      {children}
    </button>
  );
}

/// «Спр +6, Муд +7» — кожен бонус окрема кнопка; ряткидок підписаний повною назвою характеристики.
export function CreatureBonusChips({ creatureName, text, kind }: { creatureName: string; text: string; kind: "save" | "skill" }) {
  return splitNamedBonuses(text).map((part, index) => (
    <span key={index}>
      {index > 0 ? ", " : null}
      {typeof part === "string" ? part : (
        <RollChip isD20 label={`Кинути: ${part.name} ${formatBonus(part.bonus)}`} onRoll={() => buildBonusRollContext(creatureName, part.name, part.bonus, kind)}>
          {part.name} {formatBonus(part.bonus)}
        </RollChip>
      )}
    </span>
  ));
}

function buildBonusRollContext(creatureName: string, name: string, bonus: number, kind: "save" | "skill"): DiceRollContext {
  if (kind === "skill") return buildCreatureD20RollContext(creatureName, name, [buildD20Action("check", "Перевірка", bonus)]);
  return buildCreatureD20RollContext(creatureName, findAbilityFullName(name), [buildD20Action("save", "Ряткидок", bonus)]);
}

export function CreatureInitiativeChip({ creatureName, bonus, children }: { creatureName: string; bonus: number; children: React.ReactNode }) {
  return (
    <RollChip isD20 label={`Кинути ініціативу ${formatBonus(bonus)}`} onRoll={() => buildCreatureD20RollContext(creatureName, undefined, [buildD20Action("initiative", "Ініціатива", bonus)])}>
      {children}
    </RollChip>
  );
}

function findAbilityFullName(shortName: string): string {
  const prefix = shortName.slice(0, 3).toLocaleLowerCase("uk");
  return Object.values(attributesUkrFull).find((full) => full.slice(0, 3).toLocaleLowerCase("uk") === prefix) ?? shortName;
}

function formatBonus(bonus: number): string {
  return bonus < 0 ? `−${-bonus}` : `+${bonus}`;
}

export function readRollChipData(value: unknown): CreatureRollChipData | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as CreatureRollChipData;
  } catch {
    return null;
  }
}

function describeRollAloud(roll: CreatureRoll): string {
  if (roll.kind === "attack") return "атака";
  if (roll.kind === "recharge") return "перезарядка";
  return "шкода";
}

import { pluralizeUk } from "@/lib/ukrainian-plural";
import type { MagicItemCharges } from "./magic-item-charges";

export type ChargeRecovery = { kind: "ALL" } | { kind: "ROLL"; diceCount: number; diceSides: number; bonus: number };
export type ItemChargeRules = { chargesMax: number | null; recovery: ChargeRecovery | null };

const MAX_PATTERN = /(?:[Мм]а(?:є|ють)(?:\s+ще\s+й)?|[Пп]очинає\s+з|[Іі]з\s+(?:його|її))\s+(\d+)\s+заряд/;
const RECOVERY_PATTERN = /[Вв]ідновлю(?:є|ють)\s+([^.<]*?)заряд/;
const DICE_PATTERN = /^(\d+)к(\d+)(?:\s*([+−-])\s*(\d+))?/;

export function findItemChargeRules(description: string | null | undefined): ItemChargeRules {
  const text = description ?? "";
  const max = text.match(MAX_PATTERN);
  return { chargesMax: max ? Number(max[1]) : null, recovery: findChargeRecovery(text) };
}

function findChargeRecovery(text: string): ChargeRecovery | null {
  const phrase = text.match(RECOVERY_PATTERN)?.[1].trim();
  if (!phrase) return null;
  if (/^(?:усі|всі)/.test(phrase)) return { kind: "ALL" };
  const dice = phrase.match(DICE_PATTERN);
  if (dice) {
    const bonus = dice[4] ? Number(dice[4]) * (dice[3] === "+" ? 1 : -1) : 0;
    return { kind: "ROLL", diceCount: Number(dice[1]), diceSides: Number(dice[2]), bonus };
  }
  const flat = phrase.match(/^(\d+)/);
  if (flat) return { kind: "ROLL", diceCount: 0, diceSides: 0, bonus: Number(flat[1]) };
  return phrase.startsWith("витрачен") ? { kind: "ROLL", diceCount: 0, diceSides: 0, bonus: 1 } : null;
}

/// Порожні заряди на звʼязку означають «гравець не задавав» — тоді діє число з опису, повні.
export function fillDefaultCharges(charges: MagicItemCharges, rules: ItemChargeRules): MagicItemCharges {
  if (charges.chargesMax !== null || rules.chargesMax === null) return charges;
  return { chargesMax: rules.chargesMax, chargesCurrent: charges.chargesCurrent ?? rules.chargesMax };
}

export function rollChargeRecovery(charges: MagicItemCharges, recovery: ChargeRecovery, random: () => number = Math.random): MagicItemCharges {
  if (charges.chargesMax === null) return charges;
  const current = charges.chargesCurrent ?? charges.chargesMax;
  const regained = recovery.kind === "ALL" ? charges.chargesMax : rollDice(recovery, random) + recovery.bonus;
  return { chargesMax: charges.chargesMax, chargesCurrent: Math.min(charges.chargesMax, current + Math.max(0, regained)) };
}

function rollDice({ diceCount, diceSides }: { diceCount: number; diceSides: number }, random: () => number): number {
  let total = 0;
  for (let die = 0; die < diceCount; die++) total += 1 + Math.floor(random() * diceSides);
  return total;
}

export function describeChargeRecovery(recovery: ChargeRecovery): string {
  if (recovery.kind === "ALL") return "усі заряди";
  const dice = recovery.diceCount > 0 ? `${recovery.diceCount}к${recovery.diceSides}` : "";
  if (!dice) return `${recovery.bonus} ${pluralizeCharges(recovery.bonus)}`;
  if (recovery.bonus === 0) return `${dice} зарядів`;
  return `${dice} ${recovery.bonus > 0 ? "+" : "−"} ${Math.abs(recovery.bonus)} зарядів`;
}

export function pluralizeCharges(count: number): string {
  return pluralizeUk(count, { one: "заряд", few: "заряди", many: "зарядів" });
}

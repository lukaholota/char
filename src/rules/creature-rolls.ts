export type CreatureRoll =
  | { kind: "attack"; bonus: number }
  | { kind: "damage"; count: number; sides: number; bonus: number }
  | { kind: "recharge"; from: number };

export type CreatureRollSpot = { start: number; end: number; roll: CreatureRoll };

export type NamedBonus = { name: string; bonus: number };

const SIGNED_NUMBER = String.raw`[+−–-]\s?\d+`;
const ATTACK_BONUS = new RegExp(String.raw`(?<=атак[аи][^:<.]{0,30}:\s*)${SIGNED_NUMBER}`, "giu");
const DAMAGE_DICE = /(\d+)[кК](\d+)(?:\s*([+−–-])\s*(\d+)(?![\dкК]))?/gu;
const RECHARGE = /[Пп]ерезарядка\s+(\d)(?:\s*[–-]\s*6)?/gu;

export function findCreatureRolls(text: string): CreatureRollSpot[] {
  const spots = [...findAttackSpots(text), ...findDamageSpots(text), ...findRechargeSpots(text)];
  return dropOverlaps(spots.sort((a, b) => a.start - b.start));
}

function findAttackSpots(text: string): CreatureRollSpot[] {
  return [...text.matchAll(ATTACK_BONUS)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    roll: { kind: "attack", bonus: readSignedNumber(match[0]) ?? 0 },
  }));
}

function findDamageSpots(text: string): CreatureRollSpot[] {
  return [...text.matchAll(DAMAGE_DICE)].map((match) => {
    const bonus = match[4] ? Number(match[4]) * (match[3] === "+" ? 1 : -1) : 0;
    return { start: match.index, end: match.index + match[0].length, roll: { kind: "damage", count: Number(match[1]), sides: Number(match[2]), bonus } };
  });
}

function findRechargeSpots(text: string): CreatureRollSpot[] {
  return [...text.matchAll(RECHARGE)].map((match) => ({ start: match.index, end: match.index + match[0].length, roll: { kind: "recharge", from: Number(match[1]) } }));
}

function dropOverlaps(sorted: CreatureRollSpot[]): CreatureRollSpot[] {
  const kept: CreatureRollSpot[] = [];
  for (const spot of sorted) if (!kept.length || spot.start >= kept[kept.length - 1].end) kept.push(spot);
  return kept;
}

export function readSignedNumber(text: string): number | null {
  const match = text.match(/([+−–-])?\s?(\d+)/u);
  if (!match) return null;
  return Number(match[2]) * (match[1] && match[1] !== "+" ? -1 : 1);
}

/// «15 (+2)» — модифікатор стоїть у дужках після значення.
export function readAbilityModifier(score: string): number | null {
  const inParens = score.match(/\(([^)]*)\)/u)?.[1];
  if (inParens !== undefined) return readSignedNumber(inParens);
  const value = Number(score.match(/\d+/u)?.[0]);
  return Number.isFinite(value) ? Math.floor((value - 10) / 2) : null;
}

/// «Спр +6, Муд +7» або «Уважність +13, Непомітність +6»; частина без числа лишається простим текстом.
export function splitNamedBonuses(text: string): Array<NamedBonus | string> {
  return text.split(/,\s*/u).map((part) => {
    const match = part.trim().match(new RegExp(String.raw`^(\D+?)\s*(${SIGNED_NUMBER})$`, "u"));
    return match ? { name: match[1].trim(), bonus: readSignedNumber(match[2]) ?? 0 } : part;
  });
}

/// Ряткидки пишуть скороченням («Спр»), а клітинка характеристики — великими літерами («СПР»).
export function findSaveBonus(savingThrows: string | null | undefined, abilityShortName: string): number | null {
  const wanted = abilityShortName.slice(0, 3).toLocaleLowerCase("uk");
  const save = splitNamedBonuses(savingThrows ?? "").find((part): part is NamedBonus => typeof part !== "string" && part.name.slice(0, 3).toLocaleLowerCase("uk") === wanted);
  return save?.bonus ?? null;
}

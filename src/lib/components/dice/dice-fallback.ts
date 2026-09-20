export type FallbackDie = { sides: number; value: number; rollId: number };

const NOTATION = /^(\d+)d(\d+)$/i;

export function parseNotation(notation: string): { count: number; sides: number } | null {
  const match = NOTATION.exec(notation.trim());
  if (!match) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  if (count <= 0 || sides <= 0) return null;
  return { count, sides };
}

export function rollFallbackDice(
  notations: string[],
  nextRollId: number,
  pickValue: (sides: number) => number = pickRandomValue,
): FallbackDie[] {
  const dice: FallbackDie[] = [];
  for (const notation of notations) {
    const parsed = parseNotation(notation);
    if (!parsed) continue;
    for (let i = 0; i < parsed.count; i++) {
      dice.push({ sides: parsed.sides, value: pickValue(parsed.sides), rollId: nextRollId + dice.length });
    }
  }
  return dice;
}

function pickRandomValue(sides: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] % sides) + 1;
}

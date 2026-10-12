const MAX_SUGGESTIONS = 8;
const MIN_TOKEN_LENGTH = 4;
const MAX_TYPO_DISTANCE = 2;

export function findSimilarKeysBySeparator(key: string, available: readonly string[], separator: string): string[] {
  const tokens = key.split(separator).filter((token) => token.length >= MIN_TOKEN_LENGTH && !/^\d+$/.test(token));
  const matches = (candidate: string) => tokens.some((token) => candidate.includes(token) || isTypoOfAnyPart(token, candidate.split(separator)));
  return available.filter(matches).slice(0, MAX_SUGGESTIONS);
}

function isTypoOfAnyPart(token: string, parts: readonly string[]): boolean {
  return parts.some((part) => part.length >= MIN_TOKEN_LENGTH && measureEditDistance(token.toLowerCase(), part.toLowerCase()) <= MAX_TYPO_DISTANCE);
}

function measureEditDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_unused, index) => index);
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let column = 1; column <= right.length; column++) {
      const substitution = previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);
      current.push(Math.min(substitution, previous[column] + 1, current[column - 1] + 1));
    }
    previous = current;
  }
  return previous[right.length];
}

export const CHALLENGE_RATINGS = [
  "0", "1/8", "1/4", "1/2", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15",
  "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
] as const;

export type ChallengeRating = (typeof CHALLENGE_RATINGS)[number];

const XP_BY_CHALLENGE: Record<ChallengeRating, number> = {
  "0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300,
  "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000,
  "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000, "21": 33000, "22": 41000, "23": 50000,
  "24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000,
};

export function isChallengeRating(value: string): value is ChallengeRating {
  return (CHALLENGE_RATINGS as readonly string[]).includes(value);
}

export function findChallengeXp(challenge: ChallengeRating): number {
  return XP_BY_CHALLENGE[challenge];
}

export function findChallengeProficiencyBonus(challenge: ChallengeRating): number {
  const numeric = challenge.includes("/") ? 0 : Number(challenge);
  return 2 + Math.floor(Math.max(0, numeric - 1) / 4);
}

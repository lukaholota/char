import { describe, expect, it } from "vitest";
import creatures2014 from "@/lib/generated/creatures.json";
import creatures2024 from "@/lib/generated/creatures2024.json";
import { CHALLENGE_RATINGS, findChallengeProficiencyBonus, findChallengeXp, isChallengeRating } from "./challenge-rating";

describe("показник небезпеки", () => {
  it("досвід і бонус майстерності збігаються з більшістю істот каталогу обох редакцій", () => {
    const creatures = [...creatures2014, ...creatures2024] as Array<{ challenge: string; xp: string; proficiencyBonus: string }>;
    const mismatches = CHALLENGE_RATINGS.flatMap((challenge) => {
      const sample = creatures.filter((creature) => creature.challenge === challenge);
      if (!sample.length) return [];
      const expectedXp = `${findChallengeXp(challenge)} XP`;
      const expectedBonus = `+${findChallengeProficiencyBonus(challenge)}`;
      const matching = sample.filter((creature) => creature.xp.replace(",", "") === expectedXp && creature.proficiencyBonus === expectedBonus);
      return matching.length * 2 > sample.length ? [] : [challenge];
    });
    expect(mismatches).toEqual([]);
  });

  it("приймає лише стандартні значення", () => {
    expect(isChallengeRating("1/4")).toBe(true);
    expect(isChallengeRating("31")).toBe(false);
    expect(findChallengeProficiencyBonus("1/2")).toBe(2);
    expect(findChallengeProficiencyBonus("29")).toBe(9);
  });
});

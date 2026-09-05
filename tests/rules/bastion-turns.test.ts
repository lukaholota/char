import { describe, expect, it } from "vitest";
import { FIRST_BASTION_TURN_NUMBER, findNextTurnNumber } from "@/rules/bastions";

describe("наступний номер ходу — підказка журналу", () => {
  it("порожній журнал починається з першого ходу", () => {
    expect(findNextTurnNumber([])).toBe(FIRST_BASTION_TURN_NUMBER);
  });

  it("береться найбільший записаний номер, а не кількість записів", () => {
    expect(findNextTurnNumber([{ turnNumber: 10 }, { turnNumber: 12 }])).toBe(13);
  });

  it("прогалини в нумерації не заповнюються — журнал веде гравець", () => {
    expect(findNextTurnNumber([{ turnNumber: 1 }, { turnNumber: 7 }])).toBe(8);
  });

  it("порядок записів на підказку не впливає", () => {
    expect(findNextTurnNumber([{ turnNumber: 9 }, { turnNumber: 2 }, { turnNumber: 5 }])).toBe(10);
  });
});

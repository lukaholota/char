import { describe, expect, it } from "vitest";
import { clampBoardShift } from "@/components/games/use-map-viewport";

describe("clampBoardShift", () => {
  it("велику мапу пускає за край на пів екрана, не далі", () => {
    const large = { size: 2000, room: 1000, offset: 0 };
    expect(clampBoardShift(400, large)).toBe(400);
    expect(clampBoardShift(900, large)).toBe(500);
    expect(clampBoardShift(-1400, large)).toBe(-1400);
    expect(clampBoardShift(-2000, large)).toBe(-1500);
  });

  it("мапу, меншу за екран, теж можна відсунути вбік на пів екрана", () => {
    const small = { size: 600, room: 1000, offset: 200 };
    expect(clampBoardShift(0, small)).toBe(0);
    expect(clampBoardShift(900, small)).toBe(700);
    expect(clampBoardShift(-900, small)).toBe(-700);
  });
});

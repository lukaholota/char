import { describe, expect, it } from "vitest";
import { hasTokenNames, type TokenLayout } from "@/components/games/MapTokenSlot";

const gridLayout = (cellPx: number, zoom = 1): TokenLayout => ({ cellPx, zoom, scale: 1, frame: null, isHidden: () => false, isHighlighted: () => false });

describe("імена під токенами на сітці", () => {
  it("на дрібних клітинках підписано велику істоту, а середню — лише коли її видно", () => {
    expect(hasTokenNames(gridLayout(20), 1)).toBe(false);
    expect(hasTokenNames(gridLayout(20), 3)).toBe(true);
    expect(hasTokenNames(gridLayout(29), 1)).toBe(true);
    expect(hasTokenNames(gridLayout(20, 1.5), 1)).toBe(true);
  });
});

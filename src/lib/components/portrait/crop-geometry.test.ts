import { describe, expect, it } from "vitest";
import { buildCenteredCrop, findSourceSquare, moveCrop, zoomCrop } from "./crop-geometry";

describe("кадрування квадрата", () => {
  it("спершу показує середину, вписуючи коротшу сторону", () => {
    const crop = buildCenteredCrop(300, 1200, 800);
    expect(findSourceSquare(crop)).toEqual({ x: 200, y: 0, size: 800 });
  });

  it("зсув не виводить кадр за край картинки", () => {
    const crop = buildCenteredCrop(300, 1200, 800);
    expect(findSourceSquare(moveCrop(crop, 1_000, 50))).toEqual({ x: 0, y: 0, size: 800 });
    expect(findSourceSquare(moveCrop(crop, -1_000, -50))).toEqual({ x: 400, y: 0, size: 800 });
  });

  it("наближення тримає центр кадру на місці й не віддаляє далі за вписану картинку", () => {
    const zoomed = zoomCrop(buildCenteredCrop(300, 1200, 800), 2);
    expect(findSourceSquare(zoomed)).toEqual({ x: 400, y: 200, size: 400 });
    expect(zoomCrop(zoomed, 0.2).zoom).toBe(1);
    expect(zoomCrop(zoomed, 99).zoom).toBe(4);
  });
});

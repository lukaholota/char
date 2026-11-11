import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOKEN_TRANSFORM,
  findDraggedRotation,
  findDraggedScale,
  isDefaultTokenTransform,
  parseTokenTransform,
  readTokenTransform,
  resizeToken,
  turnToken,
} from "@/rules/token-transform";

const centre = { clientX: 100, clientY: 100 };

describe("token transform", () => {
  it("приймає лише цілі кути 0–359 і масштаб 10–1000%", () => {
    expect(parseTokenTransform({ rotation: 90, scale: 150 })).toEqual({ rotation: 90, scale: 150 });
    expect(parseTokenTransform({ rotation: 360, scale: 100 })).toBeNull();
    expect(parseTokenTransform({ rotation: -1, scale: 100 })).toBeNull();
    expect(parseTokenTransform({ rotation: 0, scale: 9 })).toBeNull();
    expect(parseTokenTransform({ rotation: 0, scale: 1001 })).toBeNull();
    expect(parseTokenTransform({ rotation: 0.5, scale: 100 })).toBeNull();
    expect(parseTokenTransform({ rotation: "0", scale: 100 })).toBeNull();
    expect(parseTokenTransform(null)).toBeNull();
  });

  it("зіпсований рядок бази показує токен без змін", () => {
    expect(readTokenTransform({ tokenRotation: 45, tokenScalePercent: 80 })).toEqual({ rotation: 45, scale: 80 });
    expect(readTokenTransform({ tokenRotation: 400, tokenScalePercent: 80 })).toEqual(DEFAULT_TOKEN_TRANSFORM);
  });

  it("кнопки обертають по колу й не виводять масштаб за межі", () => {
    expect(turnToken({ rotation: 350, scale: 100 }, 15)).toEqual({ rotation: 5, scale: 100 });
    expect(turnToken({ rotation: 0, scale: 100 }, -15)).toEqual({ rotation: 345, scale: 100 });
    expect(resizeToken({ rotation: 0, scale: 15 }, 5)).toEqual({ rotation: 0, scale: 10 });
    expect(resizeToken({ rotation: 0, scale: 995 }, 1010)).toEqual({ rotation: 0, scale: 1000 });
    expect(isDefaultTokenTransform(DEFAULT_TOKEN_TRANSFORM)).toBe(true);
    expect(isDefaultTokenTransform({ rotation: 0, scale: 90 })).toBe(false);
  });

  it("поворот ручкою — різниця кутів пальця навколо центру, кроком 5°", () => {
    const top = { clientX: 100, clientY: 40 };
    const right = { clientX: 160, clientY: 100 };
    expect(findDraggedRotation(0, centre, top, right)).toBe(90);
    expect(findDraggedRotation(300, centre, top, right)).toBe(30);
    expect(findDraggedRotation(0, centre, right, top)).toBe(270);
    expect(findDraggedRotation(0, centre, top, { clientX: 102, clientY: 40 })).toBe(0);
  });

  it("масштаб ручкою — у пропорції відстані від центру, у межах і кроком 5%", () => {
    const corner = { clientX: 130, clientY: 130 };
    expect(findDraggedScale(100, centre, corner, { clientX: 160, clientY: 160 })).toBe(200);
    expect(findDraggedScale(100, centre, corner, { clientX: 115, clientY: 115 })).toBe(50);
    expect(findDraggedScale(100, centre, corner, { clientX: 101, clientY: 101 })).toBe(10);
    expect(findDraggedScale(800, centre, corner, { clientX: 400, clientY: 400 })).toBe(1000);
    expect(findDraggedScale(120, centre, centre, corner)).toBe(120);
  });
});

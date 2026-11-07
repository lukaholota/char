import { describe, expect, it } from "vitest";
import { findMapShareInRect, findTokenPositionInRect, parseTokenPosition, shiftTokenPosition } from "@/rules/game-map";

describe("позиція токена на мапі кімнати", () => {
  it("приймає лише скінченні числа й тримає токен у межах мапи", () => {
    expect(parseTokenPosition({ x: 0.25, y: 0.5 })).toEqual({ x: 0.25, y: 0.5 });
    expect(parseTokenPosition({ x: -0.2, y: 1.7 })).toEqual({ x: 0, y: 1 });
    expect(parseTokenPosition({ x: 0.123456, y: 0.9 })).toEqual({ x: 0.1235, y: 0.9 });
    expect(parseTokenPosition({ x: Number.NaN, y: 0.5 })).toBeNull();
    expect(parseTokenPosition({ x: "0.5", y: 0.5 })).toBeNull();
    expect(parseTokenPosition(null)).toBeNull();
    expect(parseTokenPosition("0.5,0.5")).toBeNull();
  });

  it("переводить точку дотику в частки мапи, а точку поза мапою — у «прибрати з мапи»", () => {
    const rect = { left: 100, top: 50, width: 400, height: 200 };
    expect(findTokenPositionInRect({ clientX: 300, clientY: 100 }, rect)).toEqual({ x: 0.5, y: 0.25 });
    expect(findTokenPositionInRect({ clientX: 500, clientY: 50 }, rect)).toEqual({ x: 1, y: 0 });
    expect(findTokenPositionInRect({ clientX: 501, clientY: 100 }, rect)).toBeNull();
    expect(findTokenPositionInRect({ clientX: 300, clientY: 251 }, rect)).toBeNull();
    expect(findTokenPositionInRect({ clientX: 300, clientY: 100 }, { ...rect, width: 0 })).toBeNull();
  });

  it("на повернутій на 90° мапі ширина мапи йде вниз екрана, а висота — справа наліво", () => {
    const turned = { left: 100, top: 50, width: 200, height: 400 };
    expect(findTokenPositionInRect({ clientX: 300, clientY: 50 }, turned, true)).toEqual({ x: 0, y: 0 });
    expect(findTokenPositionInRect({ clientX: 100, clientY: 450 }, turned, true)).toEqual({ x: 1, y: 1 });
    expect(findTokenPositionInRect({ clientX: 250, clientY: 150 }, turned, true)).toEqual({ x: 0.25, y: 0.25 });
    expect(findTokenPositionInRect({ clientX: 250, clientY: 451 }, turned, true)).toBeNull();
  });

  it("стрілки зсувають токен від центру, якщо його ще немає на мапі, і не виводять за край", () => {
    expect(shiftTokenPosition(null, { x: 0.02, y: 0 })).toEqual({ x: 0.52, y: 0.5 });
    expect(shiftTokenPosition({ x: 0.99, y: 0.01 }, { x: 0.02, y: -0.02 })).toEqual({ x: 1, y: 0 });
  });

  it("для інструментів дає частки й поза мапою, щоб рамку можна було тягнути за край", () => {
    const rect = { left: 100, top: 50, width: 400, height: 200 };
    expect(findMapShareInRect({ clientX: 600, clientY: 0 }, rect)).toEqual({ x: 1.25, y: -0.25 });
    expect(findMapShareInRect({ clientX: 300, clientY: 450 }, { left: 200, top: 50, width: 200, height: 400 }, true)).toEqual({ x: 1, y: 0.5 });
    expect(findMapShareInRect({ clientX: 0, clientY: 0 }, { ...rect, height: 0 })).toBeNull();
  });
});

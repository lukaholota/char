// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { findTappedObjectId } from "@/components/games/MapTokenSlot";

const placeBox = (element: HTMLElement, left: number, top: number, size: number) => {
  element.getBoundingClientRect = () => ({ left, top, right: left + size, bottom: top + size, width: size, height: size, x: left, y: top, toJSON: () => null });
};

function buildBoard() {
  const board = document.createElement("div");
  placeBox(board, 0, 0, 1000);
  const addObject = (id: number, left: number, top: number, size: number) => {
    const object = document.createElement("div");
    object.dataset.objectTap = String(id);
    placeBox(object, left, top, size);
    board.append(object);
  };
  addObject(1, 0, 0, 900);
  addObject(2, 100, 100, 40);
  addObject(3, 120, 120, 40);
  return board;
}

describe("дотик до обʼєкта поза інструментом", () => {
  it("бере верхній обʼєкт під пальцем", () => {
    expect(findTappedObjectId(buildBoard(), { clientX: 130, clientY: 130 })).toBe(3);
    expect(findTappedObjectId(buildBoard(), { clientX: 105, clientY: 105 })).toBe(2);
  });

  it("план поверху на пів мапи й ширше дотику не ловить", () => {
    expect(findTappedObjectId(buildBoard(), { clientX: 500, clientY: 500 })).toBeNull();
    expect(findTappedObjectId(null, { clientX: 105, clientY: 105 })).toBeNull();
  });
});

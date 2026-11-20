import { describe, expect, it } from "vitest";
import { addFloor, applyFloorChange, findFloorName, findLandingFloor, isPointOnFloor, isTokenHiddenByFloor, parseFloorChange, parseFloorId, parseFloorName, readSceneFloors, readShownFloor, type FloorPiece } from "@/rules/game-floors";

const house: FloorPiece = { floor: 1, at: { x: 0.5, y: 0.5 }, widthShare: 0.2, aspect: 2, rotation: 0 };
const cellar: FloorPiece = { floor: -1, at: { x: 0.2, y: 0.2 }, widthShare: 0.1, aspect: 1, rotation: 0 };
const pieces = [house, cellar];

describe("поверхи сцени", () => {
  it("читає поверхи згори донизу, відкидає дублі, нуль і зіпсовані назви", () => {
    const floors = readSceneFloors([{ id: -1, name: "Підвал" }, { id: 2, name: " Дах " }, { id: 1, name: "Поверх 2" }, { id: 1, name: "Дубль" }, { id: 0, name: "Нуль" }, { id: 3, name: "" }, "сміття"]);
    expect(floors).toEqual([{ id: 2, name: "Дах" }, { id: 1, name: "Поверх 2" }, { id: -1, name: "Підвал" }]);
    expect(readSceneFloors(null)).toEqual([]);
  });

  it("додає поверх над найвищим і підвал під найнижчим, з межею кількості", () => {
    const up = addFloor([], "up")!;
    expect(up).toEqual({ floors: [{ id: 1, name: "Поверх 2" }], id: 1 });
    expect(addFloor(up.floors, "down")).toEqual({ floors: [{ id: 1, name: "Поверх 2" }, { id: -1, name: "Підвал" }], id: -1 });
    expect(addFloor([{ id: -1, name: "Підвал" }], "down")?.floors.at(-1)).toEqual({ id: -2, name: "Підвал 2" });
    const full = [1, 2, 3, -1, -2, -3].map((id) => ({ id, name: `${id}` }));
    expect(addFloor(full, "up")).toBeNull();
    expect(addFloor([{ id: 9, name: "Верх" }], "up")).toBeNull();
  });

  it("показаний поверх, якого вже нема, стає основною мапою", () => {
    const floors = [{ id: 1, name: "Горище" }];
    expect(readShownFloor(1, floors)).toBe(1);
    expect(readShownFloor(2, floors)).toBeNull();
    expect(findFloorName(1, floors)).toBe("Горище");
    expect(findFloorName(null, floors)).toBe("Основна мапа");
  });

  it("перевіряє назву й номер поверху на вході", () => {
    expect(parseFloorName("  Дах   вежі ")).toBe("Дах вежі");
    expect(parseFloorName("x".repeat(25))).toBeNull();
    expect(parseFloorName(5)).toBeNull();
    expect(parseFloorId(null)).toBeNull();
    expect(parseFloorId(-2)).toBe(-2);
    expect(parseFloorId(0)).toBeUndefined();
    expect(parseFloorId(1.5)).toBeUndefined();
    expect(parseFloorId(10)).toBeUndefined();
  });

  it("слід поверху враховує пропорції мапи й плану та поворот", () => {
    expect(isPointOnFloor({ x: 0.59, y: 0.5 }, 1, pieces, 1)).toBe(true);
    expect(isPointOnFloor({ x: 0.5, y: 0.56 }, 1, pieces, 1)).toBe(false);
    expect(isPointOnFloor({ x: 0.5, y: 0.56 }, 1, [{ ...house, rotation: 90 }], 1)).toBe(true);
    expect(isPointOnFloor({ x: 0.5, y: 0.56 }, 1, pieces, 2)).toBe(true);
    expect(isPointOnFloor({ x: 0.5, y: 0.5 }, null, pieces, 1)).toBe(false);
  });

  it("токен під показаним поверхом або на іншому поверсі будинку ховається, а надворі видно", () => {
    const inside = { x: 0.5, y: 0.5 };
    const yard = { x: 0.9, y: 0.9 };
    expect(isTokenHiddenByFloor({ floor: null, at: inside }, 1, pieces, 1)).toBe(true);
    expect(isTokenHiddenByFloor({ floor: null, at: yard }, 1, pieces, 1)).toBe(false);
    expect(isTokenHiddenByFloor({ floor: 1, at: inside }, null, pieces, 1)).toBe(true);
    expect(isTokenHiddenByFloor({ floor: 1, at: inside }, 1, pieces, 1)).toBe(false);
    expect(isTokenHiddenByFloor({ floor: 1, at: yard }, null, pieces, 1)).toBe(false);
    expect(isTokenHiddenByFloor({ floor: -1, at: { x: 0.2, y: 0.2 } }, 1, pieces, 1)).toBe(true);
  });

  it("поставлений токен стає на показаний поверх лише в межах його сліду", () => {
    expect(findLandingFloor({ x: 0.5, y: 0.5 }, 1, pieces, 1)).toBe(1);
    expect(findLandingFloor({ x: 0.9, y: 0.9 }, 1, pieces, 1)).toBeNull();
    expect(findLandingFloor({ x: 0.5, y: 0.5 }, null, pieces, 1)).toBeNull();
  });

  it("розбирає зміну поверхів і відкидає зіпсовану", () => {
    expect(parseFloorChange({ kind: "add", direction: "up" })).toEqual({ kind: "add", direction: "up" });
    expect(parseFloorChange({ kind: "add", direction: "left" })).toBeNull();
    expect(parseFloorChange({ kind: "show", id: null })).toEqual({ kind: "show", id: null });
    expect(parseFloorChange({ kind: "show", id: 0 })).toBeNull();
    expect(parseFloorChange({ kind: "rename", id: 1, name: "  Дах " })).toEqual({ kind: "rename", id: 1, name: "Дах" });
    expect(parseFloorChange({ kind: "rename", id: 1, name: "" })).toBeNull();
    expect(parseFloorChange({ kind: "remove", id: 10 })).toBeNull();
    expect(parseFloorChange("add")).toBeNull();
  });

  it("новий поверх одразу показується, а прибраний повертає на основну мапу", () => {
    const added = applyFloorChange({ floors: [], shown: null }, { kind: "add", direction: "down" });
    expect(added).toEqual({ floors: [{ id: -1, name: "Підвал" }], shown: -1 });
    if (typeof added === "string") throw new Error(added);
    expect(applyFloorChange(added, { kind: "rename", id: -1, name: "Льох" })).toEqual({ floors: [{ id: -1, name: "Льох" }], shown: -1 });
    expect(applyFloorChange(added, { kind: "remove", id: -1 })).toEqual({ floors: [], shown: null });
    expect(applyFloorChange(added, { kind: "show", id: null })).toEqual({ ...added, shown: null });
    expect(applyFloorChange(added, { kind: "show", id: 2 })).toBe("bad_floor");
    const full = { floors: [1, 2, 3, -1, -2, -3].map((id) => ({ id, name: `${id}` })), shown: null };
    expect(applyFloorChange(full, { kind: "add", direction: "up" })).toBe("floor_limit");
  });
});

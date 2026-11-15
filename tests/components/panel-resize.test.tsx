// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { clampPanelSize, DOCKED_JOURNAL_SIZE, PanelResizeHandle, SIDE_PANEL_SIZE, type ResizablePanel } from "@/components/games/PanelResizeHandle";

const GRID = { left: 0, top: 0, right: 1600, bottom: 900, width: 1600, height: 900 };

function buildRect(rect: { left: number; top: number; width: number; height: number }): DOMRect {
  return { ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => null };
}

function renderHandle(panel: ResizablePanel, size: number) {
  const onSave = vi.fn();
  render(
    <div data-testid="grid">
      <PanelResizeHandle panel={panel} size={size} onSave={onSave} />
    </div>,
  );
  const grid = screen.getByTestId("grid");
  const handle = screen.getByRole("separator", { name: panel.label });
  vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(buildRect(GRID));
  const edge = (panel.axis === "x" ? GRID.right : GRID.bottom) - size;
  vi.spyOn(handle, "getBoundingClientRect").mockReturnValue(panel.axis === "x" ? buildRect({ left: edge - 6, top: 0, width: 12, height: 900 }) : buildRect({ left: 1100, top: edge - 6, width: 500, height: 12 }));
  return { grid, handle, edge, onSave };
}

beforeEach(() => {
  const captured = new Set<number>();
  HTMLElement.prototype.setPointerCapture = (id: number) => void captured.add(id);
  HTMLElement.prototype.releasePointerCapture = (id: number) => void captured.delete(id);
  HTMLElement.prototype.hasPointerCapture = (id: number) => captured.has(id);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("розмір панелей кімнати", () => {
  it("лишає місце сусідам і не стискає панель нижче мінімуму", () => {
    expect(clampPanelSize(SIDE_PANEL_SIZE, 600, 1600)).toBe(600);
    expect(clampPanelSize(SIDE_PANEL_SIZE, 200, 1600)).toBe(352);
    expect(clampPanelSize(SIDE_PANEL_SIZE, 1100, 1400)).toBe(920);
    expect(clampPanelSize(SIDE_PANEL_SIZE, 2000, 4000)).toBe(1200);
    expect(clampPanelSize(DOCKED_JOURNAL_SIZE, 800, 900)).toBe(640);
  });

  it("ширина тягнеться від точки захоплення, показується в CSS і зберігається після відпускання", () => {
    const { grid, handle, edge, onSave } = renderHandle(SIDE_PANEL_SIZE, 416);
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: edge + 4 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: edge + 4 - 200 });
    expect(grid.style.getPropertyValue(SIDE_PANEL_SIZE.cssVar)).toBe("616px");
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.pointerUp(handle, { pointerId: 1, clientX: edge + 4 - 200 });
    expect(onSave).toHaveBeenLastCalledWith(616);
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0 });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("висота журналу тягнеться вгору від нижнього краю", () => {
    const { grid, handle, edge, onSave } = renderHandle(DOCKED_JOURNAL_SIZE, 256);
    fireEvent.pointerDown(handle, { pointerId: 2, button: 0, clientY: edge - 3 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: edge - 3 - 100 });
    expect(grid.style.getPropertyValue(DOCKED_JOURNAL_SIZE.cssVar)).toBe("356px");
    fireEvent.pointerUp(handle, { pointerId: 2, clientY: edge - 3 - 100 });
    expect(onSave).toHaveBeenLastCalledWith(356);
  });

  it("міняється стрілками від показаного розміру й повертається подвійним кліком", () => {
    const { handle, onSave } = renderHandle(DOCKED_JOURNAL_SIZE, 256);
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(onSave).toHaveBeenLastCalledWith(288);
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(onSave).toHaveBeenCalledTimes(1);

    fireEvent.doubleClick(handle);
    expect(onSave).toHaveBeenLastCalledWith(DOCKED_JOURNAL_SIZE.defaultSize);
  });
});

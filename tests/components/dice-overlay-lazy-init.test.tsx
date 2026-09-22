// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiceOverlay } from "@/lib/components/dice/DiceOverlay";
import { diceService } from "@/lib/components/dice/diceService";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";

afterEach(() => {
  cleanup();
  act(() => useDiceUIStore.getState().close());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/// 3D-рушій кубиків — ~2,5 МБ коду й окремий потік; оверлей стоїть у кореневому layout,
/// тож до 2026-09-21 кожна сторінка сайту вантажила його на старті.
describe("DiceOverlay", () => {
  it("не вантажить 3D-кубики, поки лоток не відкривали", () => {
    vi.useFakeTimers();
    const init = vi.spyOn(diceService, "init").mockResolvedValue();

    render(<DiceOverlay />);
    act(() => vi.advanceTimersByTime(5000));

    expect(init).not.toHaveBeenCalled();
  });

  it("вантажить їх при першому відкритті лотка і лише раз", async () => {
    const init = vi.spyOn(diceService, "init").mockResolvedValue();
    render(<DiceOverlay />);

    await act(async () => useDiceUIStore.getState().open());
    await act(async () => useDiceUIStore.getState().close());
    await act(async () => useDiceUIStore.getState().open());

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith("#dice-box", expect.any(Function));
  });
});

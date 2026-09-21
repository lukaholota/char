// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useLongPress } from "@/hooks/useLongPress";

function PressableButton({ onLongPress, onTap }: { onLongPress: () => void; onTap: () => void }) {
  const { longPressHandlers, isLongPressClick } = useLongPress(onLongPress);
  return (
    <button
      type="button"
      {...longPressHandlers}
      onClick={() => {
        if (isLongPressClick()) return;
        onTap();
      }}
    >
      Ініціатива
    </button>
  );
}

function renderButton() {
  const onLongPress = vi.fn();
  const onTap = vi.fn();
  render(<PressableButton onLongPress={onLongPress} onTap={onTap} />);
  return { onLongPress, onTap, button: screen.getByRole("button", { name: "Ініціатива" }) };
}

describe("довге натискання на картці листа", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("утримання пів секунди відкриває редагування, а тап після нього кидка не запускає", () => {
    const { onLongPress, onTap, button } = renderButton();

    fireEvent.pointerDown(button, { button: 0, clientX: 10, clientY: 10 });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(button);
    fireEvent.click(button);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  it("свайп, що почався з картки, довгого натискання не дає", () => {
    const { onLongPress, button } = renderButton();

    fireEvent.pointerDown(button, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(button, { clientX: 40, clientY: 12 });
    act(() => vi.advanceTimersByTime(600));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("короткий тап — звичайний кидок", () => {
    const { onLongPress, onTap, button } = renderButton();

    fireEvent.pointerDown(button, { button: 0, clientX: 10, clientY: 10 });
    act(() => vi.advanceTimersByTime(150));
    fireEvent.pointerUp(button);
    fireEvent.click(button);

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});

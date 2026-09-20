export const DICE_TRAY_HEIGHT_VAR = "--dice-tray-height";
export const DICE_TRAY_Z_INDEX = 2147483646;
export const DICE_OVERLAY_Z_INDEX = DICE_TRAY_Z_INDEX - 1;

/// Бібліотека на `resize` перемальовує полотно, але кубики, що вже лежать, знову не рендерить —
/// стіл порожніє до наступного кидка (виміряно 2026-09-19: рядок результату підріс на 2 px).
/// Тому поки на столі є кубики, resize притримується і йде лише перед наступним кидком, за
/// два кадри до нього: обробник бібліотеки відкладений на requestAnimationFrame.
let isTrayResizeHeld = false;
let hasPendingTrayResize = false;

export function holdTrayResize(shouldHold: boolean): void {
  isTrayResizeHeld = shouldHold;
  if (!shouldHold && hasPendingTrayResize) dispatchTrayResize();
}

export function requestTrayResize(): "dispatched" | "held" {
  if (isTrayResizeHeld) {
    hasPendingTrayResize = true;
    return "held";
  }
  dispatchTrayResize();
  return "dispatched";
}

export function rollAfterHeldTrayResize(roll: () => void): void {
  if (!hasPendingTrayResize) {
    roll();
    return;
  }
  dispatchTrayResize();
  void waitForAnimationFrames(2).then(roll);
}

function dispatchTrayResize(): void {
  hasPendingTrayResize = false;
  window.dispatchEvent(new Event("resize"));
}

export function waitForAnimationFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(count);
  });
}

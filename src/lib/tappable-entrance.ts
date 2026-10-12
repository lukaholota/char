import { useState } from "react";

/// iOS Safari drops a tap while an element (or one of 4 ancestors) goes from `opacity: 0` to visible,
/// so entrances start from a fade that looks the same but never counts as hidden.
export const TAPPABLE_HIDDEN_OPACITY = 0.01;

/// At 0.01 iOS repaints every card's shadow and clip-path on each frame; while the entrance runs the root
/// and its `data-entrance-layer` blocks get their own layers (globals.css), released when the last child lands.
export function useEntranceLayers() {
  const [isEntering, setEntering] = useState(true);
  return { "data-entering": isEntering || undefined, onAnimationComplete: () => setEntering(false) };
}

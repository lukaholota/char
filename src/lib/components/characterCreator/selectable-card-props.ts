import type { KeyboardEvent, MouseEvent } from "react";

type SelectableCardOptions = {
  isSelected: boolean;
  isMultiSelect: boolean;
  onSelect: () => void;
};

export function buildSelectableCardProps({ isSelected, isMultiSelect, onSelect }: SelectableCardOptions) {
  return {
    role: isMultiSelect ? "checkbox" : "radio",
    tabIndex: 0,
    "aria-checked": isSelected,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (isInsideStopZone(event.target)) return;
      onSelect();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect();
    },
  };
}

function isInsideStopZone(target: EventTarget) {
  return target instanceof Element && target.closest("[data-stop-card-click]") !== null;
}

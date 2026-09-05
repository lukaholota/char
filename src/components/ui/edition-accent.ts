import { ARCANE } from "@/styles/palette";

/// Стан «обрано» на різаній рамці малюється кантом і мʼяким сяйвом, а не кільцем браузера, тому
/// кольори потрібні значеннями. 2014 несе платформний фіолет, 2024 — приглушене золото.
export type EditionAccent = {
  ringColor: string;
  glowColor: string;
  titleClassName: string;
  hoverTitleClassName: string;
};

const ACCENT_2014: EditionAccent = {
  ringColor: ARCANE[800],
  glowColor: "rgba(65,37,116,0.6)",
  titleClassName: "text-arcane-300",
  hoverTitleClassName: "group-hover:text-arcane-200",
};

const ACCENT_2024: EditionAccent = {
  ringColor: "#c39a3e",
  glowColor: "rgba(195,154,62,0.22)",
  titleClassName: "text-amber-200/90",
  hoverTitleClassName: "group-hover:text-amber-200",
};

export function pickEditionAccent(is2024: boolean): EditionAccent {
  return is2024 ? ACCENT_2024 : ACCENT_2014;
}

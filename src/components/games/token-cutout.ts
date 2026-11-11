"use client";

import { useState } from "react";

const SAMPLE_SIZE = 32;
const TRANSPARENT_ALPHA = 20;
const MIN_TRANSPARENT_EDGE_SHARE = 0.8;

const cutoutBySrc = new Map<string, boolean>();

export const findHeroCutoutKey = (heroId: number) => `hero-cutout:${heroId}`;

export type CutoutSide = "mine" | "other" | "ally" | "enemy" | "dying";

const CUTOUT_OUTLINES: Record<CutoutSide, string> = {
  mine: "filter [--tw-drop-shadow:drop-shadow(0_0_1px_theme(colors.arcane.300))_drop-shadow(0_0_2px_theme(colors.arcane.300))]",
  other: "filter [--tw-drop-shadow:drop-shadow(0_0_1px_theme(colors.white))_drop-shadow(0_0_2px_theme(colors.slate.950))]",
  ally: "filter [--tw-drop-shadow:drop-shadow(0_0_1px_theme(colors.emerald.400))_drop-shadow(0_0_2px_theme(colors.emerald.400))]",
  enemy: "filter [--tw-drop-shadow:drop-shadow(0_0_1px_theme(colors.rose.500))_drop-shadow(0_0_2px_theme(colors.rose.500))]",
  dying: "filter [--tw-drop-shadow:drop-shadow(0_0_1px_theme(colors.rose.500))_drop-shadow(0_0_2px_theme(colors.rose.500))]",
};
const CUTOUT_SHADOW = "filter [--tw-drop-shadow:drop-shadow(0_1px_2px_theme(colors.slate.950))]";

/// Кольорова обвідка вмикається у «Вигляді»; героя при смерті вона позначає завжди.
export function findCutoutOutlineClass(side: CutoutSide, isOutlined: boolean): string {
  return isOutlined || side === "dying" ? CUTOUT_OUTLINES[side] : CUTOUT_SHADOW;
}

export function hasTransparentEdges(rgba: ArrayLike<number>, size: number): boolean {
  const edgeAlphas: number[] = [];
  for (let step = 0; step < size; step++) {
    edgeAlphas.push(rgba[(step * 4) + 3], rgba[((size * (size - 1) + step) * 4) + 3], rgba[(step * size * 4) + 3], rgba[((step * size + size - 1) * 4) + 3]);
  }
  return edgeAlphas.filter((alpha) => alpha < TRANSPARENT_ALPHA).length / edgeAlphas.length >= MIN_TRANSPARENT_EDGE_SHARE;
}

/// Картинка з іншого домену «забруднює» canvas і кидає SecurityError — тоді лишається звичайний кружечок.
function isCutoutImage(image: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SAMPLE_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return false;
    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return hasTransparentEdges(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data, SAMPLE_SIZE);
  } catch {
    return false;
  }
}

export function useCutoutImage(src: string | null) {
  const [, markInspected] = useState<string | null>(null);
  const inspectImage = (image: HTMLImageElement) => {
    if (!src) return;
    if (!cutoutBySrc.has(src)) cutoutBySrc.set(src, isCutoutImage(image));
    markInspected(src);
  };
  return { isCutout: src !== null && cutoutBySrc.get(src) === true, inspectImage };
}

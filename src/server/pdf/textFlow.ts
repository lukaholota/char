import { countFittingLines, findLargestFittingSize, wrapText, type MeasuringFont, type TextBox } from "./textFit";

/// `chunks[i]` — рядки, що лягли в i-те поле; `rest` — ті, що не вмістилися вже й в останнє.
export type FlowSplit = { chunks: string[][]; rest: string[] };

export function findFlowFontSize(lines: string[], font: MeasuringFont, boxes: TextBox[], maxFontSize: number): number {
  return findLargestFittingSize(maxFontSize, (size) => splitFlowLines(lines, font, boxes, size).rest.length === 0);
}

/// Рядок не розривається між полями: якщо не влазить у залишок поля, переходить у наступне цілим.
export function splitFlowLines(lines: string[], font: MeasuringFont, boxes: TextBox[], size: number): FlowSplit {
  const chunks: string[][] = boxes.map(() => []);
  const capacities = boxes.map((box) => countFittingLines(font, box, size));
  let boxIndex = 0;
  let usedLines = 0;
  for (const [index, line] of lines.entries()) {
    let height = 0;
    while (boxIndex < boxes.length) {
      const room = capacities[boxIndex] - usedLines;
      height = wrapText(line, font, size, boxes[boxIndex].width, room + 1).length;
      if (height <= room) break;
      boxIndex += 1;
      usedLines = 0;
    }
    if (boxIndex === boxes.length) return { chunks, rest: lines.slice(index) };
    chunks[boxIndex].push(line);
    usedLines += height;
  }
  return { chunks, rest: [] };
}

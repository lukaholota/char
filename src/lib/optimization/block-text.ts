import type { ContentBlock } from "./types";

export function collectBlockText(block: ContentBlock): string[] {
  const groups = block.type === "rating" ? [] : block.type === "list" ? block.items
    : block.type === "table" ? [...(block.caption ? [block.caption] : []), ...block.headers, ...block.rows.flat()] : [block.content];
  return groups.map((nodes) => nodes.map((node) => node.text).join(""));
}

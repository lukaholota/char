import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

/// App Router `next/dynamic` without `loading` or `ssr: false` adds no Suspense boundary. While its
/// code loads it suspends the root layout boundary: the whole page hides and scroll jumps to the top
/// before the modal appears (articles, 2026-10-11).

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function findUnboundedDynamicCalls(path: string): string[] {
  const source = readFileSync(path, "utf8");
  if (!source.includes('from "next/dynamic"') || source.includes("<Suspense")) return [];
  return [...source.matchAll(/= dynamic\(([\s\S]*?)\);\n/g)]
    .filter((match) => !/loading:|ssr: false/.test(match[1]))
    .map((match) => `${path}: ${match[0].split("\n")[0].slice(0, 80)}`);
}

it("gives every lazy component its own Suspense boundary", () => {
  expect(listSourceFiles("src").flatMap(findUnboundedDynamicCalls)).toEqual([]);
});

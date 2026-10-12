import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

/// iOS Safari drops a tap while content turns from invisible to visible: the home cards faded in
/// from `opacity: 0` and the first tap during that second did nothing (tap log, 2026-10-12).
function listComponentFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listComponentFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function hasFadingPageEntrance(path: string): boolean {
  const source = readFileSync(path, "utf8");
  return /initial="hidden"/.test(source) && /hidden:\s*\{[^}]*opacity:\s*0(?![.\d])/.test(source);
}

it("keeps page entrance animations from hiding content, so iOS delivers the first tap", () => {
  expect(listComponentFiles("src").filter(hasFadingPageEntrance)).toEqual([]);
});

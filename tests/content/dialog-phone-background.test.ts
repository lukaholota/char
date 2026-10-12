import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { cn } from "@/lib/utils";

/// The base DialogContent blurs on desktop and turns solid on touch screens through its gradient.
/// A translucent `bg-<color>/<alpha>` override makes tailwind-merge drop that gradient, and on a phone
/// (no blur there) the sheet shows through the dialog (armor settings, 2026-10-12).
const BASE_BACKGROUND = "bg-gradient-to-b from-slate-950/28 to-slate-950/18 backdrop-blur-lg [@media(pointer:coarse)]:backdrop-blur-none [@media(pointer:coarse)]:from-slate-950 [@media(pointer:coarse)]:to-slate-950";
const OPAQUE_ALPHA = 90;

function listComponentFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listComponentFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function isSeeThroughOnPhone(className: string): boolean {
  if (cn(BASE_BACKGROUND, className).includes("bg-gradient-to-b")) return false;
  if (/(^|\s)glass-card(\s|$)/.test(className)) return true;
  return [...className.matchAll(/(?:^|\s)bg-[a-z]+-\d+\/(\d+)/g)].some((match) => Number(match[1]) < OPAQUE_ALPHA);
}

function findSeeThroughDialogs(path: string): string[] {
  const source = readFileSync(path, "utf8");
  return [...source.matchAll(/<DialogContent\b[^>]*?className="([^"]*)"/g)]
    .filter((match) => isSeeThroughOnPhone(match[1]))
    .map((match) => `${path}: ${match[1]}`);
}

it("keeps every dialog solid on phones, as the base dialog intends", () => {
  expect(listComponentFiles("src").flatMap(findSeeThroughDialogs)).toEqual([]);
});

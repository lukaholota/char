import { describe, expect, it } from "vitest";
import { noiseErrorMessages, noiseSourceUrls } from "./sentry-options";

/// Тексти й адреси — буквально з подій Sentry, які тріаж KR21.1 довів як шум. Контрольні
/// приклади — справжні помилки нашого коду з того самого знімка: фільтр не має їх ховати.

function isNoiseUrl(url: string) {
  return noiseSourceUrls.some((pattern) => pattern.test(url));
}

function isNoiseMessage(message: string) {
  return noiseErrorMessages.some((pattern) =>
    typeof pattern === "string" ? pattern === message : pattern.test(message),
  );
}

describe("Sentry noise filters", () => {
  it.each([
    "https://char.holota.family/executors/200.js",
    "https://char.holota.family/scripts/inpage.js",
    "chrome-extension://abcdef/dist/contentScripts/early-page.js",
    "moz-extension://abcdef/content.js",
    "blob:https://char.holota.family/1a17bc02-79b2-4523-a606-bb65978ad57a",
  ])("drops third-party script %s", (url) => {
    expect(isNoiseUrl(url)).toBe(true);
  });

  it.each([
    "https://char.holota.family/_next/static/chunks/225c52c88c8d0a51.js",
    "app:///_next/server/chunks/ssr/[root-of-the-server]__26cfd8be._.js",
  ])("keeps our own script %s", (url) => {
    expect(isNoiseUrl(url)).toBe(false);
  });

  it.each([
    "Error invoking post: Method not found",
    "Error: Error invoking post: Method not found",
    "i: Failed to connect to MetaMask",
    "TypeError: Load failed",
    "TypeError: Failed to fetch",
    "TypeError: network error",
    "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
  ])("drops %s", (message) => {
    expect(isNoiseMessage(message)).toBe(true);
  });

  it.each([
    "TypeError: Cannot read properties of undefined (reading 'groupId')",
    "TypeError: F(...).loadTheme is not a function",
    "Error: Failed to find Server Action. This request might be from an older or newer deployment.",
    "PrismaClientKnownRequestError: Foreign key constraint violated on the constraint: `pers_spell_spell_id_fkey`",
    "Error: Rendered more hooks than during the previous render.",
    "TypeError: Failed to fetch the resource",
  ])("keeps %s", (message) => {
    expect(isNoiseMessage(message)).toBe(false);
  });
});

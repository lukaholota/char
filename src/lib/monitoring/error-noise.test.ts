import { describe, expect, it } from "vitest";
import type { CaptureResult } from "posthog-js";

import { isNoiseErrorMessage, isNoiseSourceUrl } from "./error-noise";
import { dropNoiseExceptions } from "./posthog-options";

/// Тексти й адреси — буквально з подій Sentry і PostHog, які тріаж довів як шум. Контрольні
/// приклади — справжні помилки нашого коду з тих самих знімків: фільтр не має їх ховати.

function buildExceptionEvent(exception: {
  type?: string;
  value: string;
  frameUrls?: string[];
}): CaptureResult {
  return {
    uuid: "0",
    event: "$exception",
    properties: {
      $exception_list: [
        {
          type: exception.type,
          value: exception.value,
          stacktrace: { frames: (exception.frameUrls ?? []).map((filename) => ({ filename })) },
        },
      ],
    },
  };
}

describe("error noise filters", () => {
  it.each([
    "https://char.holota.family/executors/200.js",
    "https://char.holota.family/scripts/inpage.js",
    "chrome-extension://abcdef/dist/contentScripts/early-page.js",
    "moz-extension://abcdef/content.js",
    "blob:https://char.holota.family/1a17bc02-79b2-4523-a606-bb65978ad57a",
    "webkit-masked-url://hidden/",
  ])("drops third-party script %s", (url) => {
    expect(isNoiseSourceUrl(url)).toBe(true);
  });

  it.each([
    "https://char.holota.family/_next/static/chunks/225c52c88c8d0a51.js",
    "app:///_next/server/chunks/ssr/[root-of-the-server]__26cfd8be._.js",
  ])("keeps our own script %s", (url) => {
    expect(isNoiseSourceUrl(url)).toBe(false);
  });

  it.each([
    [undefined, "Error invoking post: Method not found"],
    ["Error", "Error invoking post: Method not found"],
    ["Error", "Error invoking postEvent: Method not found"],
    ["i", "Failed to connect to MetaMask"],
    ["TypeError", "Load failed"],
    ["TypeError", "Failed to fetch"],
    ["TypeError", "network error"],
    ["NotFoundError", "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."],
    ["Error", "Error invoking postMessage: Java object is gone"],
    ["Error", "Script error."],
    ["Error", "ResizeObserver loop completed with undelivered notifications."],
  ])("drops %s: %s", (type, value) => {
    expect(isNoiseErrorMessage(type, value)).toBe(true);
  });

  it.each([
    ["TypeError", "Cannot read properties of undefined (reading 'groupId')"],
    ["TypeError", "F(...).loadTheme is not a function"],
    ["Error", "Failed to find Server Action. This request might be from an older or newer deployment."],
    ["PrismaClientKnownRequestError", "Foreign key constraint violated on the constraint: `pers_spell_spell_id_fkey`"],
    ["Error", "Rendered more hooks than during the previous render."],
    ["TypeError", "Failed to fetch the resource"],
    ["Error", "Minified React error #419; visit https://react.dev/errors/419 for the full message"],
    ["TypeError", "Script error in spell card"],
  ])("keeps %s: %s", (type, value) => {
    expect(isNoiseErrorMessage(type, value)).toBe(false);
  });
});

describe("PostHog before_send", () => {
  it("drops an exception whose message is noise", () => {
    expect(dropNoiseExceptions(buildExceptionEvent({ type: "Error", value: "Script error." }))).toBeNull();
  });

  it("drops an exception thrown from a noise script", () => {
    const diceWorkerCrash = buildExceptionEvent({
      type: "TypeError",
      value: "Cannot read properties of undefined (reading 'setValue')",
      frameUrls: ["blob:https://char.holota.family/2e5b74ba-1117-4c73-aa4f-bb0e16d2e58a"],
    });
    expect(dropNoiseExceptions(diceWorkerCrash)).toBeNull();
  });

  it("keeps our own exception", () => {
    const sheetCrash = buildExceptionEvent({
      type: "TypeError",
      value: "Cannot read properties of undefined (reading 'groupId')",
      frameUrls: ["https://char.holota.family/_next/static/chunks/225c52c88c8d0a51.js"],
    });
    expect(dropNoiseExceptions(sheetCrash)).toBe(sheetCrash);
  });

  it("keeps events that are not exceptions", () => {
    const pageview: CaptureResult = { uuid: "0", event: "$pageview", properties: {} };
    expect(dropNoiseExceptions(pageview)).toBe(pageview);
  });
});
